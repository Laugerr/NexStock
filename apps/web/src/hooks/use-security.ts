import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import apiClient from '@/lib/api-client'
import type { ApiResponse, PaginatedResponse } from '@/types/api.types'

export interface SecurityEvent {
  id: string
  type: string
  severity: string
  userId: string | null
  ipAddress: string | null
  description: string
  metadata: Record<string, unknown> | null
  resolvedAt: string | null
  createdAt: string
}

export interface SecuritySummary {
  total: number
  unresolved: number
  bySeverity: Record<string, number>
  byType: Record<string, number>
  recentEvents: SecurityEvent[]
}

export function useSecuritySummary() {
  return useQuery({
    queryKey: ['security-summary'],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<SecuritySummary>>('/api/v1/security/summary')
      return data.data
    },
    refetchInterval: 30_000, // auto-refresh every 30s
  })
}

export function useSecurityEvents(params?: { type?: string; severity?: string; resolved?: boolean }) {
  return useQuery({
    queryKey: ['security-events', params],
    queryFn: async () => {
      const p = new URLSearchParams({ limit: '20' })
      if (params?.type) p.set('type', params.type)
      if (params?.severity) p.set('severity', params.severity)
      if (params?.resolved !== undefined) p.set('resolved', String(params.resolved))
      const { data } = await apiClient.get<PaginatedResponse<SecurityEvent>>(
        `/api/v1/security/events?${p.toString()}`,
      )
      return data
    },
  })
}

export function useResolveSecurityEvent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await apiClient.post<ApiResponse<SecurityEvent>>(
        `/api/v1/security/events/${id}/resolve`,
      )
      return data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['security-summary'] })
      queryClient.invalidateQueries({ queryKey: ['security-events'] })
      toast.success('Event resolved')
    },
    onError: () => toast.error('Failed to resolve event'),
  })
}
