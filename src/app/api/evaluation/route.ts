
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

// Use Node.js runtime for local development (SQLite)
// Will be overridden to 'edge' in production via environment config
// export const runtime = 'edge';

// For local development, use standard PrismaClient
const prisma = new PrismaClient();

// GET: Retrieve all evaluations (for the Dashboard)
// This should ideally be protected, but for this simple app we'll rely on the frontend password gate for viewing.
export async function GET() {
    try {
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

            evaluator = await prisma.evaluator.create({
                data: {
                    username,
                    password,
                    name: profile.name,
                    role: profile.role,
                    specialty: profile.specialty,
                    experienceYears: profile.experienceYears || 0,
                },
                include: { evaluations: { include: { scores: true } } } // technically empty
            });
        }

        // 2. SAVE PROGRESS (for both existing and new users)
        if (conversations && Array.isArray(conversations)) {
            for (const conv of conversations) {
                // We always upsert evaluations to handle updates ("save progress")
                if (Object.keys(conv.scores).length > 0 || conv.comment) { // Save even if just comment or partial scores

                    // Upsert Evaluation
                    const evaluation = await prisma.evaluation.upsert({
                        where: {
                            evaluatorId_conversationId: {
                                evaluatorId: evaluator.id,
                                conversationId: conv.conversation_id,
                            }
                        },
                        update: {
                            comment: conv.comment,
                            // We need to manage scores carefully. Simplest is to delete old scores and re-create all current ones for this conversation.
                            // OR use individual upserts for scores. Let's delete-create for simplicity on a per-conversation basis.
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

    } catch (error) {
        console.error('Error in evaluation API:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
