import fp from 'fastify-plugin'
import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { randomUUID } from 'crypto'
import { db } from '../config/database'

/**
 * Postgres-backed rate limiting plugin.
 *
 * Uses a single atomic SQL upsert per request so there are no race conditions
 * even across multiple Vercel function instances.  A background cleanup (1%
 * probability per request) prunes expired rows to keep the table small.
 *
 * Limits (per IP, per route, per minute):
 *   /api/v1/auth/login    → 10 req/min  (brute-force protection)
 *   /api/v1/auth/register → 5  req/min  (account creation abuse)
 *   everything else       → 120 req/min (reasonable API usage)
 */

interface RateLimitConfig {
  max: number
  windowMs: number
}

const ROUTE_LIMITS: Record<string, RateLimitConfig> = {
  '/api/v1/auth/login':    { max: 10,  windowMs: 60_000 },
  '/api/v1/auth/register': { max: 5,   windowMs: 60_000 },
}

const DEFAULT_LIMIT: RateLimitConfig = { max: 120, windowMs: 60_000 }

function getConfig(path: string): RateLimitConfig {
  return ROUTE_LIMITS[path] ?? DEFAULT_LIMIT
}

async function rateLimitPlugin(fastify: FastifyInstance) {
  fastify.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
    const ip = request.ip
    const path = request.url.split('?')[0]
    const config = getConfig(path)
    const key = `${ip}:${path}`
    const id = randomUUID()
    const resetAt = new Date(Date.now() + config.windowMs)

    // Probabilistic cleanup of expired rows (avoids a dedicated cron)
    if (Math.random() < 0.01) {
      db.rateLimit.deleteMany({ where: { resetAt: { lt: new Date() } } }).catch(() => {
        // Non-critical — ignore cleanup failures
      })
    }

    // Single atomic upsert: create or increment, reset window if expired
    const rows = await db.$queryRaw<Array<{ count: number }>>`
      INSERT INTO rate_limits (id, key, count, reset_at, created_at)
      VALUES (${id}, ${key}, 1, ${resetAt}, NOW())
      ON CONFLICT (key) DO UPDATE SET
        count = CASE
          WHEN rate_limits.reset_at < NOW() THEN 1
          ELSE rate_limits.count + 1
        END,
        reset_at = CASE
          WHEN rate_limits.reset_at < NOW() THEN ${resetAt}
          ELSE rate_limits.reset_at
        END
      RETURNING count
    `

    const count = rows[0]?.count ?? 1

    reply.header('X-RateLimit-Limit', config.max)
    reply.header('X-RateLimit-Remaining', Math.max(0, config.max - count))

    if (count > config.max) {
      return reply.code(429).send({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests. Please slow down.',
        },
      })
    }
  })
}

export default fp(rateLimitPlugin, { name: 'rate-limit' })
