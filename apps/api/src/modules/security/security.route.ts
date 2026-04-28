import { FastifyInstance } from 'fastify'
import { authorize } from '../../shared/middleware/authorize'
import { buildPaginationArgs, paginatedResponse, successResponse } from '../../shared/utils/response'
import { getSecurityEvents, getSecuritySummary, resolveSecurityEvent } from './security.service'
import { NotFoundError } from '../../shared/errors/app-error'

export async function securityRoutes(fastify: FastifyInstance) {
  // GET /api/v1/security/events
  fastify.get(
    '/events',
    { preHandler: [fastify.authenticate, authorize('read', 'audit-log')] },
    async (request, reply) => {
      const query = request.query as {
        page?: string
        limit?: string
        type?: string
        severity?: string
        resolved?: string
      }
      const { page, limit, skip } = buildPaginationArgs(query)
      const resolved =
        query.resolved === 'true' ? true : query.resolved === 'false' ? false : undefined

      const { items, total } = await getSecurityEvents({
        skip,
        take: limit,
        type: query.type,
        severity: query.severity,
        resolved,
      })
      return reply.send(paginatedResponse(items, total, page, limit))
    },
  )

  // GET /api/v1/security/summary
  fastify.get(
    '/summary',
    { preHandler: [fastify.authenticate, authorize('read', 'audit-log')] },
    async (_request, reply) => {
      const summary = await getSecuritySummary()
      return reply.send(successResponse(summary))
    },
  )

  // POST /api/v1/security/events/:id/resolve
  fastify.post(
    '/events/:id/resolve',
    { preHandler: [fastify.authenticate, authorize('update', 'audit-log')] },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      try {
        const event = await resolveSecurityEvent(id)
        return reply.send(successResponse(event))
      } catch {
        throw new NotFoundError('Security event', id)
      }
    },
  )
}
