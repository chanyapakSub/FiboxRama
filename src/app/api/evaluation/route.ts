import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

export const runtime = 'edge';

function getSql() {
    return neon(process.env.DATABASE_URL!);
}

// GET: Retrieve all evaluators + evaluations + scores for the Dashboard
export async function GET() {
    try {
        const sql = getSql();

        const rows = await sql`
            SELECT
                ev.id,
                ev.username,
                ev.name,
                ev.role,
                ev.specialty,
                ev."experienceYears",
                COALESCE(
                    json_agg(
                        json_build_object(
                            'id', e.id,
                            'conversationId', e."conversationId",
                            'comment', e.comment,
                            'scores', (
                                SELECT COALESCE(json_agg(
                                    json_build_object(
                                        'id', s.id,
                                        'indicatorKey', s."indicatorKey",
                                        'score', s.score
                                    )
                                ), '[]'::json)
                                FROM "Score" s WHERE s."evaluationId" = e.id
                            )
                        )
                    ) FILTER (WHERE e.id IS NOT NULL),
                    '[]'::json
                ) AS evaluations
            FROM "Evaluator" ev
            LEFT JOIN "Evaluation" e ON e."evaluatorId" = ev.id
            GROUP BY ev.id
            ORDER BY ev.name
        `;

        return NextResponse.json(rows);
    } catch (e: any) {
        console.error('GET error:', e?.message);
        return NextResponse.json({ error: 'Failed to fetch data', details: e?.message }, { status: 500 });
    }
}

// POST: Handle Registration, Login, Reset Password, and Save Progress
export async function POST(request: Request) {
    try {
        const sql = getSql();
        const data = await request.json();
        const { action, username, password, profile, conversations } = data;

        if (!username || (!password && action !== 'reset_password')) {
            return NextResponse.json({ error: 'Username and password are required' }, { status: 400 });
        }

        // --- Find existing user (1 query, no transaction) ---
        const [evaluator] = await sql`
            SELECT id, username, password, name, role, specialty, "experienceYears"
            FROM "Evaluator" WHERE username = ${username}
        `;

        if (evaluator) {
            // RESET PASSWORD
            if (action === 'reset_password') {
                const { name, newPassword } = data;
                if (!newPassword || evaluator.name !== name) {
                    return NextResponse.json({ error: 'Verification failed: Full Name does not match or password missing' }, { status: 403 });
                }
                await sql`UPDATE "Evaluator" SET password = ${newPassword} WHERE username = ${username}`;
                return NextResponse.json({ success: true, message: 'Password reset successful' });
            }

            // LOGIN
            if (action === 'login') {
                if (evaluator.password !== password) {
                    return NextResponse.json({ error: 'Incorrect password' }, { status: 401 });
                }

                // Fetch full evaluator with evaluations + scores
                const evalRows = await sql`
                    SELECT
                        e.id,
                        e."conversationId",
                        e.comment,
                        COALESCE(
                            json_agg(
                                json_build_object(
                                    'id', s.id,
                                    'indicatorKey', s."indicatorKey",
                                    'score', s.score
                                )
                            ) FILTER (WHERE s.id IS NOT NULL),
                            '[]'::json
                        ) AS scores
                    FROM "Evaluation" e
                    LEFT JOIN "Score" s ON s."evaluationId" = e.id
                    WHERE e."evaluatorId" = ${evaluator.id}::uuid
                    GROUP BY e.id
                `;

                return NextResponse.json({
                    success: true,
                    evaluator: { ...evaluator, evaluations: evalRows },
                    message: 'Login successful'
                });
            }

        } else {
            // USER NOT FOUND
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

            const [newEvaluator] = await sql`
                INSERT INTO "Evaluator" (id, username, password, name, role, specialty, "experienceYears")
                VALUES (gen_random_uuid(), ${username || profile.username}, ${password},
                        ${profile.name}, ${profile.role}, ${profile.specialty || null}, ${expYears})
                RETURNING id, username, name, role, specialty, "experienceYears"
            `;

            // No conversations to save yet on register — return early
            return NextResponse.json({ success: true, evaluatorId: newEvaluator.id, message: 'Progress saved successfully' });
        }

        // --- SAVE PROGRESS (raw SQL, no transactions, minimal round-trips) ---
        if (conversations && Array.isArray(conversations)) {
            const filledConvs = conversations.filter((conv: any) => {
                const hasScores = conv.scores && Object.keys(conv.scores).length > 0;
                const hasComment = conv.comment && conv.comment.trim().length > 0;
                return hasScores || hasComment;
            });

            if (filledConvs.length > 0) {
                // --- Query 1: Upsert ALL evaluations in ONE statement via unnest ---
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

                const evalIdMap = new Map<number, string>(
                    evalResults.map((r: any) => [r.conversationId, r.id])
                );
                const evalIds = [...evalIdMap.values()];

                // --- Query 2: Delete old scores for all these evaluations (1 statement) ---
                await sql`DELETE FROM "Score" WHERE "evaluationId" = ANY(${evalIds}::uuid[])`;

                // --- Query 3: Batch insert ALL new scores (1 statement via unnest) ---
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
