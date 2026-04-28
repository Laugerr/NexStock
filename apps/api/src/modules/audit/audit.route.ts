import { FastifyInstance } from 'fastify'
import { getAuditLogs } from './audit.service'
import { authorize } from '../../shared/middleware/authorize'
import { buildPaginationArgs, paginatedResponse } from '../../shared/utils/response'

export async function auditRoutes(fastify: FastifyInstance) {
  fastify.get(
    '/',
    { preHandler: [fastify.authenticate, authorize('read', 'audit-log')] },
    async (request, reply) => {
      const query = request.query as {
        page?: string
        limit?: string
        resource?: string
        resourceId?: string
        action?: string
      }
      const { page, limit, skip } = buildPaginationArgs(query)
      const { items, total } = await getAuditLogs({
        resource: query.resource,
        resourceId: query.resourceId,
        action: query.action,
        skip,
        take: limit,
      })
      return reply.send(paginatedResponse(items, total, page, limit))
    },
  )
}
