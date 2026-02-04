// Database configuration - currently disabled
// TODO: Configure Cloudflare D1 and Prisma when ready

export const runtime = 'edge'

export async function getDb(): Promise<any> {
  throw new Error('Database not configured yet. This is a placeholder.')
}
