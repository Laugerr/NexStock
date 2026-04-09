import { Package, Warehouse, ArrowRightLeft, BoxesIcon } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Spinner } from '@/components/ui/Spinner'
import { Badge, movementTypeVariant } from '@/components/ui/Badge'
import { useInventorySummary } from '@/hooks/use-inventory'
import { useStockMovements } from '@/hooks/use-stock-movements'
import { useAuthStore } from '@/store/auth.store'
import { formatDistanceToNow } from '@/lib/utils'

const stats = [
  { key: 'warehouseCount', label: 'Warehouses', icon: Warehouse, color: 'text-blue-600 bg-blue-100' },
  { key: 'totalProducts', label: 'Active Products', icon: Package, color: 'text-emerald-600 bg-emerald-100' },
  { key: 'totalStock', label: 'Total Stock Units', icon: BoxesIcon, color: 'text-purple-600 bg-purple-100' },
  { key: 'totalMovements', label: 'Total Movements', icon: ArrowRightLeft, color: 'text-amber-600 bg-amber-100' },
]

export function DashboardPage() {
  const { user } = useAuthStore()
  const { data: summary, isLoading: summaryLoading } = useInventorySummary()
  const { data: movementsData, isLoading: movementsLoading } = useStockMovements({ limit: 5 })

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Welcome back, {user?.firstName}. Here's what's happening in your warehouse.
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map(({ key, label, icon: Icon, color }) => (
          <Card key={key}>
            <div className="flex items-center gap-4 p-5">
              <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${color}`}>
                <Icon className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">{label}</p>
                {summaryLoading ? (
                  <div className="h-7 w-16 animate-pulse rounded bg-gray-200 mt-1" />
                ) : (
                  <p className="text-2xl font-bold text-gray-900">
                    {summary?.[key as keyof typeof summary]?.toLocaleString() ?? '—'}
                  </p>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Recent movements */}
      <Card>
        <div className="border-b border-gray-100 px-6 py-4">
          <h2 className="text-base font-semibold text-gray-900">Recent Stock Movements</h2>
        </div>
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
  )
}
