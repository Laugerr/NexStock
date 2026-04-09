import { Prisma } from '@prisma/client'
import { db } from '../../config/database'
import { BadRequestError, NotFoundError } from '../../shared/errors/app-error'
import { adjustInventory } from '../inventory/inventory.service'
import type { CreateStockMovementInput, StockMovementQuery } from './stock-movements.schema'

export async function getStockMovements(opts: {
  skip: number
  take: number
  type?: string
  productId?: string
  status?: string
}) {
  const where: Prisma.StockMovementWhereInput = {
    ...(opts.type && { type: opts.type as Prisma.EnumMovementTypeFilter }),
    ...(opts.productId && { productId: opts.productId }),
    ...(opts.status && { status: opts.status as Prisma.EnumMovementStatusFilter }),
  }

  const [items, total] = await Promise.all([
    db.stockMovement.findMany({
      where,
      skip: opts.skip,
      take: opts.take,
      orderBy: { createdAt: 'desc' },
      include: {
        product: { select: { id: true, sku: true, name: true, unit: true } },
        fromLocation: { select: { id: true, code: true } },
        toLocation: { select: { id: true, code: true } },
        performedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    }),
    db.stockMovement.count({ where }),
  ])

  return { items, total }
}

export async function getStockMovementById(id: string) {
  const movement = await db.stockMovement.findUnique({
    where: { id },
    include: {
      product: true,
      fromLocation: {
        include: { zone: { include: { warehouse: true } } },
      },
      toLocation: {
        include: { zone: { include: { warehouse: true } } },
      },
      performedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
    },
  })
  if (!movement) throw new NotFoundError('Stock movement', id)
  return movement
}

export async function createStockMovement(
  input: CreateStockMovementInput,
  performedById: string,
) {
  const product = await db.product.findUnique({ where: { id: input.productId } })
  if (!product) throw new NotFoundError('Product', input.productId)

  if (input.fromLocationId) {
    const fromLoc = await db.location.findUnique({ where: { id: input.fromLocationId } })
    if (!fromLoc) throw new NotFoundError('Location', input.fromLocationId)

    // Validate sufficient stock for outbound movements
    if (['PICK', 'TRANSFER', 'WRITE_OFF'].includes(input.type)) {
      const inventoryItem = await db.inventoryItem.findUnique({
        where: {
          productId_locationId: {
            productId: input.productId,
            locationId: input.fromLocationId,
          },
        },
      })
      const available = (inventoryItem?.quantity ?? 0) - (inventoryItem?.reservedQty ?? 0)
      if (available < input.quantity) {
        throw new BadRequestError(
          `Insufficient stock. Available: ${available}, Requested: ${input.quantity}`,
        )
      }
    }
  }

  if (input.toLocationId) {
    const toLoc = await db.location.findUnique({ where: { id: input.toLocationId } })
    if (!toLoc) throw new NotFoundError('Location', input.toLocationId)
  }

  // Create movement record
  const movement = await db.stockMovement.create({
    data: {
      type: input.type,
      productId: input.productId,
      fromLocationId: input.fromLocationId,
      toLocationId: input.toLocationId,
      quantity: input.quantity,
      reference: input.reference,
      notes: input.notes,
      performedById,
      status: 'COMPLETED',
    },
  })

  // Update inventory levels
  if (input.fromLocationId && ['PICK', 'TRANSFER', 'WRITE_OFF'].includes(input.type)) {
    await adjustInventory({
      productId: input.productId,
      locationId: input.fromLocationId,
      quantity: -input.quantity,
    })
  }

  if (input.toLocationId && ['RECEIPT', 'PUTAWAY', 'TRANSFER', 'RETURN'].includes(input.type)) {
    await adjustInventory({
      productId: input.productId,
      locationId: input.toLocationId,
      quantity: input.quantity,
    })
  }

  if (input.type === 'ADJUSTMENT') {
    const targetLocationId = input.toLocationId ?? input.fromLocationId
    if (targetLocationId) {
      await adjustInventory({
        productId: input.productId,
        locationId: targetLocationId,
        quantity: input.quantity, // positive = add stock, negative = remove
      })
    }
  }

  return movement
}
