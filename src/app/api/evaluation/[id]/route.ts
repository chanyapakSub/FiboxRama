import { NextResponse } from 'next/server';
import { getPrisma } from '@/lib/db';

export const runtime = 'edge';

// DELETE: Delete a specific evaluator
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const prisma = getPrisma();
        const { id } = await params;

        // Delete scores first, then evaluations, then evaluator (cascade-safe for HTTP mode)
        const evaluations = await prisma.evaluation.findMany({ where: { evaluatorId: id } });
        for (const ev of evaluations) {
            await prisma.score.deleteMany({ where: { evaluationId: ev.id } });
        }
        await prisma.evaluation.deleteMany({ where: { evaluatorId: id } });
        await prisma.evaluator.delete({ where: { id } });

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
        const prisma = getPrisma();
        const { id } = await params;
        const data = await request.json();
        const { profile, conversations } = data;

        // Update evaluator profile
        await prisma.evaluator.update({
            where: { id },
            data: {
                name: profile.name,
                role: profile.role,
                specialty: profile.specialty || null,
                experienceYears: typeof profile.experienceYears === 'number'
                    ? profile.experienceYears
                    : parseInt(String(profile.experienceYears || '0'), 10) || 0,
            },
        });

        // Update evaluations — split queries, no nested transactions
        if (conversations && Array.isArray(conversations)) {
            for (const conv of conversations) {
                const hasScores = conv.scores && Object.keys(conv.scores).length > 0;
                if (!hasScores && !conv.comment) continue;

                const existingEval = await prisma.evaluation.findUnique({
                    where: {
                        evaluatorId_conversationId: {
                            evaluatorId: id,
                            conversationId: conv.conversation_id,
                        },
                    },
                });

                let evalId: string;

                if (existingEval) {
                    await prisma.evaluation.update({
                        where: { id: existingEval.id },
                        data: { comment: conv.comment },
                    });
                    await prisma.score.deleteMany({ where: { evaluationId: existingEval.id } });
                    evalId = existingEval.id;
                } else {
                    const newEval = await prisma.evaluation.create({
                        data: {
                            evaluatorId: id,
                            conversationId: conv.conversation_id,
                            comment: conv.comment || null,
                        },
                    });
                    evalId = newEval.id;
                }

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

        return NextResponse.json({ success: true, message: 'Evaluator updated successfully' });
    } catch (e: any) {
        console.error('PUT error:', e?.message);
        return NextResponse.json({ error: 'Failed to update evaluator', details: e?.message }, { status: 500 });
    }
}
