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

        // Cascade delete should handle evaluations, but we'll be explicit for safety
        await prisma.evaluation.deleteMany({ where: { evaluatorId: id } });
        await prisma.evaluator.delete({ where: { id } });

        return NextResponse.json({ success: true, message: 'Evaluator deleted successfully' });
    } catch (e: unknown) {
        const error = e as Error;
        console.error('DELETE error:', error.message);
        return NextResponse.json({ error: 'Failed to delete evaluator', details: error.message }, { status: 500 });
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

        // Update evaluations with JSON scores
        if (conversations && Array.isArray(conversations)) {
            for (const conv of conversations) {
                const { conversation_id, scores, comment } = conv;
                const hasData = (scores && Object.keys(scores).length > 0) || comment;

                if (!hasData) continue;

                await prisma.evaluation.upsert({
                    where: {
                        evaluatorId_conversationId: {
                            evaluatorId: id,
                            conversationId: Number(conversation_id),
                        },
                    },
                    update: {
                        comment: comment || null,
                        scores: scores || {},
                    },
                    create: {
                        evaluatorId: id,
                        conversationId: Number(conversation_id),
                        comment: comment || null,
                        scores: scores || {},
                    },
                });
            }
        }

        return NextResponse.json({ success: true, message: 'Evaluator updated successfully' });
    } catch (e: unknown) {
        const error = e as Error;
        console.error('PUT error:', error.message);
        return NextResponse.json({ error: 'Failed to update evaluator', details: error.message }, { status: 500 });
    }
}
