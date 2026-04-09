import { z } from 'zod'

export const createStockMovementSchema = z
  .object({
    type: z.enum([
      'RECEIPT',
      'PUTAWAY',
      'PICK',
      'ADJUSTMENT',
      'TRANSFER',
      'RETURN',
      'WRITE_OFF',
    ]),
    productId: z.string().uuid('Invalid product ID'),
    fromLocationId: z.string().uuid('Invalid location ID').optional(),
    toLocationId: z.string().uuid('Invalid location ID').optional(),
    quantity: z.number().int().positive('Quantity must be a positive integer'),
    reference: z.string().max(100).optional(),
    notes: z.string().max(500).optional(),
  })
  .refine(
    (data) => {
      // RECEIPT and RETURN must have a toLocation
      if (['RECEIPT', 'RETURN'].includes(data.type) && !data.toLocationId) {
        return false
      }
      // PICK and WRITE_OFF must have a fromLocation
      if (['PICK', 'WRITE_OFF'].includes(data.type) && !data.fromLocationId) {
        return false
      }
      // TRANSFER must have both
      if (data.type === 'TRANSFER' && (!data.fromLocationId || !data.toLocationId)) {
        return false
      }
      return true
    },
    {
      message: 'Missing required location(s) for this movement type',
    },
  )

export const stockMovementQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  type: z
    .enum(['RECEIPT', 'PUTAWAY', 'PICK', 'ADJUSTMENT', 'TRANSFER', 'RETURN', 'WRITE_OFF'])
    .optional(),
  productId: z.string().uuid().optional(),
  status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
})

export type CreateStockMovementInput = z.infer<typeof createStockMovementSchema>
export type StockMovementQuery = z.infer<typeof stockMovementQuerySchema>
