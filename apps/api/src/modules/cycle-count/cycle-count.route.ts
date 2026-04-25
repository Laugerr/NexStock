import { FastifyInstance } from 'fastify'
import { createCycleCountSchema } from './cycle-count.schema'
import { submitCycleCount, previewCycleCount } from './cycle-count.service'
import { authorize } from '../../shared/middleware/authorize'
import { createAuditLog } from '../audit/audit.service'
import { successResponse } from '../../shared/utils/response'

export async function cycleCountRoutes(fastify: FastifyInstance) {
  // GET /api/v1/cycle-count/preview?locationId=X
  fastify.get(
    '/preview',
    { preHandler: [fastify.authenticate, authorize('read', 'inventory')] },
    async (request, reply) => {
      const { locationId } = request.query as { locationId?: string }
      if (!locationId) return reply.code(400).send({ success: false, error: { code: 'BAD_REQUEST', message: 'locationId is required' } })
      const preview = await previewCycleCount(locationId)
      return reply.send(successResponse(preview))
    },
  )

  // POST /api/v1/cycle-count
  fastify.post(
    '/',
    { preHandler: [fastify.authenticate, authorize('create', 'inventory')] },
    async (request, reply) => {
      const body = createCycleCountSchema.parse(request.body)
      const result = await submitCycleCount(body, request.user.sub)

      await createAuditLog({
        userId: request.user.sub,
        action: 'CREATE',
        resource: 'inventory',
        resourceId: result.locationId,
        after: {
          reference: result.reference,
          locationCode: result.locationCode,
          discrepancyCount: result.discrepancyCount,
        },
        ipAddress: request.ip,
      })

      return reply.code(201).send(successResponse(result))
    },
  )
}
