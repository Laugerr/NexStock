import { Prisma } from '@prisma/client'
import { db } from '../../config/database'
import { NotFoundError } from '../../shared/errors/app-error'

export async function getInventory(opts: {
  skip: number
  take: number
  warehouseId?: string
  productId?: string
  search?: string
}) {
  const where: Prisma.InventoryItemWhereInput = {
    ...(opts.productId && { productId: opts.productId }),
    ...(opts.warehouseId && {
      location: { zone: { warehouseId: opts.warehouseId } },
    }),
    ...(opts.search && {
      OR: [
        { product: { name: { contains: opts.search, mode: 'insensitive' } } },
        { product: { sku: { contains: opts.search, mode: 'insensitive' } } },
      ],
    }),
    quantity: { gt: 0 },
  }

  const [items, total] = await Promise.all([
    db.inventoryItem.findMany({
      where,
      skip: opts.skip,
      take: opts.take,
      orderBy: { updatedAt: 'desc' },
      include: {
        product: { select: { id: true, sku: true, name: true, unit: true, category: true } },
        location: {
          select: {
            id: true,
            code: true,
            aisle: true,
            bay: true,
            level: true,
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
        },
      },
    }),
    db.inventoryItem.count({ where }),
  ])

  return { items, total }
}

export async function getInventorySummary() {
  const [totalProducts, totalLocations, totalMovements, warehouseCount] = await Promise.all([
    db.product.count({ where: { isActive: true } }),
    db.location.count({ where: { isActive: true } }),
    db.stockMovement.count(),
    db.warehouse.count({ where: { isActive: true } }),
  ])

  const stockAgg = await db.inventoryItem.aggregate({ _sum: { quantity: true } })

  return {
    totalProducts,
    totalLocations,
    totalMovements,
    warehouseCount,
    totalStock: stockAgg._sum.quantity ?? 0,
  }
}

export async function adjustInventory(opts: {
  productId: string
  locationId: string
  quantity: number
}) {
  const product = await db.product.findUnique({ where: { id: opts.productId } })
  if (!product) throw new NotFoundError('Product', opts.productId)

  const location = await db.location.findUnique({ where: { id: opts.locationId } })
  if (!location) throw new NotFoundError('Location', opts.locationId)

  return db.inventoryItem.upsert({
    where: { productId_locationId: { productId: opts.productId, locationId: opts.locationId } },
    update: { quantity: { increment: opts.quantity } },
    create: {
      productId: opts.productId,
      locationId: opts.locationId,
      quantity: opts.quantity,
    },
  })
}
