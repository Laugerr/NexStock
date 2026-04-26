import { Package, Warehouse, BoxesIcon, TrendingUp } from 'lucide-react'
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { Card, CardHeader } from '@/components/ui/Card'
import { Spinner } from '@/components/ui/Spinner'
import { Badge, movementTypeVariant } from '@/components/ui/Badge'
import { useStockMovements } from '@/hooks/use-stock-movements'
import { useDashboardSummary, useMovementTrend, useMovementsByType, useStockByCategory } from '@/hooks/use-reports'
import { useAuthStore } from '@/store/auth.store'
import { formatDistanceToNow } from '@/lib/utils'

const PIE_COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#0ea5e9', '#a855f7']

export function DashboardPage() {
  const { user } = useAuthStore()
  const { data: summary, isLoading: summaryLoading } = useDashboardSummary()
  const { data: movementsData, isLoading: movementsLoading } = useStockMovements({ limit: 5 })
  const { data: trend, isLoading: trendLoading } = useMovementTrend(7)
  const { data: byType, isLoading: byTypeLoading } = useMovementsByType()
  const { data: byCategory, isLoading: byCategoryLoading } = useStockByCategory()

  const statCards = [
    {
      label: 'Warehouses',
      value: summary?.warehouseCount,
      icon: Warehouse,
      color: 'text-blue-600 bg-blue-100',
    },
    {
      label: 'Active Products',
      value: summary?.productCount,
      icon: Package,
      color: 'text-emerald-600 bg-emerald-100',
    },
    {
      label: 'Total Stock Units',
      value: summary?.totalStock,
      icon: BoxesIcon,
      color: 'text-purple-600 bg-purple-100',
    },
    {
      label: "Today's Movements",
      value: summary?.todayMovements,
      icon: TrendingUp,
      color: 'text-amber-600 bg-amber-100',
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Welcome back, {user?.firstName}. Here's what's happening in your warehouse.
        </p>
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
                  <div className="mt-1 h-7 w-16 animate-pulse rounded bg-gray-200" />
                ) : (
                  <p className="text-2xl font-bold text-gray-900">
                    {value?.toLocaleString() ?? '—'}
                  </p>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Movement trend — area chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <h2 className="text-sm font-semibold text-gray-900">Movement Trend (Last 7 Days)</h2>
          </CardHeader>
          <div className="px-4 pb-5">
            {trendLoading ? (
              <Spinner label="Loading chart..." />
            ) : !trend?.length ? (
              <div className="flex h-40 items-center justify-center text-sm text-gray-400">
                No movement data yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={trend} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                  <defs>
                    <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                    tickFormatter={(v) => v.slice(5)}
                  />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
                    labelStyle={{ fontWeight: 600 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="#6366f1"
                    strokeWidth={2}
                    fill="url(#colorCount)"
                    name="Movements"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        {/* Stock by category — pie chart */}
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-gray-900">Stock by Category</h2>
          </CardHeader>
          <div className="px-4 pb-5">
            {byCategoryLoading ? (
              <Spinner label="Loading chart..." />
            ) : !byCategory?.length ? (
              <div className="flex h-40 items-center justify-center text-sm text-gray-400">
                No data
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={byCategory}
                    dataKey="total"
                    nameKey="category"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ name, percent }) =>
                      `${name} ${(percent * 100).toFixed(0)}%`
                    }
                    labelLine={false}
                  >
                    {byCategory.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Movements by type — bar chart */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <h2 className="text-sm font-semibold text-gray-900">Movements by Type</h2>
          </CardHeader>
          <div className="px-4 pb-5">
            {byTypeLoading ? (
              <Spinner label="Loading chart..." />
            ) : !byType?.length ? (
              <div className="flex h-40 items-center justify-center text-sm text-gray-400">
                No data
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={byType} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="type" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
                  />
                  <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} name="Count" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        {/* Recent movements */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <h2 className="text-sm font-semibold text-gray-900">Recent Stock Movements</h2>
          </CardHeader>
          {movementsLoading ? (
            <Spinner label="Loading movements..." />
          ) : movementsData?.data.length === 0 ? (
            <div className="py-12 text-center text-sm text-gray-500">No movements recorded yet.</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {movementsData?.data.map((movement) => (
                <div key={movement.id} className="flex items-center gap-4 px-6 py-3">
                  <Badge variant={movementTypeVariant[movement.type]}>{movement.type}</Badge>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium text-gray-900">
                      {movement.product.name}{' '}
                      <span className="font-normal text-gray-500">({movement.product.sku})</span>
                    </p>
                    <p className="text-xs text-gray-500">
                      Qty: {movement.quantity} {movement.product.unit}
                      {movement.reference && ` · Ref: ${movement.reference}`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-400">
                      {movement.performedBy.firstName} {movement.performedBy.lastName}
                    </p>
                    <p className="text-xs text-gray-400">{formatDistanceToNow(movement.createdAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
