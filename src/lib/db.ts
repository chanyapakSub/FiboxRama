import { neon } from '@neondatabase/serverless'
import { PrismaNeonHTTP } from '@prisma/adapter-neon'
import { PrismaClient } from '@prisma/client/edge'

export const runtime = 'edge'

let prisma: PrismaClient

export function getPrisma() {
  if (!prisma) {
    const sql = neon(process.env.DATABASE_URL!)
    const adapter = new PrismaNeonHTTP(sql)
    prisma = new PrismaClient({ adapter })
  }
  return prisma
}