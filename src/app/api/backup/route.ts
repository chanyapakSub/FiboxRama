import { NextResponse } from 'next/server';
import { getPrisma } from '@/lib/db';

export const runtime = 'edge';

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
        
        const backup = evaluators.map(evaluator => ({
            ...evaluator,
            evaluations: evaluator.evaluations.map(ev => ({
                ...ev,
                scoresObj: ev.scores.reduce((acc: any, s: any) => ({
                    ...acc,
                    [s.indicatorKey]: s.score
                }), {})
            }))
        }));

        return NextResponse.json(backup);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
