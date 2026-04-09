import { FastifyInstance } from 'fastify'
import { db } from '../../config/database'

export async function healthRoutes(fastify: FastifyInstance) {
  fastify.get('/', async (_request, reply) => {
    let dbStatus = 'ok'

    try {
      await db.$queryRaw`SELECT 1`
    } catch {
      dbStatus = 'error'
    }

    const status = dbStatus === 'ok' ? 'ok' : 'degraded'
    const code = status === 'ok' ? 200 : 503

    return reply.code(code).send({
      status,
      timestamp: new Date().toISOString(),
      services: {
        database: dbStatus,
      },
    })
  })
}
