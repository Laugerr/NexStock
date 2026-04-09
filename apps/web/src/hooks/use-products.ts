import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import apiClient from '@/lib/api-client'
import type { ApiResponse, PaginatedResponse, Product } from '@/types/api.types'

export const productKeys = {
  all: ['products'] as const,
  lists: () => [...productKeys.all, 'list'] as const,
  list: (params: object) => [...productKeys.lists(), params] as const,
  detail: (id: string) => [...productKeys.all, id] as const,
}

interface ProductFilters {
  page?: number
  limit?: number
  search?: string
  category?: string
}

export function useProducts(filters: ProductFilters = {}) {
  const { page = 1, limit = 20, search, category } = filters
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    ...(search && { search }),
    ...(category && { category }),
  })

  return useQuery({
    queryKey: productKeys.list(filters),
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResponse<Product>>(
        `/api/v1/products?${params}`,
      )
      return data
    },
  })
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: productKeys.detail(id),
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<Product>>(`/api/v1/products/${id}`)
      return data.data
    },
    enabled: !!id,
  })
}

export function useCreateProduct() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: Partial<Product>) => {
      const { data } = await apiClient.post<ApiResponse<Product>>('/api/v1/products', input)
      return data.data
    },
    onSuccess: (product) => {
      qc.invalidateQueries({ queryKey: productKeys.lists() })
      toast.success(`Product '${product.name}' created`)
    },
  })
}

export function useProductCategories() {
  return useQuery({
    queryKey: ['product-categories'],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<string[]>>('/api/v1/products/categories')
      return data.data
    },
  })
}
