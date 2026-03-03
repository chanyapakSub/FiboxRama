import { neon } from '@neondatabase/serverless';
import { PrismaNeonHTTP } from '@prisma/adapter-neon';
import { PrismaClient } from '@prisma/client';

export const runtime = 'edge';

export function getPrisma(): PrismaClient {
  let databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  // Neon HTTP fetch requires the URL to be properly formatted without pooled params for some Edge limits.
  // Clean connection url to avoid unsupported HTTP query parameter like `sslmode` causing bugs on Edge HTTP Adapters.
  const cleanedUrl = databaseUrl.split("?")[0];
  const sql = neon(cleanedUrl);
  const adapter = new PrismaNeonHTTP(sql);

  return new PrismaClient({ adapter });
}
