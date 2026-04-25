import { db } from '../../config/database'
import { NotFoundError } from '../../shared/errors/app-error'
import type { CreateCycleCountInput } from './cycle-count.schema'

function generateCycleCountReference(locationCode: string): string {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  return `CC-${locationCode}-${dateStr}`
}

export interface CycleCountResult {
  reference: string
  locationId: string
  locationCode: string
  discrepancyCount: number
  adjustments: {
    productId: string
    sku: string
    name: string
    systemQty: number
    physicalQty: number
    difference: number
    adjustmentCreated: boolean
  }[]
}

export async function submitCycleCount(
  input: CreateCycleCountInput,
  userId: string,
): Promise<CycleCountResult> {
  const location = await db.location.findUnique({ where: { id: input.locationId } })
  if (!location) throw new NotFoundError('Location', input.locationId)

  const reference = generateCycleCountReference(location.code)
  const adjustments: CycleCountResult['adjustments'] = []

  for (const item of input.items) {
    const product = await db.product.findUnique({ where: { id: item.productId } })
    if (!product) throw new NotFoundError('Product', item.productId)

    // Get current system quantity
    const inventoryItem = await db.inventoryItem.findUnique({
      where: { productId_locationId: { productId: item.productId, locationId: input.locationId } },
    })

    const systemQty = inventoryItem?.quantity ?? 0
    const physicalQty = item.physicalCount
    const difference = physicalQty - systemQty

    let adjustmentCreated = false

    if (difference !== 0) {
      // Create an ADJUSTMENT movement for the discrepancy
      await db.stockMovement.create({
        data: {
          type: 'ADJUSTMENT',
          productId: item.productId,
          toLocationId: difference > 0 ? input.locationId : undefined,
          fromLocationId: difference < 0 ? input.locationId : undefined,
          quantity: Math.abs(difference),
          reference,
          notes: `Cycle count adjustment. System: ${systemQty}, Physical: ${physicalQty}. ${input.notes ?? ''}`.trim(),
          performedById: userId,
          status: 'COMPLETED',
        },
      })

      // Update inventory to match physical count
      await db.inventoryItem.upsert({
        where: { productId_locationId: { productId: item.productId, locationId: input.locationId } },
        update: { quantity: physicalQty },
        create: { productId: item.productId, locationId: input.locationId, quantity: physicalQty },
      })

      adjustmentCreated = true
    }

    adjustments.push({
      productId: item.productId,
      sku: product.sku,
      name: product.name,
      systemQty,
      physicalQty,
      difference,
      adjustmentCreated,
    })
  }

  return {
    reference,
    locationId: input.locationId,
    locationCode: location.code,
    discrepancyCount: adjustments.filter((a) => a.difference !== 0).length,
    adjustments,
  }
}

export async function previewCycleCount(locationId: string) {
  const location = await db.location.findUnique({ where: { id: locationId } })
  if (!location) throw new NotFoundError('Location', locationId)

  const inventoryItems = await db.inventoryItem.findMany({
    where: { locationId, quantity: { gte: 0 } },
    include: {
      product: { select: { id: true, sku: true, name: true, unit: true } },
    },
    orderBy: { product: { name: 'asc' } },
  })

  return {
    location,
    items: inventoryItems.map((i) => ({
      productId: i.productId,
      sku: i.product.sku,
      name: i.product.name,
      unit: i.product.unit,
      systemQty: i.quantity,
    })),
  }
}
