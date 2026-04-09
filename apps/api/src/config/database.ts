import { PrismaClient } from '@prisma/client'
import { env } from './env'

declare global {
  // Prevent multiple Prisma instances in development hot-reload
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined
}

export const db: PrismaClient =
  globalThis.__prisma ??
  new PrismaClient({
    log: env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })

if (env.NODE_ENV !== 'production') {
  globalThis.__prisma = db
}
