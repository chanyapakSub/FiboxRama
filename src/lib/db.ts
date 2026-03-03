import { neon } from '@neondatabase/serverless';
import { PrismaNeonHTTP } from '@prisma/adapter-neon';
import { PrismaClient } from '@prisma/client/edge'

export const runtime = 'edge';

export function getPrisma(): PrismaClient {
  let databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  // Neon HTTP uses standard fetch underneath. 
  // Need the full connection string including pgBouncer configs.
  const sql = neon(databaseUrl);
  const adapter = new PrismaNeonHTTP(sql);

  return new PrismaClient({ adapter });
}
