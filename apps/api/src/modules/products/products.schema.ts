import { z } from 'zod'

export const createProductSchema = z.object({
  sku: z
    .string()
    .min(2)
    .max(50)
    .regex(/^[A-Z0-9-_]+$/, 'SKU must be uppercase alphanumeric with dashes/underscores'),
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  barcode: z.string().max(50).optional(),
  unit: z.string().max(20).default('EACH'),
  weight: z.coerce.number().positive().optional(),
  dimensions: z
    .object({
      length: z.number().positive(),
      width: z.number().positive(),
      height: z.number().positive(),
      unit: z.enum(['cm', 'in', 'm']).default('cm'),
    })
    .optional(),
  category: z.string().max(100).optional(),
})

export const updateProductSchema = createProductSchema.partial().omit({ sku: true })

export const productQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  search: z.string().optional(),
  category: z.string().optional(),
  isActive: z.enum(['true', 'false']).optional(),
})

export type CreateProductInput = z.infer<typeof createProductSchema>
export type UpdateProductInput = z.infer<typeof updateProductSchema>
export type ProductQuery = z.infer<typeof productQuerySchema>
