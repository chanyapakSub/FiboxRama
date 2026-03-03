import { neon } from '@neondatabase/serverless';
import { PrismaNeonHTTP } from '@prisma/adapter-neon';
import { PrismaClient } from '@prisma/client';

export const runtime = 'edge';

export function getPrisma(): PrismaClient {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is not set');
  }
  // Use HTTP adapter (not WebSocket) — required for Cloudflare Edge Runtime
  const sql = neon(databaseUrl);
  const adapter = new PrismaNeonHTTP(sql);
  return new PrismaClient({ adapter });
}
