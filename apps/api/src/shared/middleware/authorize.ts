import { FastifyRequest, FastifyReply } from 'fastify'
import { db } from '../../config/database'
import { ForbiddenError } from '../errors/app-error'

/**
 * Returns a Fastify preHandler that checks the authenticated user has the
 * required permission (action:resource).
 *
 * Usage in a route:
 *   preHandler: [fastify.authenticate, authorize('create', 'warehouse')]
 */
export function authorize(action: string, resource: string) {
  return async function (request: FastifyRequest, _reply: FastifyReply) {
    const { sub: userId } = request.user

    const hasPermission = await db.rolePermission.findFirst({
      where: {
        role: { users: { some: { id: userId } } },
        permission: { action, resource },
      },
    })

    if (!hasPermission) {
      throw new ForbiddenError(
        `Permission denied: ${action}:${resource}`,
      )
    }
  }
}
