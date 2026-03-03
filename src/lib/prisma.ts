import { PrismaClient } from '@prisma/client/edge'
import { PrismaNeon } from "@prisma/adapter-neon"
import { Pool } from "@neondatabase/serverless"

const connectionString = process.env.DATABASE_URL!

const pool = new Pool({
  connectionString,
})

const adapter = new PrismaNeon(pool)

export const prisma = new PrismaClient({
  adapter,
})