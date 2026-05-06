import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

export const runtime = 'edge';

function getSql() {
    return neon(process.env.DATABASE_URL!);
}

// DELETE: Delete a specific evaluator (cascade via raw SQL)
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const sql = getSql();
        const { id } = await params;

        // Delete scores → evaluations → evaluator in 3 statements, no transactions
        await sql`DELETE FROM "Score" WHERE "evaluationId" IN (
            SELECT id FROM "Evaluation" WHERE "evaluatorId" = ${id}::uuid
        )`;
        await sql`DELETE FROM "Evaluation" WHERE "evaluatorId" = ${id}::uuid`;
        await sql`DELETE FROM "Evaluator" WHERE id = ${id}::uuid`;

        return NextResponse.json({ success: true, message: 'Evaluator deleted successfully' });
    } catch (e: any) {
        console.error('DELETE error:', e?.message);
        return NextResponse.json({ error: 'Failed to delete evaluator', details: e?.message }, { status: 500 });
    }
}

// PUT: Update evaluator profile + conversations
export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const sql = getSql();
        const { id } = await params;
        const data = await request.json();
        const { profile, conversations } = data;

        // --- Update evaluator profile (1 statement) ---
        const expYears = typeof profile.experienceYears === 'number'
            ? profile.experienceYears
            : parseInt(String(profile.experienceYears || '0'), 10) || 0;

        await sql`
            UPDATE "Evaluator"
            SET name = ${profile.name},
                role = ${profile.role},
                specialty = ${profile.specialty || null},
                "experienceYears" = ${expYears}
            WHERE id = ${id}::uuid
        `;

        // --- Update conversations using raw SQL batch (no transactions) ---
        if (conversations && Array.isArray(conversations)) {
            const filledConvs = conversations.filter((conv: any) => {
                const hasScores = conv.scores && Object.keys(conv.scores).length > 0;
                const hasComment = conv.comment && conv.comment.trim().length > 0;
                return hasScores || hasComment;
            });

            if (filledConvs.length > 0) {
                // --- Query 1: Upsert all evaluations in ONE statement ---
                const convIds = filledConvs.map((c: any) => c.conversation_id);
                const evalComments = filledConvs.map((c: any) => c.comment || null);

                const evalResults = await sql`
                    INSERT INTO "Evaluation" (id, "evaluatorId", "conversationId", comment)
                    SELECT
                        gen_random_uuid(),
                        ${id}::uuid,
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

                // --- Query 2: Delete old scores (1 statement) ---
                await sql`DELETE FROM "Score" WHERE "evaluationId" = ANY(${evalIds}::uuid[])`;

                // --- Query 3: Batch insert all new scores (1 statement) ---
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

        return NextResponse.json({ success: true, message: 'Evaluator updated successfully' });
    } catch (e: any) {
        console.error('PUT error:', e?.message);
        return NextResponse.json({ error: 'Failed to update evaluator', details: e?.message }, { status: 500 });
    }
}
