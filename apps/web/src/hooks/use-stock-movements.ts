import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import apiClient from '@/lib/api-client'
import type {
  ApiResponse,
  MovementType,
  MovementStatus,
  PaginatedResponse,
  StockMovement,
} from '@/types/api.types'
import { inventoryKeys } from './use-inventory'

export const movementKeys = {
  all: ['stock-movements'] as const,
  lists: () => [...movementKeys.all, 'list'] as const,
  list: (params: object) => [...movementKeys.lists(), params] as const,
}

interface MovementFilters {
  page?: number
  limit?: number
  type?: MovementType
  productId?: string
  status?: MovementStatus
}

export function useStockMovements(filters: MovementFilters = {}) {
  const { page = 1, limit = 20, type, productId, status } = filters
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    ...(type && { type }),
    ...(productId && { productId }),
    ...(status && { status }),
  })

  return useQuery({
    queryKey: movementKeys.list(filters),
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResponse<StockMovement>>(
        `/api/v1/stock-movements?${params}`,
      )
      return data
    },
  })
}

export interface CreateMovementInput {
  type: MovementType
  productId: string
  fromLocationId?: string
  toLocationId?: string
  quantity: number
  reference?: string
  notes?: string
}

export function useCreateStockMovement() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateMovementInput) => {
      const { data } = await apiClient.post<ApiResponse<StockMovement>>(
        '/api/v1/stock-movements',
        input,
      )
      return data.data
    },
    onSuccess: (movement) => {
      qc.invalidateQueries({ queryKey: movementKeys.lists() })
      qc.invalidateQueries({ queryKey: inventoryKeys.all })
      toast.success(`${movement.type} movement recorded`)
    },
  })
}
