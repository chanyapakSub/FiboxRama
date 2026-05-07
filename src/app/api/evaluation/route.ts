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
        const { action, password, profile, conversations } = data;
        const username = String(data.username || '').trim().toLowerCase();

        if (!username || (!password && action !== 'reset_password')) {
            return NextResponse.json({ error: 'Username and password are required' }, { status: 400 });
        }

        let evaluator = await prisma.evaluator.findUnique({ where: { username } });

        // 1. HANDLE REGISTRATION (via 'save' with profile)
        if (!evaluator) {
            if (action === 'login' || action === 'reset_password') {
                return NextResponse.json({ error: 'User not found' }, { status: 404 });
            }

            if (action === 'save' && profile) {
                const expYears = typeof profile.experienceYears === 'number'
                    ? profile.experienceYears
                    : parseInt(String(profile.experienceYears || '0'), 10) || 0;

                evaluator = await prisma.evaluator.create({
                    data: {
                        username,
                        password,
                        name: profile.name,
                        role: profile.role,
                        specialty: profile.specialty || null,
                        experienceYears: expYears,
                    },
                });
            }
        } else {
            // Evaluator exists - VERIFY PASSWORD if not reset_password
            if (action !== 'reset_password' && evaluator.password !== password) {
                return NextResponse.json({ error: 'Incorrect password' }, { status: 401 });
            }
        }

        if (!evaluator) {
            return NextResponse.json({ error: 'Evaluator could not be determined' }, { status: 500 });
        }

        // 2. PASSWORD RESET
        if (action === 'reset_password') {
            const { name, newPassword } = data;
            if (!newPassword || evaluator.name !== name) {
                return NextResponse.json({ error: 'Verification failed: Full Name does not match' }, { status: 403 });
            }
            await prisma.evaluator.update({
                where: { username },
                data: { password: newPassword },
            });
            return NextResponse.json({ success: true, message: 'Password reset successful' });
        }

        // 3. SAVE PROGRESS
        if (action === 'save' && conversations && Array.isArray(conversations)) {
            console.log(`Processing save for ${username}, ${conversations.length} items`);

            for (const conv of conversations) {
                const { conversation_id, scores, comment } = conv;
                const hasScores = scores && Object.keys(scores).length > 0;

                if (!hasScores && !comment) continue;

                const existingEval = await prisma.evaluation.findUnique({
                    where: {
                        evaluatorId_conversationId: {
                            evaluatorId: evaluator.id,
                            conversationId: Number(conversation_id),
                        },
                    },
                });

                if (existingEval) {
                    if (comment !== undefined) {
                        await prisma.evaluation.update({
                            where: { id: existingEval.id },
                            data: { comment: comment || null },
                        });
                    }

                    if (hasScores) {
                        // Delete and recreate scores
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
                    const newEval = await prisma.evaluation.create({
                        data: {
                            evaluatorId: evaluator.id,
                            conversationId: Number(conversation_id),
                            comment: comment || null,
                        },
                    });

                    if (hasScores) {
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
            }
        }

        // Fetch the updated evaluator to return consistent data
        const updatedEvaluator = await prisma.evaluator.findUnique({
            where: { id: evaluator.id },
            include: {
                evaluations: {
                    include: {
                        scores: true,
                    },
                },
            },
        });

        return NextResponse.json({ 
            success: true, 
            evaluator: updatedEvaluator,
            message: 'Progress saved successfully' 
        });

    } catch (e: any) {
        console.error('POST error:', e);
        return NextResponse.json({ error: 'Internal server error', details: e.message }, { status: 500 });
    }
}
