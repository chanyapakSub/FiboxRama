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
            return NextResponse.json({ error: 'Username and password are required' }, { status: 400 });
        }

        // 1. FIND EXISTING USER
        let evaluator = await prisma.evaluator.findUnique({
            where: { username },
        });

        if (evaluator) {
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

            // LOGIN: verify password
            if (action === 'login') {
                if (evaluator.password !== password) {
                    return NextResponse.json({ error: 'Incorrect password' }, { status: 401 });
                }
                // Fetch with relations separately to avoid nested transaction issues
                const fullEvaluator = await prisma.evaluator.findUnique({
                    where: { id: evaluator.id },
                    include: { evaluations: { include: { scores: true } } },
                });
                return NextResponse.json({ success: true, evaluator: fullEvaluator, message: 'Login successful' });
            }
        } else {
            // User not found
            if (action === 'login' || action === 'reset_password') {
                return NextResponse.json({ error: 'User not found' }, { status: 404 });
            }

            // REGISTER new user
            if (!profile) {
                return NextResponse.json({ error: 'Profile data required for new user' }, { status: 400 });
            }

            const expYears = typeof profile.experienceYears === 'number'
                ? profile.experienceYears
                : parseInt(String(profile.experienceYears || '0'), 10) || 0;

            // Create user WITHOUT nested includes to avoid implicit transaction
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

        // 2. SAVE PROGRESS — use upsert + createMany to minimize round-trips
        if (conversations && Array.isArray(conversations)) {
            // Filter only conversations that actually have data
            const filledConvs = conversations.filter((conv: any) => {
                const hasScores = conv.scores && Object.keys(conv.scores).length > 0;
                const hasComment = conv.comment && conv.comment.trim().length > 0;
                return hasScores || hasComment;
            });

            for (const conv of filledConvs) {
                const hasScores = conv.scores && Object.keys(conv.scores).length > 0;

                // Upsert evaluation (one round-trip instead of findUnique + create/update)
                const upsertedEval = await prisma.evaluation.upsert({
                    where: {
                        evaluatorId_conversationId: {
                            evaluatorId: evaluator.id,
                            conversationId: conv.conversation_id,
                        },
                    },
                    update: {
                        comment: conv.comment || null,
                    },
                    create: {
                        evaluatorId: evaluator.id,
                        conversationId: conv.conversation_id,
                        comment: conv.comment || null,
                    },
                });

                if (hasScores) {
                    // Delete old scores, then batch-insert new ones (2 round-trips instead of N+1)
                    await prisma.score.deleteMany({
                        where: { evaluationId: upsertedEval.id },
                    });
                    await prisma.score.createMany({
                        data: Object.entries(conv.scores).map(([key, score]) => ({
                            evaluationId: upsertedEval.id,
                            indicatorKey: key,
                            score: Number(score),
                        })),
                    });
                }
            }
        }

        return NextResponse.json({ success: true, evaluatorId: evaluator.id, message: 'Progress saved successfully' });

    } catch (e: any) {
        console.error('POST error:', e?.name, e?.message);
        return NextResponse.json({
            error: 'Internal server error',
            type: e?.name,
            details: e?.message,
        }, { status: 500 });
    }
}
