import { z } from 'zod'

export const createWarehouseSchema = z.object({
  code: z
    .string()
    .min(2)
    .max(20)
    .regex(/^[A-Z0-9-]+$/, 'Code must be uppercase alphanumeric with dashes'),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  address: z.string().max(200).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  country: z.string().max(100).optional(),
  postalCode: z.string().max(20).optional(),
})

export const updateWarehouseSchema = createWarehouseSchema.partial().omit({ code: true })

export const createZoneSchema = z.object({
  code: z
    .string()
    .min(2)
    .max(20)
    .regex(/^[A-Z0-9-]+$/, 'Code must be uppercase alphanumeric with dashes'),
  name: z.string().min(1).max(100),
  type: z.enum(['RECEIVING', 'STORAGE', 'PICKING', 'SHIPPING', 'STAGING', 'QUARANTINE']),
})

export const createLocationSchema = z.object({
  code: z.string().min(1).max(30),
  aisle: z.string().max(10).optional(),
  bay: z.string().max(10).optional(),
  level: z.string().max(10).optional(),
  position: z.string().max(10).optional(),
})

export type CreateWarehouseInput = z.infer<typeof createWarehouseSchema>
export type UpdateWarehouseInput = z.infer<typeof updateWarehouseSchema>
export type CreateZoneInput = z.infer<typeof createZoneSchema>
export type CreateLocationInput = z.infer<typeof createLocationSchema>
