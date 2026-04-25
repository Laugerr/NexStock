import { FastifyInstance } from 'fastify'
import { Prisma } from '@prisma/client'
import { db } from '../../config/database'
import { authorize } from '../../shared/middleware/authorize'
import { successResponse } from '../../shared/utils/response'

export async function locationRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/v1/locations
   * Flat location listing for dropdowns in GRN, put-away, pick, etc.
   * Query: warehouseId?, zoneId?, zoneType?, isActive?
   */
  fastify.get(
    '/',
    { preHandler: [fastify.authenticate, authorize('read', 'location')] },
    async (request, reply) => {
      const query = request.query as {
        warehouseId?: string
        zoneId?: string
        zoneType?: string
        isActive?: string
        search?: string
      }

      const where: Prisma.LocationWhereInput = {
        isActive: query.isActive === 'false' ? false : true,
        ...(query.zoneId && { zoneId: query.zoneId }),
        ...(query.zoneType && { zone: { type: query.zoneType as Prisma.EnumZoneTypeFilter } }),
        ...(query.warehouseId && { zone: { warehouseId: query.warehouseId } }),
        ...(query.search && { code: { contains: query.search, mode: 'insensitive' } }),
      }

      const locations = await db.location.findMany({
        where,
        orderBy: [{ zone: { code: 'asc' } }, { code: 'asc' }],
        include: {
          zone: {
            select: {
              id: true,
              code: true,
              name: true,
              type: true,
              warehouse: { select: { id: true, code: true, name: true } },
            },
          },
        },
        take: 500, // Hard limit for dropdowns
      })

      return reply.send(successResponse(locations))
    },
  )

  /**
   * GET /api/v1/locations/:id/inventory
   * Inventory items at a specific location (for cycle count)
   */
  fastify.get(
    '/:id/inventory',
    { preHandler: [fastify.authenticate, authorize('read', 'inventory')] },
    async (request, reply) => {
      const { id } = request.params as { id: string }

      const items = await db.inventoryItem.findMany({
        where: { locationId: id, quantity: { gt: 0 } },
        include: {
          product: { select: { id: true, sku: true, name: true, unit: true, barcode: true } },
        },
        orderBy: { product: { name: 'asc' } },
      })

      return reply.send(successResponse(items))
    },
  )

  /**
   * GET /api/v1/locations/search?barcode=X
   * Find a location by code for scan workflows
   */
  fastify.get(
    '/search',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { code } = request.query as { code?: string }

      if (!code) return reply.send(successResponse(null))

      const location = await db.location.findFirst({
        where: { code: { equals: code, mode: 'insensitive' } },
        include: {
          zone: {
            select: {
              id: true,
              code: true,
              name: true,
              type: true,
              warehouse: { select: { id: true, code: true, name: true } },
            },
          },
        },
      })

      return reply.send(successResponse(location))
    },
  )
}
