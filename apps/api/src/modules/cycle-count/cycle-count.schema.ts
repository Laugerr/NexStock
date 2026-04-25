import { z } from 'zod'

export const createCycleCountSchema = z.object({
  locationId: z.string().uuid('Invalid location ID'),
  notes: z.string().max(500).optional(),
  items: z
    .array(
      z.object({
        productId: z.string().uuid('Invalid product ID'),
        physicalCount: z.number().int().min(0, 'Count cannot be negative'),
      }),
    )
    .min(1, 'At least one item is required'),
})

export type CreateCycleCountInput = z.infer<typeof createCycleCountSchema>
