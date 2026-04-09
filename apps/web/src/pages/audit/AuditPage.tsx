import { ClipboardList } from 'lucide-react'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardHeader } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import apiClient from '@/lib/api-client'
import type { PaginatedResponse } from '@/types/api.types'
import { formatDistanceToNow } from '@/lib/utils'

interface AuditLog {
  id: string
  action: string
  resource: string
  resourceId: string | null
  ipAddress: string | null
  createdAt: string
  user: { email: string; firstName: string; lastName: string } | null
}

const actionVariant: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'default'> = {
  CREATE: 'success',
  UPDATE: 'warning',
  DELETE: 'danger',
  LOGIN: 'info',
}

export function AuditPage() {
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs', page],
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResponse<AuditLog>>(
        `/api/v1/audit?page=${page}&limit=25`,
      )
      return data
    },
  })

  const totalPages = data?.meta.totalPages ?? 1

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Audit Log</h1>
        <p className="mt-1 text-sm text-gray-500">
          Complete audit trail of all system actions
        </p>
      </div>

      <Card>
        <CardHeader>
          <p className="text-sm font-medium text-gray-500">
            {data ? `${data.meta.total} events` : ''}
          </p>
        </CardHeader>
        {isLoading ? (
          <Spinner />
        ) : !data?.data.length ? (
          <EmptyState icon={ClipboardList} title="No audit events yet" />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-gray-100 bg-gray-50">
                  <tr>
                    {['Action', 'Resource', 'Resource ID', 'User', 'IP', 'When'].map((h) => (
                      <th key={h} className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {data.data.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-6 py-3.5">
                        <Badge variant={actionVariant[log.action] ?? 'default'}>{log.action}</Badge>
                      </td>
                      <td className="px-6 py-3.5 font-medium text-gray-700 capitalize">{log.resource}</td>
                      <td className="px-6 py-3.5 font-mono text-xs text-gray-500">
                        {log.resourceId ? log.resourceId.substring(0, 8) + '...' : '—'}
                      </td>
                      <td className="px-6 py-3.5 text-gray-600">
                        {log.user ? `${log.user.firstName} ${log.user.lastName}` : 'System'}
                      </td>
                      <td className="px-6 py-3.5 font-mono text-xs text-gray-400">{log.ipAddress ?? '—'}</td>
                      <td className="px-6 py-3.5 text-gray-400">{formatDistanceToNow(log.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-gray-100 px-6 py-4">
                <p className="text-sm text-gray-500">Page {page} of {totalPages}</p>
                <div className="flex gap-2">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                    className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-40 hover:bg-gray-50">Previous</button>
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                    className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-40 hover:bg-gray-50">Next</button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  )
}
