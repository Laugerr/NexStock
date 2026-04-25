import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api-client'
import type { ApiResponse } from '@/types/api.types'

interface DashboardSummary {
  warehouseCount: number
  productCount: number
  totalStock: number
  todayMovements: number
  pendingPutaway: number
}

interface MovementTrendPoint {
  date: string
  count: number
}

interface TypeCount {
  type: string
  count: number
}

interface CategoryStock {
  category: string
  total: number
}

export function useDashboardSummary() {
  return useQuery({
    queryKey: ['reports', 'dashboard'],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<DashboardSummary>>('/api/v1/reports/dashboard')
      return data.data
    },
    refetchInterval: 30_000, // refresh every 30s
  })
}

export function useMovementTrend(days = 7) {
  return useQuery({
    queryKey: ['reports', 'movement-trend', days],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<MovementTrendPoint[]>>(
        `/api/v1/reports/movement-trend?days=${days}`,
      )
      return data.data
    },
  })
}

export function useMovementsByType() {
  return useQuery({
    queryKey: ['reports', 'movement-by-type'],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<TypeCount[]>>('/api/v1/reports/movement-by-type')
      return data.data
    },
  })
}

export function useStockByCategory() {
  return useQuery({
    queryKey: ['reports', 'stock-by-category'],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<CategoryStock[]>>(
        '/api/v1/reports/stock-by-category',
      )
      return data.data
    },
  })
}
