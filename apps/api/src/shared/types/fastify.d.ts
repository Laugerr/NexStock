import '@fastify/jwt'
import { FastifyRequest, FastifyReply } from 'fastify'

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: {
      sub: string
      email: string
      roleId: string
      roleName: string
      jti: string
    }
    user: {
      sub: string
      email: string
      roleId: string
      roleName: string
      jti: string
      exp: number
    }
  }
}

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>
  }
}
