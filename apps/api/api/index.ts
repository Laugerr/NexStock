/**
 * Vercel Serverless Entry Point
 *
 * Wraps the existing Fastify application using Fastify's inject() method.
 * This is Approach A: zero changes to src/ — all route, service, middleware,
 * RBAC, audit-log, and validation code runs exactly as written.
 *
 * Cold-start behaviour:
 *   - First request initialises Fastify and waits for app.ready().
 *   - Subsequent requests on a warm instance reuse the same Fastify instance
 *     (and the same Prisma connection pool) from the module-level cache.
 *   - On Vercel free tier, expect ~500–800 ms cold starts.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import type { FastifyInstance } from 'fastify'
import { buildServer } from '../src/server'

// Module-level cache — survives across warm invocations of the same instance
let app: FastifyInstance | null = null

async function getApp(): Promise<FastifyInstance> {
  if (!app) {
    app = await buildServer()
    await app.ready()
  }
  return app
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  const fastify = await getApp()

  // Vercel pre-parses JSON bodies. Re-serialize so Fastify can parse them again
  // through its own content-type handling and Zod validation pipeline.
  const body =
    req.method !== 'GET' &&
    req.method !== 'HEAD' &&
    req.body !== undefined &&
    req.body !== null
      ? JSON.stringify(req.body)
      : undefined

  const response = await fastify.inject({
    method: req.method as
      | 'GET'
      | 'POST'
      | 'PUT'
      | 'PATCH'
      | 'DELETE'
      | 'HEAD'
      | 'OPTIONS',
    url: req.url ?? '/',
    headers: req.headers as Record<string, string>,
    payload: body,
  })

  res.status(response.statusCode)

  for (const [key, value] of Object.entries(response.headers)) {
    if (value !== undefined) {
      res.setHeader(key, value as string | string[])
    }
  }

  res.end(response.rawPayload)
}
