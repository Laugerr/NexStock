import { FastifyInstance } from 'fastify'
import { db } from '../../config/database'
// eslint-disable-next-line @typescript-eslint/no-var-requires
const pkg = require('../../../package.json') as { version: string }

const startTime = Date.now()

export async function healthRoutes(fastify: FastifyInstance) {
  // GET /api/v1/health
  fastify.get('/', async (_request, reply) => {
    let dbStatus: 'ok' | 'error' = 'ok'

    try {
      await db.$queryRaw`SELECT 1`
    } catch {
      dbStatus = 'error'
    }

    const status = dbStatus === 'ok' ? 'ok' : 'degraded'
    const code = status === 'ok' ? 200 : 503

    return reply.code(code).send({
      status,
      version: pkg.version,
      uptime: Math.floor((Date.now() - startTime) / 1000),
      timestamp: new Date().toISOString(),
      services: {
        database: dbStatus,
      },
    })
  })
}
