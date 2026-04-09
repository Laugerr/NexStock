import fp from 'fastify-plugin'
import { FastifyInstance } from 'fastify'
import { ZodError } from 'zod'
import { AppError } from '../shared/errors/app-error'
import { env } from '../config/env'

async function errorHandlerPlugin(fastify: FastifyInstance) {
  fastify.setErrorHandler((error, request, reply) => {
    // Zod validation error
    if (error instanceof ZodError) {
      return reply.code(422).send({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          details: error.flatten().fieldErrors,
        },
      })
    }

    // Known application error
    if (error instanceof AppError) {
      return reply.code(error.statusCode).send({
        success: false,
        error: {
          code: error.code,
          message: error.message,
        },
      })
    }

    // JWT / @fastify/jwt errors
    if (error.statusCode === 401) {
      return reply.code(401).send({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Unauthorized' },
      })
    }

    // Unknown error
    fastify.log.error({ err: error, req: { method: request.method, url: request.url } })
    return reply.code(500).send({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
      },
    })
  })
}

export default fp(errorHandlerPlugin, { name: 'error-handler' })
