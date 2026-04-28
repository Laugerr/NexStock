import { ShieldAlert, ShieldCheck, AlertTriangle, Lock } from 'lucide-react'
import { useState } from 'react'
import { Card, CardHeader } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { useSecuritySummary, useSecurityEvents, useResolveSecurityEvent } from '@/hooks/use-security'
import type { SecurityEvent } from '@/hooks/use-security'
import { formatDistanceToNow } from '@/lib/utils'

// ── Helpers ────────────────────────────────────────────────────────────────────

const severityVariant: Record<string, 'danger' | 'warning' | 'info' | 'default'> = {
  CRITICAL: 'danger',
  HIGH:     'warning',
  MEDIUM:   'info',
  LOW:      'default',
}

const typeLabel: Record<string, string> = {
  BRUTE_FORCE:       'Brute Force',
  ACCOUNT_LOCKED:    'Account Locked',
  RAPID_ADJUSTMENT:  'Rapid Adjustment',
  AFTER_HOURS:       'After Hours',
}

const severityBar: Record<string, string> = {
  CRITICAL: 'bg-red-500',
  HIGH:     'bg-amber-500',
  MEDIUM:   'bg-blue-400',
  LOW:      'bg-gray-300',
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function EventRow({ event, onResolve, resolving }: {
  event: SecurityEvent
  onResolve: (id: string) => void
  resolving: boolean
}) {
  return (
    <tr className="hover:bg-gray-50">
      <td className="px-6 py-3.5">
        <Badge variant={severityVariant[event.severity] ?? 'default'}>{event.severity}</Badge>
      </td>
      <td className="px-6 py-3.5 font-medium text-gray-700">
        {typeLabel[event.type] ?? event.type}
      </td>
      <td className="px-6 py-3.5 text-sm text-gray-600 max-w-xs truncate">{event.description}</td>
      <td className="px-6 py-3.5 font-mono text-xs text-gray-400">{event.ipAddress ?? '—'}</td>
      <td className="px-6 py-3.5 text-xs text-gray-400 whitespace-nowrap">
        {formatDistanceToNow(event.createdAt)}
      </td>
      <td className="px-6 py-3.5">
        {event.resolvedAt ? (
          <span className="text-xs text-emerald-600 font-medium">Resolved</span>
        ) : (
          <button
            onClick={() => onResolve(event.id)}
            disabled={resolving}
            className="rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-600 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 transition-colors disabled:opacity-40"
          >
            Resolve
          </button>
        )}
      </td>
    </tr>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────────

export function SecurityPage() {
  const [typeFilter, setTypeFilter]         = useState('')
  const [severityFilter, setSeverityFilter] = useState('')
  const [resolvedFilter, setResolvedFilter] = useState('false')

  const { data: summary, isLoading: summaryLoading } = useSecuritySummary()
  const { data: events, isLoading: eventsLoading }   = useSecurityEvents({
    type:     typeFilter     || undefined,
    severity: severityFilter || undefined,
    resolved: resolvedFilter === '' ? undefined : resolvedFilter === 'true',
  })
  const { mutate: resolve, isPending: resolving } = useResolveSecurityEvent()

  const high     = (summary?.bySeverity['HIGH'] ?? 0) + (summary?.bySeverity['CRITICAL'] ?? 0)
  const bruteForce    = summary?.byType['BRUTE_FORCE']    ?? 0
  const accountLocked = summary?.byType['ACCOUNT_LOCKED'] ?? 0

  const statCards = [
    {
      label: 'Unresolved Events',
      value: summary?.unresolved,
      icon: ShieldAlert,
      color: 'text-red-600 bg-red-100',
    },
    {
      label: 'High / Critical',
      value: high,
      icon: AlertTriangle,
      color: 'text-amber-600 bg-amber-100',
    },
    {
      label: 'Brute Force',
      value: bruteForce,
      icon: ShieldCheck,
      color: 'text-blue-600 bg-blue-100',
    },
    {
      label: 'Account Lockouts',
      value: accountLocked,
      icon: Lock,
      color: 'text-purple-600 bg-purple-100',
    },
  ]

  const SEVERITIES = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']
  const TYPES      = ['BRUTE_FORCE', 'ACCOUNT_LOCKED', 'RAPID_ADJUSTMENT', 'AFTER_HOURS']
  const maxSeverity = Math.max(1, ...SEVERITIES.map((s) => summary?.bySeverity[s] ?? 0))
  const maxType     = Math.max(1, ...TYPES.map((t) => summary?.byType[t] ?? 0))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Security Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">Real-time anomaly detection and security event monitoring</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <div className="flex items-center gap-4 p-5">
              <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${color}`}>
                <Icon className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">{label}</p>
                {summaryLoading ? (
                  <div className="mt-1 h-7 w-12 animate-pulse rounded bg-gray-200" />
                ) : (
                  <p className="text-2xl font-bold text-gray-900">{value?.toLocaleString() ?? '—'}</p>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Breakdown row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* By severity */}
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-gray-900">Events by Severity</h2>
          </CardHeader>
          <div className="px-6 py-4 space-y-3">
            {summaryLoading ? <Spinner /> : SEVERITIES.map((s) => {
              const count = summary?.bySeverity[s] ?? 0
              const pct   = Math.round((count / maxSeverity) * 100)
              return (
                <div key={s} className="flex items-center gap-3">
                  <span className="w-20 text-xs font-medium text-gray-500">{s}</span>
                  <div className="flex-1 rounded-full bg-gray-100 h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${severityBar[s]}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-6 text-right text-xs font-semibold text-gray-700">{count}</span>
                </div>
              )
            })}
          </div>
        </Card>

        {/* By type */}
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-gray-900">Events by Type</h2>
          </CardHeader>
          <div className="px-6 py-4 space-y-3">
            {summaryLoading ? <Spinner /> : TYPES.map((t) => {
              const count = summary?.byType[t] ?? 0
              const pct   = Math.round((count / maxType) * 100)
              return (
                <div key={t} className="flex items-center gap-3">
                  <span className="w-36 text-xs font-medium text-gray-500 truncate">{typeLabel[t]}</span>
                  <div className="flex-1 rounded-full bg-gray-100 h-2">
                    <div
                      className="h-2 rounded-full bg-brand-500 transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-6 text-right text-xs font-semibold text-gray-700">{count}</span>
                </div>
              )
            })}
          </div>
        </Card>
      </div>

      {/* Events table */}
      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold text-gray-900">
            {events ? `${events.meta.total} event${events.meta.total !== 1 ? 's' : ''}` : 'Events'}
          </h2>
          <div className="flex flex-wrap gap-2">
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
            >
              <option value="">All severities</option>
              {SEVERITIES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
            >
              <option value="">All types</option>
              {TYPES.map((t) => <option key={t} value={t}>{typeLabel[t]}</option>)}
            </select>
            <select
              value={resolvedFilter}
              onChange={(e) => setResolvedFilter(e.target.value)}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
            >
              <option value="false">Unresolved</option>
              <option value="true">Resolved</option>
              <option value="">All</option>
            </select>
          </div>
        </CardHeader>

        {eventsLoading ? (
          <Spinner />
        ) : !events?.data.length ? (
          <EmptyState icon={ShieldCheck} title="No events found" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-100 bg-gray-50">
                <tr>
                  {['Severity', 'Type', 'Description', 'IP', 'When', ''].map((h) => (
                    <th key={h} className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {events.data.map((event) => (
                  <EventRow key={event.id} event={event} onResolve={resolve} resolving={resolving} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
