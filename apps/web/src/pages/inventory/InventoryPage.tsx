import { useState } from 'react'
import { BoxesIcon, Search } from 'lucide-react'
import { Card, CardHeader } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { useInventory } from '@/hooks/use-inventory'

export function InventoryPage() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const { data, isLoading } = useInventory({ page, search: search || undefined })
  const totalPages = data?.meta.totalPages ?? 1

  const zoneTypeBadge: Record<string, 'info' | 'success' | 'warning' | 'purple'> = {
    RECEIVING: 'info',
    STORAGE: 'success',
    PICKING: 'warning',
    STAGING: 'purple',
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Inventory</h1>
        <p className="mt-1 text-sm text-gray-500">
          Current stock levels across all locations
        </p>
      </div>

      <Card>
        <CardHeader>
          <p className="text-sm font-medium text-gray-500">
            {data ? `${data.meta.total} stock record${data.meta.total !== 1 ? 's' : ''}` : ''}
          </p>
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              placeholder="Search products..."
              className="w-full rounded-lg border border-gray-300 py-1.5 pl-9 pr-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>
        </CardHeader>

        {isLoading ? (
          <Spinner />
        ) : !data?.data.length ? (
          <EmptyState
            icon={BoxesIcon}
            title="No inventory records"
            description="Stock will appear here after receiving movements are recorded"
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-gray-100 bg-gray-50">
                  <tr>
                    {['SKU', 'Product', 'Category', 'Location', 'Zone', 'Warehouse', 'Qty', 'Reserved', 'Available'].map((h) => (
                      <th key={h} className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {data.data.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-3.5 font-mono text-xs font-semibold text-gray-900">{item.product.sku}</td>
                      <td className="px-6 py-3.5 font-medium text-gray-900 max-w-[160px] truncate">{item.product.name}</td>
                      <td className="px-6 py-3.5">
                        {item.product.category ? <Badge>{item.product.category}</Badge> : <span className="text-gray-400">—</span>}
                      </td>
                      <td className="px-6 py-3.5 font-mono text-xs text-gray-700">{item.location.code}</td>
                      <td className="px-6 py-3.5">
                        <Badge variant={zoneTypeBadge[item.location.zone.type] ?? 'default'}>
                          {item.location.zone.name}
                        </Badge>
                      </td>
                      <td className="px-6 py-3.5 text-gray-700">{item.location.zone.warehouse.code}</td>
                      <td className="px-6 py-3.5 font-semibold text-gray-900">{item.quantity}</td>
                      <td className="px-6 py-3.5 text-amber-600">{item.reservedQty}</td>
                      <td className="px-6 py-3.5 font-semibold text-emerald-700">
                        {item.quantity - item.reservedQty}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-gray-100 px-6 py-4">
                <p className="text-sm text-gray-500">
                  Page {data.meta.page} of {totalPages}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-40 hover:bg-gray-50"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-40 hover:bg-gray-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  )
}
