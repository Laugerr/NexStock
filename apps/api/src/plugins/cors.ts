import fp from 'fastify-plugin'
import fcors from '@fastify/cors'
import { FastifyInstance } from 'fastify'
import { env } from '../config/env'

async function corsPlugin(fastify: FastifyInstance) {
  const origins = env.CORS_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean)

  await fastify.register(fcors, {
    origin: origins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  })
}

export default fp(corsPlugin, { name: 'cors' })
