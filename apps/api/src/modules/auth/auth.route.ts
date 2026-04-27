import { FastifyInstance } from 'fastify'
import { loginSchema, registerSchema } from './auth.schema'
import { getCurrentUser, loginUser, registerUser, revokeToken } from './auth.service'
import { createAuditLog } from '../audit/audit.service'
import { authorize } from '../../shared/middleware/authorize'
import { successResponse } from '../../shared/utils/response'

export async function authRoutes(fastify: FastifyInstance) {
  // POST /api/v1/auth/login
  fastify.post('/login', async (request, reply) => {
    const body = loginSchema.parse(request.body)
    const result = await loginUser(fastify, body.email, body.password)

    await createAuditLog({
      userId: result.user.id,
      action: 'LOGIN',
      resource: 'auth',
      after: { email: body.email },
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
    })

    return reply.code(200).send(successResponse(result))
  })

  // POST /api/v1/auth/register  (admin-only in production)
  fastify.post(
    '/register',
    { preHandler: [fastify.authenticate, authorize('create', 'user')] },
    async (request, reply) => {
      const body = registerSchema.parse(request.body)
      const user = await registerUser(body)

      await createAuditLog({
        userId: request.user.sub,
        action: 'CREATE',
        resource: 'user',
        resourceId: user.id,
        after: { email: user.email, role: user.role },
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
      })

      return reply.code(201).send(successResponse(user))
    },
  )

  // POST /api/v1/auth/logout
  fastify.post('/logout', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { jti, sub, exp } = request.user
    const expiresAt = exp ? new Date(exp * 1000) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    await revokeToken(jti, sub, expiresAt)

    await createAuditLog({
      userId: sub,
      action: 'LOGOUT',
      resource: 'auth',
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
    })

    return reply.code(200).send(successResponse({ message: 'Logged out successfully' }))
  })

  // GET /api/v1/auth/me
  fastify.get('/me', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const user = await getCurrentUser(request.user.sub)
    return reply.send(successResponse(user))
  })
}
