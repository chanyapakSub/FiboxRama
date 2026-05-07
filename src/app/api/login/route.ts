import { NextResponse } from 'next/server';
import { getPrisma } from '@/lib/db';

export const runtime = 'edge';

export async function POST(request: Request) {
    try {
        const prisma = getPrisma();
        const data = await request.json();
        const { username, password } = data;

        if (!username || !password) {
            console.log('Validation failed: Missing username or password');
            return NextResponse.json({ error: 'Username and password are required' }, { status: 400 });
        }

        const evaluator = await prisma.evaluator.findUnique({ where: { username } });

        if (!evaluator) {
            console.log(`Login failed: User not found for username: ${username}`);
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        if (evaluator.password !== password) {
            console.log(`Login failed: Incorrect password for username: ${username}`);
            return NextResponse.json({ error: 'Incorrect password' }, { status: 401 });
        }

        const fullEvaluator = await prisma.evaluator.findUnique({
            where: { id: evaluator.id },
            include: { evaluations: { include: { scores: true } } },
        });

        return NextResponse.json({ success: true, evaluator: fullEvaluator, message: 'Login successful' });
    } catch (e: any) {
        console.error('POST /api/login error:', e);
        return NextResponse.json({ error: 'Internal server error', details: e.message }, { status: 500 });
    }
}