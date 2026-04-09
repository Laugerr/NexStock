import fp from 'fastify-plugin'
import fcors from '@fastify/cors'
import { FastifyInstance } from 'fastify'
import { env } from '../config/env'

async function corsPlugin(fastify: FastifyInstance) {
  await fastify.register(fcors, {
    origin: env.CORS_ORIGIN.split(',').map((o) => o.trim()),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  })
}

export default fp(corsPlugin, { name: 'cors' })
