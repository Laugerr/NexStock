import { FastifyInstance } from 'fastify'
import {
  getDashboardSummary,
  getMovementTrend,
  getMovementsByType,
  getStockByCategory,
  getTopProductsByStock,
} from './reports.service'
import { successResponse } from '../../shared/utils/response'

export async function reportRoutes(fastify: FastifyInstance) {
  // GET /api/v1/reports/dashboard
  fastify.get('/dashboard', { preHandler: [fastify.authenticate] }, async (_req, reply) => {
    const data = await getDashboardSummary()
    return reply.send(successResponse(data))
  })

  // GET /api/v1/reports/movement-trend?days=7
  fastify.get('/movement-trend', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { days } = request.query as { days?: string }
    const data = await getMovementTrend(Math.min(30, parseInt(days ?? '7', 10)))
    return reply.send(successResponse(data))
  })

  // GET /api/v1/reports/movement-by-type
  fastify.get('/movement-by-type', { preHandler: [fastify.authenticate] }, async (_req, reply) => {
    const data = await getMovementsByType()
    return reply.send(successResponse(data))
  })

  // GET /api/v1/reports/stock-by-category
  fastify.get('/stock-by-category', { preHandler: [fastify.authenticate] }, async (_req, reply) => {
    const data = await getStockByCategory()
    return reply.send(successResponse(data))
  })

  // GET /api/v1/reports/top-products?limit=10
  fastify.get('/top-products', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { limit } = request.query as { limit?: string }
    const data = await getTopProductsByStock(Math.min(20, parseInt(limit ?? '10', 10)))
    return reply.send(successResponse(data))
  })
}
