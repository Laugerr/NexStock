import { z } from 'zod'

export const createGrnSchema = z.object({
  locationId: z.string().uuid('Select a valid receiving location'),
  supplier: z.string().max(100).optional(),
  poReference: z.string().max(100).optional(),
  notes: z.string().max(500).optional(),
  items: z
    .array(
      z.object({
        productId: z.string().uuid('Invalid product ID'),
        quantity: z.number().int().positive('Quantity must be a positive integer'),
        notes: z.string().max(200).optional(),
      }),
    )
    .min(1, 'At least one item is required'),
})

export type CreateGrnInput = z.infer<typeof createGrnSchema>
