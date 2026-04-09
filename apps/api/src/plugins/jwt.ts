import fp from 'fastify-plugin'
import fjwt from '@fastify/jwt'
import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { env } from '../config/env'
import { UnauthorizedError } from '../shared/errors/app-error'

async function jwtPlugin(fastify: FastifyInstance) {
  await fastify.register(fjwt, {
    secret: env.JWT_SECRET,
    sign: {
      expiresIn: env.JWT_EXPIRES_IN,
    },
  })

  fastify.decorate(
    'authenticate',
    async function authenticate(request: FastifyRequest, _reply: FastifyReply) {
      try {
        await request.jwtVerify()
      } catch {
        throw new UnauthorizedError('Invalid or expired token')
      }
    },
  )
}

export default fp(jwtPlugin, { name: 'jwt' })
