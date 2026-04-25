import { useState } from 'react'
import { ClipboardList, CheckCircle, AlertTriangle } from 'lucide-react'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { useLocations } from '@/hooks/use-locations'
import { useCycleCountPreview, useSubmitCycleCount } from '@/hooks/use-cycle-count'

interface CountEntry {
  productId: string
  sku: string
  name: string
  unit: string
  systemQty: number
  physicalCount: string // string for input control
}

export function CycleCountPage() {
  const [locationId, setLocationId] = useState('')
  const [entries, setEntries] = useState<CountEntry[]>([])
  const [result, setResult] = useState<{
    reference: string
    discrepancyCount: number
    adjustments: { sku: string; name: string; systemQty: number; physicalQty: number; difference: number; adjustmentCreated: boolean }[]
  } | null>(null)
  const [previewLoaded, setPreviewLoaded] = useState(false)

  const { data: allLocations } = useLocations()
  const { data: preview, isLoading: previewLoading } = useCycleCountPreview(locationId)
  const { mutate: submit, isPending } = useSubmitCycleCount()

  // Initialize entries when preview loads
  if (preview && !previewLoaded) {
    setEntries(
      preview.items.map((item) => ({
        productId: item.productId,
        sku: item.sku,
        name: item.name,
        unit: item.unit,
        systemQty: item.systemQty,
        physicalCount: String(item.systemQty),
      })),
    )
    setPreviewLoaded(true)
  }

  const handleLocationChange = (id: string) => {
    setLocationId(id)
    setEntries([])
    setPreviewLoaded(false)
    setResult(null)
  }

  const updateCount = (productId: string, value: string) =>
    setEntries((prev) => prev.map((e) => e.productId === productId ? { ...e, physicalCount: value } : e))

  const handleSubmit = () => {
    if (!locationId) return
    const items = entries.map((e) => ({
      productId: e.productId,
      physicalCount: Math.max(0, parseInt(e.physicalCount) || 0),
    }))

    submit(
      { locationId, items },
      {
        onSuccess: (res) => {
          setResult(res)
          setEntries([])
          setPreviewLoaded(false)
        },
      },
    )
  }

  const discrepancies = entries.filter((e) => parseInt(e.physicalCount) !== e.systemQty)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Cycle Count</h1>
        <p className="mt-1 text-sm text-gray-500">
          Physical inventory count — compare to system and create adjustments for discrepancies
        </p>
      </div>

      {/* Result */}
      {result && (
        <div className={`rounded-xl border p-4 ${result.discrepancyCount === 0 ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}>
          <div className="flex items-start gap-3">
            {result.discrepancyCount === 0 ? (
              <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            )}
            <div className="flex-1">
              <p className="font-semibold text-gray-900">
                Count complete — Ref: <span className="font-mono">{result.reference}</span>
              </p>
              <p className="text-sm text-gray-600">
                {result.discrepancyCount === 0
                  ? 'All quantities match. No adjustments needed.'
                  : `${result.discrepancyCount} discrepancy(ies) found and adjusted.`}
              </p>
              {result.discrepancyCount > 0 && (
                <div className="mt-3 space-y-1">
                  {result.adjustments.filter((a) => a.difference !== 0).map((a) => (
                    <div key={a.sku} className="flex items-center gap-3 text-sm">
                      <span className="font-mono text-gray-600">{a.sku}</span>
                      <span className="text-gray-500">{a.name}</span>
                      <span className="text-gray-400">System: {a.systemQty} → Physical: {a.physicalQty}</span>
                      <Badge variant={a.difference > 0 ? 'success' : 'danger'}>
                        {a.difference > 0 ? '+' : ''}{a.difference}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <button onClick={() => setResult(null)} className="text-gray-400 hover:text-gray-600">×</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Location picker */}
        <Card className="lg:col-span-1">
          <CardHeader><h2 className="text-sm font-semibold text-gray-900">Select Location</h2></CardHeader>
          <div className="p-5 space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Location *</label>
              <select
                value={locationId}
                onChange={(e) => handleLocationChange(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
              >
                <option value="">Select location...</option>
                {allLocations?.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.zone.warehouse.code} › {loc.zone.type} › {loc.code}
                  </option>
                ))}
              </select>
            </div>

            {entries.length > 0 && (
              <>
                <div className="rounded-lg bg-gray-50 border border-gray-200 p-3 space-y-1 text-sm">
                  <div className="flex justify-between text-gray-600">
                    <span>Products</span>
                    <strong>{entries.length}</strong>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Discrepancies</span>
                    <strong className={discrepancies.length > 0 ? 'text-amber-600' : 'text-emerald-600'}>
                      {discrepancies.length}
                    </strong>
                  </div>
                </div>
                <Button
                  className="w-full"
                  onClick={handleSubmit}
                  isLoading={isPending}
                  disabled={entries.length === 0}
                >
                  Submit Count
                </Button>
              </>
            )}
          </div>
        </Card>

        {/* Count sheet */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <h2 className="text-sm font-semibold text-gray-900">Count Sheet</h2>
            {locationId && preview && (
              <span className="text-sm text-gray-500">{preview.location.code}</span>
            )}
          </CardHeader>

          {!locationId ? (
            <EmptyState icon={ClipboardList} title="Select a location" description="Choose a location to begin the cycle count" />
          ) : previewLoading ? (
            <Spinner label="Loading inventory..." />
          ) : entries.length === 0 && previewLoaded ? (
            <EmptyState icon={ClipboardList} title="No stock at this location" description="There are no inventory records at this location" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-gray-100 bg-gray-50">
                  <tr>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-gray-500">SKU</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-gray-500">Product</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold uppercase text-gray-500">System Qty</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold uppercase text-gray-500">Physical Count</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold uppercase text-gray-500">Diff</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {entries.map((entry) => {
                    const physical = parseInt(entry.physicalCount) || 0
                    const diff = physical - entry.systemQty
                    return (
                      <tr key={entry.productId} className={diff !== 0 ? 'bg-amber-50/50' : ''}>
                        <td className="px-5 py-3 font-mono text-xs text-gray-700">{entry.sku}</td>
                        <td className="px-5 py-3 text-gray-900">{entry.name}</td>
                        <td className="px-5 py-3 text-right text-gray-500">{entry.systemQty}</td>
                        <td className="px-5 py-3 text-right">
                          <input
                            type="number"
                            min="0"
                            value={entry.physicalCount}
                            onChange={(e) => updateCount(entry.productId, e.target.value)}
                            className={`w-20 rounded-md border px-2 py-1 text-right text-sm focus:outline-none focus:ring-1 focus:ring-brand-500 ${
                              diff !== 0 ? 'border-amber-400 bg-amber-50' : 'border-gray-300'
                            }`}
                          />
                        </td>
                        <td className="px-5 py-3 text-right">
                          {diff === 0 ? (
                            <span className="text-gray-400">—</span>
                          ) : (
                            <Badge variant={diff > 0 ? 'success' : 'danger'}>
                              {diff > 0 ? '+' : ''}{diff}
                            </Badge>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
