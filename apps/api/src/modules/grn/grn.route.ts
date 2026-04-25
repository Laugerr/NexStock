import { FastifyInstance } from 'fastify'
import { createGrnSchema } from './grn.schema'
import { createGrn, getGrnHistory } from './grn.service'
import { authorize } from '../../shared/middleware/authorize'
import { createAuditLog } from '../audit/audit.service'
import { buildPaginationArgs, paginatedResponse, successResponse } from '../../shared/utils/response'

export async function grnRoutes(fastify: FastifyInstance) {
  // GET /api/v1/grn
  fastify.get(
    '/',
    { preHandler: [fastify.authenticate, authorize('read', 'stock-movement')] },
    async (request, reply) => {
      const { page, limit, skip } = buildPaginationArgs(request.query as Record<string, string>)
      const { items, total } = await getGrnHistory({ skip, take: limit })
      return reply.send(paginatedResponse(items, total, page, limit))
    },
  )

  // POST /api/v1/grn
  fastify.post(
    '/',
    { preHandler: [fastify.authenticate, authorize('create', 'stock-movement')] },
    async (request, reply) => {
      const body = createGrnSchema.parse(request.body)
      const result = await createGrn(body, request.user.sub)

      await createAuditLog({
        userId: request.user.sub,
        action: 'CREATE',
        resource: 'stock-movement',
        resourceId: result.reference,
        after: {
          reference: result.reference,
          totalItems: result.totalItems,
          totalQuantity: result.totalQuantity,
        },
        ipAddress: request.ip,
      })

      return reply.code(201).send(successResponse(result))
    },
  )
}
