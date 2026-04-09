import { db } from '../../config/database'
import { ConflictError, NotFoundError } from '../../shared/errors/app-error'
import type {
  CreateLocationInput,
  CreateWarehouseInput,
  CreateZoneInput,
  UpdateWarehouseInput,
} from './warehouses.schema'

// ── Warehouses ──────────────────────────────────────────────────────────────

export async function getWarehouses(opts: { skip: number; take: number }) {
  const [items, total] = await Promise.all([
    db.warehouse.findMany({
      skip: opts.skip,
      take: opts.take,
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { zones: true } } },
    }),
    db.warehouse.count(),
  ])
  return { items, total }
}

export async function getWarehouseById(id: string) {
  const warehouse = await db.warehouse.findUnique({
    where: { id },
    include: {
      zones: {
        include: { _count: { select: { locations: true } } },
        orderBy: { code: 'asc' },
      },
    },
  })
  if (!warehouse) throw new NotFoundError('Warehouse', id)
  return warehouse
}

export async function createWarehouse(input: CreateWarehouseInput) {
  const existing = await db.warehouse.findUnique({ where: { code: input.code } })
  if (existing) throw new ConflictError(`Warehouse with code '${input.code}' already exists`)

  return db.warehouse.create({ data: input })
}

export async function updateWarehouse(id: string, input: UpdateWarehouseInput) {
  const warehouse = await db.warehouse.findUnique({ where: { id } })
  if (!warehouse) throw new NotFoundError('Warehouse', id)

  return db.warehouse.update({ where: { id }, data: input })
}

export async function deleteWarehouse(id: string) {
  const warehouse = await db.warehouse.findUnique({ where: { id } })
  if (!warehouse) throw new NotFoundError('Warehouse', id)

  // Soft delete
  return db.warehouse.update({ where: { id }, data: { isActive: false } })
}

// ── Zones ───────────────────────────────────────────────────────────────────

export async function getZones(warehouseId: string) {
  const warehouse = await db.warehouse.findUnique({ where: { id: warehouseId } })
  if (!warehouse) throw new NotFoundError('Warehouse', warehouseId)

  return db.zone.findMany({
    where: { warehouseId },
    orderBy: { code: 'asc' },
    include: { _count: { select: { locations: true } } },
  })
}

export async function createZone(warehouseId: string, input: CreateZoneInput) {
  const warehouse = await db.warehouse.findUnique({ where: { id: warehouseId } })
  if (!warehouse) throw new NotFoundError('Warehouse', warehouseId)

  const existing = await db.zone.findUnique({
    where: { warehouseId_code: { warehouseId, code: input.code } },
  })
  if (existing) throw new ConflictError(`Zone '${input.code}' already exists in this warehouse`)

  return db.zone.create({ data: { ...input, warehouseId } })
}

// ── Locations ────────────────────────────────────────────────────────────────

export async function getLocations(zoneId: string) {
  const zone = await db.zone.findUnique({ where: { id: zoneId } })
  if (!zone) throw new NotFoundError('Zone', zoneId)

  return db.location.findMany({
    where: { zoneId },
    orderBy: { code: 'asc' },
  })
}

export async function createLocation(zoneId: string, input: CreateLocationInput) {
  const zone = await db.zone.findUnique({ where: { id: zoneId } })
  if (!zone) throw new NotFoundError('Zone', zoneId)

  const existing = await db.location.findUnique({
    where: { zoneId_code: { zoneId, code: input.code } },
  })
  if (existing) throw new ConflictError(`Location '${input.code}' already exists in this zone`)

  return db.location.create({ data: { ...input, zoneId } })
}
