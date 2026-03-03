import { NextResponse } from 'next/server';
import { getPrisma } from '@/lib/db';

// Enable Edge Runtime for Cloudflare Pages
export const runtime = 'edge';

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
            orderBy: {
                createdAt: 'desc',
            },
        });
        return NextResponse.json(evaluators);
    } catch (error) {
        console.error('Error fetching evaluations:', error);
        return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
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

        // 1. LOGIN / CHECK USER
        let evaluator = await prisma.evaluator.findUnique({
            where: { username },
            include: {
                evaluations: {
                    include: {
                        scores: true
                    }
                }
            }
        });

        // If logging in or saving existing user
        if (evaluator) {
            // Verify password
            if (evaluator.password !== password) {
                return NextResponse.json({ error: 'Incorrect password' }, { status: 401 });
            }

            // If action is just login, return the existing data
            if (action === 'login') {
                return NextResponse.json({
                    success: true,
                    evaluator,
                    message: 'Login successful'
                });
            }
        } else {
            // User not found
            if (action === 'login') {
                return NextResponse.json({ error: 'User not found' }, { status: 404 });
            }

            // REGISTER new user (action === 'save' or implicit register)
            if (!profile) {
                return NextResponse.json({ error: 'Profile data required for new user' }, { status: 400 });
            }

            // Parse specifically to avoid validation mismatch with Prisma Edge
            const expYears = typeof profile.experienceYears === 'number'
                ? profile.experienceYears
                : parseInt(profile.experienceYears || '0', 10) || 0;

            evaluator = await prisma.evaluator.create({
                data: {
                    username: username || profile.username, // Fallback if username is in profile inside payload
                    password: password,
                    name: profile.name,
                    role: profile.role,
                    specialty: profile.specialty,
                    experienceYears: expYears,
                },
                include: { evaluations: { include: { scores: true } } }
            });
        }

        // 2. SAVE PROGRESS (for both existing and new users)
        if (conversations && Array.isArray(conversations)) {
            for (const conv of conversations) {
                if (Object.keys(conv.scores).length > 0 || conv.comment) {
                    await prisma.evaluation.upsert({
                        where: {
                            evaluatorId_conversationId: {
                                evaluatorId: evaluator.id,
                                conversationId: conv.conversation_id,
                            }
                        },
                        update: {
                            comment: conv.comment,
                            scores: {
                                deleteMany: {},
                                create: Object.entries(conv.scores).map(([key, score]) => ({
                                    indicatorKey: key,
                                    score: Number(score),
                                })),
                            }
                        },
                        create: {
                            evaluatorId: evaluator.id,
                            conversationId: conv.conversation_id,
                            comment: conv.comment,
                            scores: {
                                create: Object.entries(conv.scores).map(([key, score]) => ({
                                    indicatorKey: key,
                                    score: Number(score),
                                })),
                            },
                        }
                    });
                }
            }
        }

        return NextResponse.json({ success: true, evaluatorId: evaluator.id, message: 'Progress saved successfully' });

    } catch (e: any) {
        // Log direct and plain string to check if the error object is circular causing JSON format to fail
        console.error('EVALUATION_API_ERROR_OBJECT', e?.name, e?.message, e?.stack);
        return NextResponse.json(
            {
                error: 'Internal server error',
                type: e?.name || "Unknown Error",
                details: e?.message || "No error details available"
            },
            { status: 500 }
        );
    }
}
