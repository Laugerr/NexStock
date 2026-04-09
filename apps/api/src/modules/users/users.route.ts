import { FastifyInstance } from 'fastify'
import { updateUserSchema } from './users.schema'
import { getUsers, getUserById, updateUser, getRoles } from './users.service'
import { authorize } from '../../shared/middleware/authorize'
import { buildPaginationArgs, paginatedResponse, successResponse } from '../../shared/utils/response'

export async function userRoutes(fastify: FastifyInstance) {
  // GET /api/v1/users
  fastify.get(
    '/',
    { preHandler: [fastify.authenticate, authorize('read', 'user')] },
    async (request, reply) => {
      const { page, limit, skip } = buildPaginationArgs(request.query as Record<string, string>)
      const { items, total } = await getUsers({ skip, take: limit })
      return reply.send(paginatedResponse(items, total, page, limit))
    },
  )

  // GET /api/v1/users/roles
  fastify.get(
    '/roles',
    { preHandler: [fastify.authenticate] },
    async (_request, reply) => {
      const roles = await getRoles()
      return reply.send(successResponse(roles))
    },
  )

  // GET /api/v1/users/:id
  fastify.get(
    '/:id',
    { preHandler: [fastify.authenticate, authorize('read', 'user')] },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const user = await getUserById(id)
      return reply.send(successResponse(user))
    },
  )

  // PATCH /api/v1/users/:id
  fastify.patch(
    '/:id',
    { preHandler: [fastify.authenticate, authorize('update', 'user')] },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const body = updateUserSchema.parse(request.body)
      const user = await updateUser(id, body)
      return reply.send(successResponse(user))
    },
  )
}
