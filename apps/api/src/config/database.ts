import { PrismaClient } from '@prisma/client'
import { env } from './env'

/**
 * Serverless-safe Prisma singleton.
 *
 * In long-running servers (local dev) we reuse a single PrismaClient instance
 * across requests.  In Vercel serverless functions each module import is
 * cached for the lifetime of the warm instance, so the globalThis guard
 * prevents creating a new connection pool on every hot module reload in dev
 * while still working correctly in production.
 *
 * Connection limits:
 *   Vercel functions must use the Supabase PgBouncer pooler URL with
 *   ?pgbouncer=true&connection_limit=1 appended.  Without this the function
 *   can exhaust the Supabase free-tier connection limit (max ~60 concurrent).
 */

declare global {
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
