import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// DELETE: Delete a specific evaluator and all their evaluations
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        await prisma.evaluator.delete({
            where: { id },
        });

        return NextResponse.json({ success: true, message: 'Evaluator deleted successfully' });
    } catch (error) {
        console.error('Error deleting evaluator:', error);
        return NextResponse.json({ error: 'Failed to delete evaluator' }, { status: 500 });
    }
}

// PUT: Update evaluator data
export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const data = await request.json();
        const { profile, conversations } = data;

        // Update evaluator profile
        await prisma.evaluator.update({
            where: { id },
            data: {
                name: profile.name,
                role: profile.role,
                specialty: profile.specialty,
                experienceYears: profile.experienceYears,
            },
        });

        // Update evaluations if provided
        if (conversations && Array.isArray(conversations)) {
            for (const conv of conversations) {
                if (Object.keys(conv.scores).length > 0 || conv.comment) {
                    await prisma.evaluation.upsert({
                        where: {
                            evaluatorId_conversationId: {
                                evaluatorId: id,
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
                            evaluatorId: id,
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

        return NextResponse.json({ success: true, message: 'Evaluator updated successfully' });
    } catch (error) {
        console.error('Error updating evaluator:', error);
        return NextResponse.json({ error: 'Failed to update evaluator' }, { status: 500 });
    }
}
