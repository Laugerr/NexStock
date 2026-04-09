import { FastifyInstance } from 'fastify'
import {
  createWarehouseSchema,
  updateWarehouseSchema,
  createZoneSchema,
  createLocationSchema,
} from './warehouses.schema'
import {
  getWarehouses,
  getWarehouseById,
  createWarehouse,
  updateWarehouse,
  deleteWarehouse,
  getZones,
  createZone,
  getLocations,
  createLocation,
} from './warehouses.service'
import { authorize } from '../../shared/middleware/authorize'
import { createAuditLog } from '../audit/audit.service'
import { buildPaginationArgs, paginatedResponse, successResponse } from '../../shared/utils/response'

export async function warehouseRoutes(fastify: FastifyInstance) {
  // GET /api/v1/warehouses
  fastify.get(
    '/',
    { preHandler: [fastify.authenticate, authorize('read', 'warehouse')] },
    async (request, reply) => {
      const { page, limit, skip } = buildPaginationArgs(request.query as Record<string, string>)
      const { items, total } = await getWarehouses({ skip, take: limit })
      return reply.send(paginatedResponse(items, total, page, limit))
    },
  )

  // GET /api/v1/warehouses/:id
  fastify.get(
    '/:id',
    { preHandler: [fastify.authenticate, authorize('read', 'warehouse')] },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const warehouse = await getWarehouseById(id)
      return reply.send(successResponse(warehouse))
    },
  )

  // POST /api/v1/warehouses
  fastify.post(
    '/',
    { preHandler: [fastify.authenticate, authorize('create', 'warehouse')] },
    async (request, reply) => {
      const body = createWarehouseSchema.parse(request.body)
      const warehouse = await createWarehouse(body)

      await createAuditLog({
        userId: request.user.sub,
        action: 'CREATE',
        resource: 'warehouse',
        resourceId: warehouse.id,
        after: warehouse,
        ipAddress: request.ip,
      })

      return reply.code(201).send(successResponse(warehouse))
    },
  )

  // PATCH /api/v1/warehouses/:id
  fastify.patch(
    '/:id',
    { preHandler: [fastify.authenticate, authorize('update', 'warehouse')] },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const body = updateWarehouseSchema.parse(request.body)
      const warehouse = await updateWarehouse(id, body)

      await createAuditLog({
        userId: request.user.sub,
        action: 'UPDATE',
        resource: 'warehouse',
        resourceId: id,
        after: body,
        ipAddress: request.ip,
      })

      return reply.send(successResponse(warehouse))
    },
  )

  // DELETE /api/v1/warehouses/:id  (soft-delete)
  fastify.delete(
    '/:id',
    { preHandler: [fastify.authenticate, authorize('delete', 'warehouse')] },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      await deleteWarehouse(id)

      await createAuditLog({
        userId: request.user.sub,
        action: 'DELETE',
        resource: 'warehouse',
        resourceId: id,
        ipAddress: request.ip,
      })

      return reply.code(204).send()
    },
  )

  // ── Zones ──────────────────────────────────────────────────────────────────

  // GET /api/v1/warehouses/:warehouseId/zones
  fastify.get(
    '/:warehouseId/zones',
    { preHandler: [fastify.authenticate, authorize('read', 'zone')] },
    async (request, reply) => {
      const { warehouseId } = request.params as { warehouseId: string }
      const zones = await getZones(warehouseId)
      return reply.send(successResponse(zones))
    },
  )

  // POST /api/v1/warehouses/:warehouseId/zones
  fastify.post(
    '/:warehouseId/zones',
    { preHandler: [fastify.authenticate, authorize('create', 'zone')] },
    async (request, reply) => {
      const { warehouseId } = request.params as { warehouseId: string }
      const body = createZoneSchema.parse(request.body)
      const zone = await createZone(warehouseId, body)
      return reply.code(201).send(successResponse(zone))
    },
  )

  // ── Locations ──────────────────────────────────────────────────────────────

  // GET /api/v1/warehouses/zones/:zoneId/locations
  fastify.get(
    '/zones/:zoneId/locations',
    { preHandler: [fastify.authenticate, authorize('read', 'location')] },
    async (request, reply) => {
      const { zoneId } = request.params as { zoneId: string }
      const locations = await getLocations(zoneId)
      return reply.send(successResponse(locations))
    },
  )

  // POST /api/v1/warehouses/zones/:zoneId/locations
  fastify.post(
    '/zones/:zoneId/locations',
    { preHandler: [fastify.authenticate, authorize('create', 'location')] },
    async (request, reply) => {
      const { zoneId } = request.params as { zoneId: string }
      const body = createLocationSchema.parse(request.body)
      const location = await createLocation(zoneId, body)
      return reply.code(201).send(successResponse(location))
    },
  )
}
