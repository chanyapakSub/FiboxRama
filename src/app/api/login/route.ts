import { NextResponse } from 'next/server';
import { getPrisma } from '@/lib/db';

export const runtime = 'edge';

export async function POST(request: Request) {
    try {
        const prisma = getPrisma();
        const data = await request.json();
        const username = String(data.username || '').trim();
        const { password } = data;

        if (!username || !password) {
            return NextResponse.json({ error: 'Username and password are required' }, { status: 400 });
        }

        // Find evaluator and include evaluations + scores in a single query for efficiency
        const evaluator = await prisma.evaluator.findUnique({ 
            where: { username },
            include: {
                evaluations: true,
            }
        });

        if (!evaluator) {
            console.log(`Login failed: User not found: ${username}`);
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        if (evaluator.password !== password) {
            console.log(`Login failed: Incorrect password for: ${username}`);
            return NextResponse.json({ error: 'Incorrect password' }, { status: 401 });
        }

        console.log(`Login successful for ${username}. Found ${evaluator.evaluations?.length || 0} evaluations.`);

        return NextResponse.json({ 
            success: true, 
            evaluator, 
            message: 'Login successful' 
        });
    } catch (e: any) {
        console.error('POST /api/login error:', e);
        return NextResponse.json({ error: 'Internal server error', details: e.message }, { status: 500 });
    }
}