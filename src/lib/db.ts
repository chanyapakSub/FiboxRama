import { PrismaClient } from '@prisma/client'
import { PrismaD1 } from '@prisma/adapter-d1'
import { getRequestContext } from '@cloudflare/next-on-pages'

export const runtime = 'edge'

export async function getDb() {
  // @ts-ignore
  const { env } = getRequestContext() as { env: CloudflareEnv }
  if (!env.DB) {
    throw new Error('D1 Binding (DB) not found. Check wrangler.toml and Cloudflare dashboard.')
  }
  const adapter = new PrismaD1(env.DB)
  const prisma = new PrismaClient({ adapter })
  return prisma
}
