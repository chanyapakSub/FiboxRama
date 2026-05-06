import { NextResponse } from 'next/server';
import { getPrisma } from '@/lib/db';
import { neon } from '@neondatabase/serverless';

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

        // 1. FIND EXISTING USER (1 query, no transaction)
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

            if (action === 'login') {
                if (evaluator.password !== password) {
                    return NextResponse.json({ error: 'Incorrect password' }, { status: 401 });
                }
                const fullEvaluator = await prisma.evaluator.findUnique({
                    where: { id: evaluator.id },
                    include: { evaluations: { include: { scores: true } } },
                });
                return NextResponse.json({ success: true, evaluator: fullEvaluator, message: 'Login successful' });
            }
        } else {
            if (action === 'login' || action === 'reset_password') {
                return NextResponse.json({ error: 'User not found' }, { status: 404 });
            }

            if (!profile) {
                return NextResponse.json({ error: 'Profile data required for new user' }, { status: 400 });
            }

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

        // 2. SAVE PROGRESS
        // Use raw neon SQL to avoid ALL Prisma implicit transactions.
        // Prisma's upsert, createMany, deleteMany all use transactions internally
        // which are NOT supported by PrismaNeonHTTP on Cloudflare Workers edge runtime.
        // Raw SQL statements are single round-trips with no transaction wrapper.
        if (conversations && Array.isArray(conversations)) {
            const filledConvs = conversations.filter((conv: any) => {
                const hasScores = conv.scores && Object.keys(conv.scores).length > 0;
                const hasComment = conv.comment && conv.comment.trim().length > 0;
                return hasScores || hasComment;
            });

            if (filledConvs.length > 0) {
                const sql = neon(process.env.DATABASE_URL!);

                // --- Query 1: Upsert ALL evaluations in ONE SQL statement ---
                // Uses unnest() to expand arrays into rows — no transaction, no loop
                const convIds = filledConvs.map((c: any) => c.conversation_id);
                const evalComments = filledConvs.map((c: any) => c.comment || null);

                const evalResults = await sql`
                    INSERT INTO "Evaluation" (id, "evaluatorId", "conversationId", comment)
                    SELECT
                        gen_random_uuid(),
                        ${evaluator.id}::uuid,
                        unnest(${convIds}::int[]),
                        unnest(${evalComments}::text[])
                    ON CONFLICT ("evaluatorId", "conversationId")
                    DO UPDATE SET comment = EXCLUDED.comment
                    RETURNING id, "conversationId"
                `;

                // Build a map: conversationId -> evaluationId
                const evalIdMap = new Map<number, string>(
                    evalResults.map((r: any) => [r.conversationId, r.id])
                );
                const evalIds = [...evalIdMap.values()];

                // --- Query 2: Delete old scores for ALL these evaluations (1 statement) ---
                await sql`
                    DELETE FROM "Score"
                    WHERE "evaluationId" = ANY(${evalIds}::uuid[])
                `;

                // --- Query 3: Batch insert ALL new scores (1 statement) ---
                const scoreEvalIds: string[] = [];
                const scoreKeys: string[] = [];
                const scoreValues: number[] = [];

                for (const conv of filledConvs) {
                    const evalId = evalIdMap.get(conv.conversation_id);
                    if (evalId && conv.scores) {
                        for (const [key, score] of Object.entries(conv.scores)) {
                            scoreEvalIds.push(evalId);
                            scoreKeys.push(key);
                            scoreValues.push(Number(score));
                        }
                    }
                }

                if (scoreEvalIds.length > 0) {
                    await sql`
                        INSERT INTO "Score" (id, "evaluationId", "indicatorKey", score)
                        SELECT
                            gen_random_uuid(),
                            unnest(${scoreEvalIds}::uuid[]),
                            unnest(${scoreKeys}::text[]),
                            unnest(${scoreValues}::int[])
                    `;
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
