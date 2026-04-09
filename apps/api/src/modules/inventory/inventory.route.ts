import { FastifyInstance } from 'fastify'
import { getInventory, getInventorySummary } from './inventory.service'
import { authorize } from '../../shared/middleware/authorize'
import { buildPaginationArgs, paginatedResponse, successResponse } from '../../shared/utils/response'

export async function inventoryRoutes(fastify: FastifyInstance) {
  // GET /api/v1/inventory
  fastify.get(
    '/',
    { preHandler: [fastify.authenticate, authorize('read', 'inventory')] },
    async (request, reply) => {
      const query = request.query as {
        page?: string
        limit?: string
        warehouseId?: string
        productId?: string
        search?: string
      }
      const { page, limit, skip } = buildPaginationArgs(query)

      const { items, total } = await getInventory({
        skip,
        take: limit,
        warehouseId: query.warehouseId,
        productId: query.productId,
        search: query.search,
      })

      return reply.send(paginatedResponse(items, total, page, limit))
    },
  )

  // GET /api/v1/inventory/summary
  fastify.get(
    '/summary',
    { preHandler: [fastify.authenticate] },
    async (_request, reply) => {
      const summary = await getInventorySummary()
      return reply.send(successResponse(summary))
    },
  )
}
