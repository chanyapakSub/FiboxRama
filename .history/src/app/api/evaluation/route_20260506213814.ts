import { NextResponse } from 'next/server';
import { getPrisma } from '@/lib/db';

export const runtime = 'edge';
console.log("DATABASE_URL:", process.env.DATABASE_URL)
// GET: Retrieve all evaluations (for the Dashboard)
export async function GET() {
    try {
        const prisma = getPrisma();
        const evaluators = await prisma.evaluator.findMany({
            include: {
                evaluations: {
                    include: {
                        scores: true,
                    },
                },
            },
        });
        return NextResponse.json(evaluators);
    } catch (e: any) {
        console.error('GET error:', e?.message);
        return NextResponse.json({ error: 'Failed to fetch data', details: e?.message }, { status: 500 });
    }
}

// POST: Handle Registration, Login, and Saving Progress
export async function POST(request: Request) {
    try {
        const prisma = getPrisma();
        const data = await request.json();
        const { action, username, password, profile, conversations } = data;

        if (!username || (!password && action !== 'reset_password')) {
            console.log('Validation failed: Missing username or password');
            return NextResponse.json({ error: 'Username and password are required' }, { status: 400 });
        }

        let evaluator = await prisma.evaluator.findUnique({ where: { username } });

        if (!evaluator) {
            if (action === 'login' || action === 'reset_password') {
                console.log(`Evaluator not found for username: ${username}`);
                return NextResponse.json({ error: 'User not found' }, { status: 404 });
            }

            if (action === 'save' && profile) {
                const expYears = typeof profile.experienceYears === 'number'
                    ? profile.experienceYears
                    : parseInt(String(profile.experienceYears || '0'), 10) || 0;

                evaluator = await prisma.evaluator.create({
                    data: {
                        username: username || profile.username,
                        password: password,
                        name: profile.name,
                        role: profile.role,
                        specialty: profile.specialty || null,
                        experienceYears: expYears,
                    },
                });
            }
        }

        if (!evaluator) {
            console.error('Evaluator is null after all checks');
            return NextResponse.json({ error: 'Evaluator could not be determined' }, { status: 500 });
        }

        if (action === 'reset_password') {
            const { name, newPassword } = data;
            if (!newPassword || evaluator.name !== name) {
                return NextResponse.json({ error: 'Verification failed: Full Name does not match or password missing' }, { status: 403 });
            }
            await prisma.evaluator.update({
                where: { username },
                data: { password: newPassword },
            });
            return NextResponse.json({ success: true, message: 'Password reset successful' });
        }

        // 2. SAVE PROGRESS — split into separate queries (no nested transactions)
        if (action === 'save' && conversations && Array.isArray(conversations)) {
            console.log('Processing save action for conversations:', conversations);

            for (const conv of conversations) {
                try {
                    const { conversation_id, scores, comment } = conv;
                    const hasScores = scores && Object.keys(scores).length > 0;

                    if (!hasScores && !comment) {
                        console.log(`Skipping conversation ${conversation_id}: No scores or comment`);
                        continue;
                    }

                    const existingEval = await prisma.evaluation.findUnique({
                        where: {
                            evaluatorId_conversationId: {
                                evaluatorId: evaluator.id,
                                conversationId: conversation_id,
                            },
                        },
                    });

                    if (existingEval) {
                        console.log(`Updating evaluation for conversation ${conversation_id}`);
                        if (comment) {
                            await prisma.evaluation.update({
                                where: { id: existingEval.id },
                                data: { comment },
                            });
                        }

                        if (hasScores) {
                            console.log(`Updating scores for conversation ${conversation_id}`);
                            await prisma.score.deleteMany({ where: { evaluationId: existingEval.id } });
                            for (const [key, score] of Object.entries(scores)) {
                                await prisma.score.create({
                                    data: {
                                        evaluationId: existingEval.id,
                                        indicatorKey: key,
                                        score: Number(score),
                                    },
                                });
                            }
                        }
                    } else {
                        console.log(`Creating new evaluation for conversation ${conversation_id}`);
                        const newEval = await prisma.evaluation.create({
                            data: {
                                evaluatorId: evaluator.id,
                                conversationId: conversation_id,
                                comment: comment || null,
                            },
                        });

                        if (hasScores) {
                            console.log(`Adding scores for new evaluation of conversation ${conversation_id}`);
                            for (const [key, score] of Object.entries(scores)) {
                                await prisma.score.create({
                                    data: {
                                        evaluationId: newEval.id,
                                        indicatorKey: key,
                                        score: Number(score),
                                    },
                                });
                            }
                        }
                    }
                } catch (convError) {
                    console.error(`Error processing conversation ${conv.conversation_id}:`, convError);
                }
            }
        }

        return NextResponse.json({ success: true, message: 'Progress saved successfully' });

    } catch (e: any) {
        console.error('POST error:', e);
        return NextResponse.json({ error: 'Internal server error', details: e.message }, { status: 500 });
    }
}
