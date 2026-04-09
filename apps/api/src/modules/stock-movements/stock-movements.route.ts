import { FastifyInstance } from 'fastify'
import { createStockMovementSchema, stockMovementQuerySchema } from './stock-movements.schema'
import {
  getStockMovements,
  getStockMovementById,
  createStockMovement,
} from './stock-movements.service'
import { authorize } from '../../shared/middleware/authorize'
import { createAuditLog } from '../audit/audit.service'
import { buildPaginationArgs, paginatedResponse, successResponse } from '../../shared/utils/response'

export async function stockMovementRoutes(fastify: FastifyInstance) {
  // GET /api/v1/stock-movements
  fastify.get(
    '/',
    { preHandler: [fastify.authenticate, authorize('read', 'stock-movement')] },
    async (request, reply) => {
      const query = stockMovementQuerySchema.parse(request.query)
      const { page, limit, skip } = buildPaginationArgs(query)

      const { items, total } = await getStockMovements({
        skip,
        take: limit,
        type: query.type,
        productId: query.productId,
        status: query.status,
      })

      return reply.send(paginatedResponse(items, total, page, limit))
    },
  )

  // GET /api/v1/stock-movements/:id
  fastify.get(
    '/:id',
    { preHandler: [fastify.authenticate, authorize('read', 'stock-movement')] },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const movement = await getStockMovementById(id)
      return reply.send(successResponse(movement))
    },
  )

  // POST /api/v1/stock-movements
  fastify.post(
    '/',
    { preHandler: [fastify.authenticate, authorize('create', 'stock-movement')] },
    async (request, reply) => {
      const body = createStockMovementSchema.parse(request.body)
      const movement = await createStockMovement(body, request.user.sub)

      await createAuditLog({
        userId: request.user.sub,
        action: 'CREATE',
        resource: 'stock-movement',
        resourceId: movement.id,
        after: {
          type: movement.type,
          productId: movement.productId,
          quantity: movement.quantity,
          reference: movement.reference,
        },
        ipAddress: request.ip,
      })

      return reply.code(201).send(successResponse(movement))
    },
  )
}
