import { getPrisma } from '../src/lib/db';
import fs from 'fs';

async function restore() {
    const prisma = getPrisma();
    const data = JSON.parse(fs.readFileSync('db_backup.json', 'utf8'));
    
    console.log(`Restoring ${data.length} evaluators...`);
    
    for (const evaluator of data) {
        console.log(`Restoring evaluator: ${evaluator.username}`);
        
        // Create evaluator
        const createdEvaluator = await prisma.evaluator.create({
            data: {
                id: evaluator.id,
                username: evaluator.username,
                password: evaluator.password,
                name: evaluator.name,
                role: evaluator.role,
                specialty: evaluator.specialty,
                experienceYears: evaluator.experienceYears,
            }
        });
        
        // Create evaluations
        for (const ev of evaluator.evaluations) {
            await prisma.evaluation.create({
                data: {
                    id: ev.id,
                    evaluatorId: createdEvaluator.id,
                    conversationId: ev.conversationId,
                    comment: ev.comment,
                    scores: ev.scoresObj // Using the pre-transformed scores object
                }
            });
        }
    }
    
    console.log("Restoration complete!");
}

restore().catch(console.error);
