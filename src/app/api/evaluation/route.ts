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
                evaluations: true,
            },
        });
        return NextResponse.json(evaluators);
    } catch (e: unknown) {
        const error = e as Error;
        console.error('GET error:', error.message);
        return NextResponse.json({ error: 'Failed to fetch data', details: error.message }, { status: 500 });
    }
}

// POST: Handle Registration, Login, and Saving Progress
export async function POST(request: Request) {
    try {
        const prisma = getPrisma();
        const data = await request.json();
        const { action, password, profile, conversations } = data;
        const username = String(data.username || '').trim();

        if (!username || (!password && action !== 'reset_password')) {
            return NextResponse.json({ error: 'Username and password are required' }, { status: 400 });
        }

        let evaluator = await prisma.evaluator.findUnique({ where: { username } });

        // 1. HANDLE REGISTRATION
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

        // 3. SAVE PROGRESS - Much faster with JSON field
        if (action === 'save' && conversations && Array.isArray(conversations)) {
            console.log(`Processing save for ${username}, ${conversations.length} items`);

            for (const conv of conversations) {
                const { conversation_id, scores, comment } = conv;
                const hasData = (scores && Object.keys(scores).length > 0) || comment;

                if (!hasData) continue;

                // Upsert evaluation with JSON scores
                await prisma.evaluation.upsert({
                    where: {
                        evaluatorId_conversationId: {
                            evaluatorId: evaluator.id,
                            conversationId: Number(conversation_id),
                        },
                    },
                    update: {
                        comment: comment || null,
                        scores: scores || {},
                    },
                    create: {
                        evaluatorId: evaluator.id,
                        conversationId: Number(conversation_id),
                        comment: comment || null,
                        scores: scores || {},
                    },
                });
            }
        }

        // Fetch the updated evaluator
        const updatedEvaluator = await prisma.evaluator.findUnique({
            where: { id: evaluator.id },
            include: {
                evaluations: true,
            },
        });

        return NextResponse.json({ 
            success: true, 
            evaluator: updatedEvaluator,
            message: 'Progress saved successfully' 
        });

    } catch (e: unknown) {
        const error = e as Error;
        console.error('POST error:', error);
        return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
    }
}
