import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import apiClient from '@/lib/api-client'
import type { ApiResponse, PaginatedResponse, Warehouse } from '@/types/api.types'

export const warehouseKeys = {
  all: ['warehouses'] as const,
  lists: () => [...warehouseKeys.all, 'list'] as const,
  list: (params: object) => [...warehouseKeys.lists(), params] as const,
  detail: (id: string) => [...warehouseKeys.all, id] as const,
}

export function useWarehouses(page = 1, limit = 20) {
  return useQuery({
    queryKey: warehouseKeys.list({ page, limit }),
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResponse<Warehouse>>(
        `/api/v1/warehouses?page=${page}&limit=${limit}`,
      )
      return data
    },
  })
}

export function useWarehouse(id: string) {
  return useQuery({
    queryKey: warehouseKeys.detail(id),
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<Warehouse>>(`/api/v1/warehouses/${id}`)
      return data.data
    },
    enabled: !!id,
  })
}

export function useCreateWarehouse() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: Partial<Warehouse>) => {
      const { data } = await apiClient.post<ApiResponse<Warehouse>>('/api/v1/warehouses', input)
      return data.data
    },
    onSuccess: (warehouse) => {
      qc.invalidateQueries({ queryKey: warehouseKeys.lists() })
      toast.success(`Warehouse '${warehouse.name}' created`)
    },
  })
}
