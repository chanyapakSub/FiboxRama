import { getPrisma } from '../src/lib/db';
import fs from 'fs';

async function backup() {
    const prisma = getPrisma();
    console.log("Fetching all data...");
    
    const evaluators = await prisma.evaluator.findMany({
        include: {
            evaluations: {
                include: {
                    scores: true
                }
            }
        }
    });
    
    console.log(`Found ${evaluators.length} evaluators.`);
    
    const backupData = evaluators.map(evaluator => ({
        ...evaluator,
        evaluations: evaluator.evaluations.map(ev => ({
            ...ev,
            // Transform scores array to an object
            scoresObj: ev.scores.reduce((acc: any, s: any) => ({
                ...acc,
                [s.indicatorKey]: s.score
            }), {})
        }))
    }));
    
    fs.writeFileSync('db_backup.json', JSON.stringify(backupData, null, 2));
    console.log("Backup saved to db_backup.json");
}

backup().catch(console.error);
