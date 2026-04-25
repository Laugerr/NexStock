import { Prisma } from '@prisma/client'
import { db } from '../../config/database'

interface DayCount {
  date: string
  count: bigint
}

interface TypeCount {
  type: string
  count: bigint
}

interface CategoryStock {
  category: string | null
  total: bigint
}

export async function getMovementTrend(days = 7) {
  const result = await db.$queryRaw<DayCount[]>`
    SELECT
      TO_CHAR(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS date,
      COUNT(*)::bigint AS count
    FROM stock_movements
    WHERE created_at >= NOW() - INTERVAL '1 day' * ${days}
    GROUP BY date
    ORDER BY date ASC
  `

  // Fill in missing days with 0
  const filled: { date: string; count: number }[] = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().slice(0, 10)
    const found = result.find((r) => r.date === dateStr)
    filled.push({ date: dateStr, count: Number(found?.count ?? 0) })
  }

  return filled
}

export async function getMovementsByType() {
  const result = await db.$queryRaw<TypeCount[]>`
    SELECT type, COUNT(*)::bigint AS count
    FROM stock_movements
    GROUP BY type
    ORDER BY count DESC
  `
  return result.map((r) => ({ type: r.type, count: Number(r.count) }))
}

export async function getStockByCategory() {
  const result = await db.$queryRaw<CategoryStock[]>`
    SELECT
      p.category,
      SUM(i.quantity)::bigint AS total
    FROM inventory_items i
    JOIN products p ON p.id = i.product_id
    WHERE i.quantity > 0
    GROUP BY p.category
    ORDER BY total DESC
  `
  return result.map((r) => ({
    category: r.category ?? 'Uncategorized',
    total: Number(r.total),
  }))
}

export async function getTopProductsByStock(limit = 10) {
  const items = await db.inventoryItem.groupBy({
    by: ['productId'],
    _sum: { quantity: true },
    where: { quantity: { gt: 0 } },
    orderBy: { _sum: { quantity: 'desc' } },
    take: limit,
  })

  const products = await Promise.all(
    items.map(async (item) => {
      const product = await db.product.findUnique({
        where: { id: item.productId },
        select: { id: true, sku: true, name: true, unit: true },
      })
      return { product, totalQuantity: item._sum.quantity ?? 0 }
    }),
  )

  return products.filter((p) => p.product !== null)
}

export async function getDashboardSummary() {
  const [warehouseCount, productCount, stockAgg, todayMovements, pendingPutaway] =
    await Promise.all([
      db.warehouse.count({ where: { isActive: true } }),
      db.product.count({ where: { isActive: true } }),
      db.inventoryItem.aggregate({ _sum: { quantity: true } }),
      db.stockMovement.count({
        where: {
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),
      db.inventoryItem.count({
        where: {
          quantity: { gt: 0 },
          location: { zone: { type: 'RECEIVING' } },
        },
      }),
    ])

  return {
    warehouseCount,
    productCount,
    totalStock: stockAgg._sum.quantity ?? 0,
    todayMovements,
    pendingPutaway,
  }
}
