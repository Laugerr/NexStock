import { db } from '../../config/database'
import { NotFoundError } from '../../shared/errors/app-error'
import { adjustInventory } from '../inventory/inventory.service'
import type { CreateGrnInput } from './grn.schema'

function generateGrnReference(): string {
  const date = new Date()
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '')
  const rand = Math.floor(Math.random() * 9000) + 1000
  return `GRN-${dateStr}-${rand}`
}

export async function createGrn(input: CreateGrnInput, userId: string) {
  // Validate location
  const location = await db.location.findUnique({
    where: { id: input.locationId },
    include: { zone: { include: { warehouse: true } } },
  })
  if (!location) throw new NotFoundError('Location', input.locationId)

  // Validate all products
  for (const item of input.items) {
    const product = await db.product.findUnique({ where: { id: item.productId } })
    if (!product) throw new NotFoundError('Product', item.productId)
  }

  const reference = generateGrnReference()

  // Create a RECEIPT movement for each line item
  const movements = await Promise.all(
    input.items.map((item) =>
      db.stockMovement.create({
        data: {
          type: 'RECEIPT',
          productId: item.productId,
          toLocationId: input.locationId,
          quantity: item.quantity,
          reference,
          notes: item.notes ?? input.notes,
          performedById: userId,
          status: 'COMPLETED',
        },
        include: {
          product: { select: { id: true, sku: true, name: true, unit: true } },
          toLocation: { select: { id: true, code: true } },
        },
      }),
    ),
  )

  // Update inventory for each line
  await Promise.all(
    input.items.map((item) =>
      adjustInventory({
        productId: item.productId,
        locationId: input.locationId,
        quantity: item.quantity,
      }),
    ),
  )

  return {
    reference,
    supplier: input.supplier,
    poReference: input.poReference,
    location: { id: location.id, code: location.code },
    warehouse: { id: location.zone.warehouse.id, name: location.zone.warehouse.name },
    movements,
    totalItems: movements.length,
    totalQuantity: input.items.reduce((sum, i) => sum + i.quantity, 0),
    createdAt: new Date().toISOString(),
  }
}

export async function getGrnHistory(opts: { skip: number; take: number }) {
  // Get RECEIPT movements grouped by GRN reference
  const grnMovements = await db.stockMovement.findMany({
    where: {
      type: 'RECEIPT',
      reference: { startsWith: 'GRN-' },
    },
    include: {
      product: { select: { id: true, sku: true, name: true } },
      toLocation: {
        select: {
          id: true,
          code: true,
          zone: { select: { warehouse: { select: { name: true } } } },
        },
      },
      performedBy: { select: { id: true, firstName: true, lastName: true } },
    },
    orderBy: { createdAt: 'desc' },
    skip: opts.skip,
    take: opts.take * 10, // Overfetch to group
  })

  // Group by reference
  const grouped = new Map<string, typeof grnMovements>()
  for (const m of grnMovements) {
    if (!m.reference) continue
    if (!grouped.has(m.reference)) grouped.set(m.reference, [])
    grouped.get(m.reference)!.push(m)
  }

  const grns = Array.from(grouped.entries()).map(([reference, movements]) => ({
    reference,
    lineCount: movements.length,
    totalQuantity: movements.reduce((s, m) => s + m.quantity, 0),
    warehouse: movements[0]?.toLocation?.zone?.warehouse?.name ?? '—',
    location: movements[0]?.toLocation?.code ?? '—',
    performedBy: movements[0]?.performedBy,
    createdAt: movements[0]?.createdAt,
    products: movements.map((m) => ({ sku: m.product.sku, name: m.product.name, quantity: m.quantity })),
  }))

  const total = await db.stockMovement.groupBy({
    by: ['reference'],
    where: { type: 'RECEIPT', reference: { startsWith: 'GRN-' } },
  })

  return { items: grns.slice(0, opts.take), total: total.length }
}
