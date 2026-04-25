import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import apiClient from '@/lib/api-client'
import type { ApiResponse, PaginatedResponse } from '@/types/api.types'
import { inventoryKeys } from './use-inventory'
import { movementKeys } from './use-stock-movements'

interface GrnResult {
  reference: string
  supplier?: string
  poReference?: string
  location: { id: string; code: string }
  warehouse: { id: string; name: string }
  movements: unknown[]
  totalItems: number
  totalQuantity: number
  createdAt: string
}

interface GrnHistoryItem {
  reference: string
  lineCount: number
  totalQuantity: number
  warehouse: string
  location: string
  performedBy: { firstName: string; lastName: string } | null
  createdAt: string
  products: { sku: string; name: string; quantity: number }[]
}

interface CreateGrnInput {
  locationId: string
  supplier?: string
  poReference?: string
  notes?: string
  items: { productId: string; quantity: number; notes?: string }[]
}

export function useGrnHistory(page = 1) {
  return useQuery({
    queryKey: ['grn', page],
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResponse<GrnHistoryItem>>(
        `/api/v1/grn?page=${page}&limit=20`,
      )
      return data
    },
  })
}

export function useCreateGrn() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateGrnInput) => {
      const { data } = await apiClient.post<ApiResponse<GrnResult>>('/api/v1/grn', input)
      return data.data
    },
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ['grn'] })
      qc.invalidateQueries({ queryKey: inventoryKeys.all })
      qc.invalidateQueries({ queryKey: movementKeys.all })
      toast.success(`GRN ${result.reference} created — ${result.totalItems} line(s) received`)
    },
  })
}
