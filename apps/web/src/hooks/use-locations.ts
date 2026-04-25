import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api-client'
import type { ApiResponse, Location } from '@/types/api.types'

interface LocationWithZone extends Location {
  zone: {
    id: string
    code: string
    name: string
    type: string
    warehouse: { id: string; code: string; name: string }
  }
}

interface LocationFilters {
  warehouseId?: string
  zoneId?: string
  zoneType?: string
  isActive?: boolean
  search?: string
}

export const locationKeys = {
  all: ['locations'] as const,
  list: (filters: LocationFilters) => [...locationKeys.all, filters] as const,
  byLocation: (id: string) => [...locationKeys.all, id, 'inventory'] as const,
}

export function useLocations(filters: LocationFilters = {}) {
  const params = new URLSearchParams({
    ...(filters.warehouseId && { warehouseId: filters.warehouseId }),
    ...(filters.zoneId && { zoneId: filters.zoneId }),
    ...(filters.zoneType && { zoneType: filters.zoneType }),
    ...(filters.search && { search: filters.search }),
    isActive: String(filters.isActive ?? true),
  })

  return useQuery({
    queryKey: locationKeys.list(filters),
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<LocationWithZone[]>>(
        `/api/v1/locations?${params}`,
      )
      return data.data
    },
  })
}

export function useLocationInventory(locationId: string) {
  return useQuery({
    queryKey: locationKeys.byLocation(locationId),
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<{
        id: string
        quantity: number
        reservedQty: number
        product: { id: string; sku: string; name: string; unit: string; barcode: string | null }
      }[]>>(`/api/v1/locations/${locationId}/inventory`)
      return data.data
    },
    enabled: !!locationId,
  })
}

export function useBarcodeProductLookup() {
  return async (barcode: string) => {
    const { data } = await apiClient.get<ApiResponse<{ id: string; sku: string; name: string; unit: string } | null>>(
      `/api/v1/products/lookup?barcode=${encodeURIComponent(barcode)}`,
    )
    return data.data
  }
}
