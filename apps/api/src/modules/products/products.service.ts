import { Prisma } from '@prisma/client'
import { db } from '../../config/database'
import { ConflictError, NotFoundError } from '../../shared/errors/app-error'
import type { CreateProductInput, ProductQuery, UpdateProductInput } from './products.schema'

export async function getProducts(opts: {
  skip: number
  take: number
  search?: string
  category?: string
  isActive?: boolean
}) {
  const where: Prisma.ProductWhereInput = {
    ...(opts.isActive !== undefined && { isActive: opts.isActive }),
    ...(opts.category && { category: opts.category }),
    ...(opts.search && {
      OR: [
        { name: { contains: opts.search, mode: 'insensitive' } },
        { sku: { contains: opts.search, mode: 'insensitive' } },
        { barcode: { contains: opts.search, mode: 'insensitive' } },
      ],
    }),
  }

  const [items, total] = await Promise.all([
    db.product.findMany({
      where,
      skip: opts.skip,
      take: opts.take,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { inventoryItems: true } },
      },
    }),
    db.product.count({ where }),
  ])

  return { items, total }
}

export async function getProductById(id: string) {
  const product = await db.product.findUnique({
    where: { id },
    include: {
      inventoryItems: {
        include: {
          location: {
            include: {
              zone: { include: { warehouse: { select: { id: true, name: true, code: true } } } },
            },
          },
        },
      },
    },
  })
  if (!product) throw new NotFoundError('Product', id)
  return product
}

export async function createProduct(input: CreateProductInput) {
  const existing = await db.product.findUnique({ where: { sku: input.sku } })
  if (existing) throw new ConflictError(`Product with SKU '${input.sku}' already exists`)

  if (input.barcode) {
    const barcodeConflict = await db.product.findUnique({ where: { barcode: input.barcode } })
    if (barcodeConflict)
      throw new ConflictError(`Product with barcode '${input.barcode}' already exists`)
  }

  return db.product.create({
    data: {
      ...input,
      weight: input.weight ? new Prisma.Decimal(input.weight) : undefined,
    },
  })
}

export async function updateProduct(id: string, input: UpdateProductInput) {
  const product = await db.product.findUnique({ where: { id } })
  if (!product) throw new NotFoundError('Product', id)

  return db.product.update({
    where: { id },
    data: {
      ...input,
      weight: input.weight ? new Prisma.Decimal(input.weight) : undefined,
    },
  })
}

export async function getProductCategories() {
  const result = await db.product.findMany({
    where: { category: { not: null }, isActive: true },
    select: { category: true },
    distinct: ['category'],
    orderBy: { category: 'asc' },
  })
  return result.map((r) => r.category).filter(Boolean)
}
