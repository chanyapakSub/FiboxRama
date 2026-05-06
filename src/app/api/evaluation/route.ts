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
                    (
                        SELECT json_agg(
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
                        )
                        FROM "Evaluation" e 
                        WHERE e."evaluatorId" = ev.id
                    ),
                    '[]'::json
                ) AS evaluations
            FROM "Evaluator" ev
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

        // --- Find existing user ---
        const evaluators = await sql`
            SELECT id, username, password, name, role, specialty, "experienceYears"
            FROM "Evaluator" WHERE username = ${username}
        `;
        const evaluator = evaluators[0];

        if (evaluator) {
            // RESET PASSWORD
            if (action === 'reset_password') {
                const { name, newPassword } = data;
                if (!newPassword || evaluator.name !== name) {
                    return NextResponse.json({ error: 'Verification failed: Full Name does not match or password missing' }, { status: 403 });
                }
                await sql`UPDATE "Evaluator" SET password = ${newPassword}, "updatedAt" = NOW() WHERE username = ${username}`;
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
                            (
                                SELECT json_agg(
                                    json_build_object(
                                        'id', s.id,
                                        'indicatorKey', s."indicatorKey",
                                        'score', s.score
                                    )
                                )
                                FROM "Score" s 
                                WHERE s."evaluationId" = e.id
                            ),
                            '[]'::json
                        ) AS scores
                    FROM "Evaluation" e
                    WHERE e."evaluatorId" = ${evaluator.id}
                `;

                return NextResponse.json({
                    success: true,
                    evaluator: { ...evaluator, evaluations: evalRows || [] },
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

            const newId = crypto.randomUUID();
            const newEvaluators = await sql`
                INSERT INTO "Evaluator" (id, username, password, name, role, specialty, "experienceYears", "createdAt", "updatedAt")
                VALUES (${newId}, ${username || profile.username}, ${password},
                        ${profile.name}, ${profile.role}, ${profile.specialty || null}, ${expYears}, NOW(), NOW())
                RETURNING id, username, name, role, specialty, "experienceYears"
            `;
            const newEvaluator = newEvaluators[0];

            return NextResponse.json({ success: true, evaluatorId: newEvaluator.id, message: 'Registration successful' });
        }

        // --- SAVE PROGRESS ---
        if (conversations && Array.isArray(conversations)) {
            const filledConvs = conversations.filter((conv: any) => {
                const hasScores = conv.scores && Object.keys(conv.scores).length > 0;
                const hasComment = conv.comment && conv.comment.trim().length > 0;
                return hasScores || hasComment;
            });

            if (filledConvs.length > 0) {
                const convIds = filledConvs.map((c: any) => c.conversation_id);
                const evalComments = filledConvs.map((c: any) => c.comment || null);
                const nows = filledConvs.map(() => new Date().toISOString());

                // Use a loop for Evaluation to ensure id generation and updatedAt handling is safe
                const evalIdMap = new Map<number, string>();
                
                for (const conv of filledConvs) {
                    const existing = await sql`
                        SELECT id FROM "Evaluation" 
                        WHERE "evaluatorId" = ${evaluator.id} AND "conversationId" = ${conv.conversation_id}
                    `;
                    
                    let evalId;
                    if (existing.length > 0) {
                        evalId = existing[0].id;
                        await sql`
                            UPDATE "Evaluation" SET comment = ${conv.comment || null}, "updatedAt" = NOW()
                            WHERE id = ${evalId}
                        `;
                    } else {
                        evalId = crypto.randomUUID();
                        await sql`
                            INSERT INTO "Evaluation" (id, "evaluatorId", "conversationId", comment, "createdAt", "updatedAt")
                            VALUES (${evalId}, ${evaluator.id}, ${conv.conversation_id}, ${conv.comment || null}, NOW(), NOW())
                        `;
                    }
                    evalIdMap.set(conv.conversation_id, evalId);
                }

                const evalIds = Array.from(evalIdMap.values());

                // Delete old scores for all affected evaluations
                if (evalIds.length > 0) {
                    await sql`DELETE FROM "Score" WHERE "evaluationId" = ANY(${evalIds})`;
                }

                // Batch insert all new scores
                const scoreIds: string[] = [];
                const scoreEvalIds: string[] = [];
                const scoreKeys: string[] = [];
                const scoreValues: number[] = [];

                for (const conv of filledConvs) {
                    const evalId = evalIdMap.get(conv.conversation_id);
                    if (evalId && conv.scores) {
                        for (const [key, score] of Object.entries(conv.scores)) {
                            scoreIds.push(crypto.randomUUID());
                            scoreEvalIds.push(evalId);
                            scoreKeys.push(key);
                            scoreValues.push(Number(score));
                        }
                    }
                }

                if (scoreEvalIds.length > 0) {
                    await sql`
                        INSERT INTO "Score" (id, "evaluationId", "indicatorKey", score)
                        SELECT unnest(${scoreIds}), unnest(${scoreEvalIds}), unnest(${scoreKeys}), unnest(${scoreValues})
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
