import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api-client'
import type { PaginatedResponse, Role, User } from '@/types/api.types'

export function useUsers(page = 1, limit = 20) {
  return useQuery({
    queryKey: ['users', page, limit],
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResponse<User>>(
        `/api/v1/users?page=${page}&limit=${limit}`,
      )
      return data
    },
  })
}

export function useRoles() {
  return useQuery({
    queryKey: ['roles'],
    queryFn: async () => {
      const { data } = await apiClient.get<{ success: boolean; data: Role[] }>('/api/v1/users/roles')
      return data.data
    },
  })
}
