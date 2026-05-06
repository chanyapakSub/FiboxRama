import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

export const runtime = 'edge';

function getSql() {
    return neon(process.env.DATABASE_URL!);
}

// DELETE: Delete a specific evaluator
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const sql = getSql();
        const { id } = await params;

        // Cascade delete using raw SQL (Neon HTTP mode)
        await sql`DELETE FROM "Score" WHERE "evaluationId" IN (SELECT id FROM "Evaluation" WHERE "evaluatorId" = ${id})`;
        await sql`DELETE FROM "Evaluation" WHERE "evaluatorId" = ${id}`;
        await sql`DELETE FROM "Evaluator" WHERE id = ${id}`;

        return NextResponse.json({ success: true, message: 'Evaluator deleted successfully' });
    } catch (e: any) {
        console.error('DELETE error:', e?.message);
        return NextResponse.json({ error: 'Failed to delete evaluator', details: e?.message }, { status: 500 });
    }
}

// PUT: Update evaluator data
export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const sql = getSql();
        const { id } = await params;
        const data = await request.json();
        const { profile, conversations } = data;

        // Update evaluator profile
        const expYears = typeof profile.experienceYears === 'number'
            ? profile.experienceYears
            : parseInt(String(profile.experienceYears || '0'), 10) || 0;

        await sql`
            UPDATE "Evaluator"
            SET name = ${profile.name},
                role = ${profile.role},
                specialty = ${profile.specialty || null},
                "experienceYears" = ${expYears},
                "updatedAt" = NOW()
            WHERE id = ${id}
        `;

        // Update evaluations
        if (conversations && Array.isArray(conversations)) {
            const filledConvs = conversations.filter((conv: any) => {
                const hasScores = conv.scores && Object.keys(conv.scores).length > 0;
                const hasComment = conv.comment && conv.comment.trim().length > 0;
                return hasScores || hasComment;
            });

            if (filledConvs.length > 0) {
                const evalIdMap = new Map<number, string>();
                
                for (const conv of filledConvs) {
                    const existing = await sql`
                        SELECT id FROM "Evaluation" 
                        WHERE "evaluatorId" = ${id} AND "conversationId" = ${conv.conversation_id}
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
                            VALUES (${evalId}, ${id}, ${conv.conversation_id}, ${conv.comment || null}, NOW(), NOW())
                        `;
                    }
                    evalIdMap.set(conv.conversation_id, evalId);
                }

                const evalIds = Array.from(evalIdMap.values());
                if (evalIds.length > 0) {
                    await sql`DELETE FROM "Score" WHERE "evaluationId" = ANY(${evalIds})`;
                }

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

        return NextResponse.json({ success: true, message: 'Evaluator updated successfully' });
    } catch (e: any) {
        console.error('PUT error:', e?.message);
        return NextResponse.json({ error: 'Failed to update evaluator', details: e?.message }, { status: 500 });
    }
}
