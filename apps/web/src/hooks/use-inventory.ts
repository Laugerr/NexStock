import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api-client'
import type { ApiResponse, InventoryItem, InventorySummary, PaginatedResponse } from '@/types/api.types'

export const inventoryKeys = {
  all: ['inventory'] as const,
  lists: () => [...inventoryKeys.all, 'list'] as const,
  list: (params: object) => [...inventoryKeys.lists(), params] as const,
  summary: () => [...inventoryKeys.all, 'summary'] as const,
}

interface InventoryFilters {
  page?: number
  limit?: number
  warehouseId?: string
  productId?: string
  search?: string
}

export function useInventory(filters: InventoryFilters = {}) {
  const { page = 1, limit = 20, warehouseId, productId, search } = filters
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    ...(warehouseId && { warehouseId }),
    ...(productId && { productId }),
    ...(search && { search }),
  })

  return useQuery({
    queryKey: inventoryKeys.list(filters),
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResponse<InventoryItem>>(
        `/api/v1/inventory?${params}`,
      )
      return data
    },
  })
}

export function useInventorySummary() {
  return useQuery({
    queryKey: inventoryKeys.summary(),
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<InventorySummary>>('/api/v1/inventory/summary')
      return data.data
    },
  })
}
