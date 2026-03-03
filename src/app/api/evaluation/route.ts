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

        if (!username || !password) {
            return NextResponse.json({ error: 'Username and password are required' }, { status: 400 });
        }

        // 1. FIND EXISTING USER
        let evaluator = await prisma.evaluator.findUnique({
            where: { username },
        });

        if (evaluator) {
            // LOGIN: verify password
            if (evaluator.password !== password) {
                return NextResponse.json({ error: 'Incorrect password' }, { status: 401 });
            }
            if (action === 'login') {
                // Fetch with relations separately to avoid nested transaction issues
                const fullEvaluator = await prisma.evaluator.findUnique({
                    where: { id: evaluator.id },
                    include: { evaluations: { include: { scores: true } } },
                });
                return NextResponse.json({ success: true, evaluator: fullEvaluator, message: 'Login successful' });
            }
        } else {
            // User not found
            if (action === 'login') {
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

        // 2. SAVE PROGRESS — split into separate queries (no nested transactions)
        if (conversations && Array.isArray(conversations)) {
            for (const conv of conversations) {
                const hasScores = conv.scores && Object.keys(conv.scores).length > 0;
                if (!hasScores && !conv.comment) continue;

                // Find existing evaluation
                const existingEval = await prisma.evaluation.findUnique({
                    where: {
                        evaluatorId_conversationId: {
                            evaluatorId: evaluator.id,
                            conversationId: conv.conversation_id,
                        },
                    },
                });

                let evalId: string;

                if (existingEval) {
                    // Update comment
                    await prisma.evaluation.update({
                        where: { id: existingEval.id },
                        data: { comment: conv.comment },
                    });
                    // Delete old scores first (separate query)
                    await prisma.score.deleteMany({
                        where: { evaluationId: existingEval.id },
                    });
                    evalId = existingEval.id;
                } else {
                    // Create new evaluation
                    const newEval = await prisma.evaluation.create({
                        data: {
                            evaluatorId: evaluator.id,
                            conversationId: conv.conversation_id,
                            comment: conv.comment || null,
                        },
                    });
                    evalId = newEval.id;
                }

                // Create scores one by one (no nested create, no transaction)
                if (hasScores) {
                    for (const [key, score] of Object.entries(conv.scores)) {
                        await prisma.score.create({
                            data: {
                                evaluationId: evalId,
                                indicatorKey: key,
                                score: Number(score),
                            },
                        });
                    }
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
