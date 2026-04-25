import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import apiClient from '@/lib/api-client'
import type { ApiResponse } from '@/types/api.types'
import { inventoryKeys } from './use-inventory'

interface CycleCountPreview {
  location: { id: string; code: string; aisle: string | null; bay: string | null; level: string | null }
  items: { productId: string; sku: string; name: string; unit: string; systemQty: number }[]
}

interface CycleCountResult {
  reference: string
  locationId: string
  locationCode: string
  discrepancyCount: number
  adjustments: {
    productId: string
    sku: string
    name: string
    systemQty: number
    physicalQty: number
    difference: number
    adjustmentCreated: boolean
  }[]
}

interface CreateCycleCountInput {
  locationId: string
  notes?: string
  items: { productId: string; physicalCount: number }[]
}

export function useCycleCountPreview(locationId: string) {
  return useQuery({
    queryKey: ['cycle-count-preview', locationId],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<CycleCountPreview>>(
        `/api/v1/cycle-count/preview?locationId=${locationId}`,
      )
      return data.data
    },
    enabled: !!locationId,
  })
}

export function useSubmitCycleCount() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateCycleCountInput) => {
      const { data } = await apiClient.post<ApiResponse<CycleCountResult>>('/api/v1/cycle-count', input)
      return data.data
    },
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: inventoryKeys.all })
      qc.invalidateQueries({ queryKey: ['cycle-count-preview'] })
      if (result.discrepancyCount === 0) {
        toast.success(`Cycle count complete — no discrepancies found`)
      } else {
        toast.success(
          `Cycle count complete — ${result.discrepancyCount} discrepanc${result.discrepancyCount === 1 ? 'y' : 'ies'} adjusted`,
        )
      }
    },
  })
}
