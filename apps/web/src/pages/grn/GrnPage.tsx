import { useState, useCallback } from 'react'
import { Plus, Trash2, PackageCheck, ClipboardList } from 'lucide-react'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { BarcodeInput } from '@/components/ui/BarcodeInput'
import { useLocations, useBarcodeProductLookup } from '@/hooks/use-locations'
import { useCreateGrn, useGrnHistory } from '@/hooks/use-grn'
import { formatDistanceToNow } from '@/lib/utils'
import toast from 'react-hot-toast'

interface GrnLine {
  id: string
  productId: string
  sku: string
  name: string
  quantity: number
}

export function GrnPage() {
  const [view, setView] = useState<'form' | 'history'>('form')
  const [locationId, setLocationId] = useState('')
  const [supplier, setSupplier] = useState('')
  const [poRef, setPoRef] = useState('')
  const [lines, setLines] = useState<GrnLine[]>([])
  const [lastResult, setLastResult] = useState<{ reference: string; totalItems: number; totalQuantity: number } | null>(null)

  const { data: receivingLocations } = useLocations({ zoneType: 'RECEIVING' })
  const { data: history, isLoading: historyLoading } = useGrnHistory()
  const { mutate: createGrn, isPending } = useCreateGrn()
  const lookupProduct = useBarcodeProductLookup()

  const handleBarcodeScan = useCallback(async (barcode: string) => {
    const product = await lookupProduct(barcode)
    if (!product) {
      toast.error(`No product found for barcode: ${barcode}`)
      return
    }
    // Check if already in lines
    const existing = lines.find((l) => l.productId === product.id)
    if (existing) {
      setLines((prev) => prev.map((l) => l.productId === product.id ? { ...l, quantity: l.quantity + 1 } : l))
      toast.success(`+1 to ${product.name}`)
    } else {
      setLines((prev) => [...prev, {
        id: crypto.randomUUID(),
        productId: product.id,
        sku: product.sku,
        name: product.name,
        quantity: 1,
      }])
      toast.success(`Added: ${product.name}`)
    }
  }, [lines, lookupProduct])

  const updateQty = (id: string, qty: number) =>
    setLines((prev) => prev.map((l) => l.id === id ? { ...l, quantity: Math.max(1, qty) } : l))

  const removeLine = (id: string) => setLines((prev) => prev.filter((l) => l.id !== id))

  const handleSubmit = () => {
    if (!locationId) { toast.error('Select a receiving location'); return }
    if (lines.length === 0) { toast.error('Add at least one product'); return }

    createGrn(
      {
        locationId,
        supplier: supplier || undefined,
        poReference: poRef || undefined,
        items: lines.map((l) => ({ productId: l.productId, quantity: l.quantity })),
      },
      {
        onSuccess: (result) => {
          setLastResult({ reference: result.reference, totalItems: result.totalItems, totalQuantity: result.totalQuantity })
          setLines([])
          setSupplier('')
          setPoRef('')
          setLocationId('')
        },
      },
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Goods Receipt (GRN)</h1>
          <p className="mt-1 text-sm text-gray-500">Record incoming stock from suppliers</p>
        </div>
        <div className="flex gap-2">
          <Button variant={view === 'form' ? 'primary' : 'secondary'} onClick={() => setView('form')}>
            New GRN
          </Button>
          <Button variant={view === 'history' ? 'primary' : 'secondary'} onClick={() => setView('history')}>
            <ClipboardList className="h-4 w-4" /> History
          </Button>
        </div>
      </div>

      {/* Success banner */}
      {lastResult && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 flex items-start gap-3">
          <PackageCheck className="h-5 w-5 text-emerald-600 mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold text-emerald-800">GRN Created: {lastResult.reference}</p>
            <p className="text-sm text-emerald-700">
              {lastResult.totalItems} product line(s) — {lastResult.totalQuantity} total units received
            </p>
          </div>
          <button onClick={() => setLastResult(null)} className="ml-auto text-emerald-400 hover:text-emerald-600">×</button>
        </div>
      )}

      {view === 'form' ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Header form */}
          <Card className="lg:col-span-1">
            <CardHeader><h2 className="text-sm font-semibold text-gray-900">Receipt Details</h2></CardHeader>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Receiving Location *</label>
                <select
                  value={locationId}
                  onChange={(e) => setLocationId(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
                >
                  <option value="">Select location...</option>
                  {receivingLocations?.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.zone.warehouse.code} › {loc.zone.code} › {loc.code}
                    </option>
                  ))}
                </select>
                {!receivingLocations?.length && (
                  <p className="mt-1 text-xs text-amber-600">No RECEIVING zone locations found. Create zones first.</p>
                )}
              </div>
              <Input label="Supplier" placeholder="Supplier name" value={supplier} onChange={(e) => setSupplier(e.target.value)} />
              <Input label="PO Reference" placeholder="PO-12345" value={poRef} onChange={(e) => setPoRef(e.target.value)} />
            </div>
          </Card>

          {/* Line items */}
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader>
                <h2 className="text-sm font-semibold text-gray-900">Scan Products</h2>
                <span className="text-sm text-gray-500">{lines.length} line(s)</span>
              </CardHeader>
              <div className="p-5 space-y-4">
                <BarcodeInput
                  label="Scan product barcode"
                  placeholder="Scan barcode or type SKU + Enter..."
                  onScan={handleBarcodeScan}
                />

                {lines.length === 0 ? (
                  <div className="rounded-lg border-2 border-dashed border-gray-200 py-10 text-center">
                    <p className="text-sm text-gray-400">Scan a barcode to add products to the receipt</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {lines.map((line) => (
                      <div key={line.id} className="flex items-center gap-3 rounded-lg border border-gray-200 p-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate">{line.name}</p>
                          <p className="text-xs text-gray-400 font-mono">{line.sku}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateQty(line.id, line.quantity - 1)}
                            className="h-7 w-7 rounded-md border border-gray-300 text-gray-600 hover:bg-gray-50 flex items-center justify-center"
                          >−</button>
                          <input
                            type="number"
                            min="1"
                            value={line.quantity}
                            onChange={(e) => updateQty(line.id, parseInt(e.target.value) || 1)}
                            className="w-16 rounded-md border border-gray-300 px-2 py-1 text-center text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
                          />
                          <button
                            onClick={() => updateQty(line.id, line.quantity + 1)}
                            className="h-7 w-7 rounded-md border border-gray-300 text-gray-600 hover:bg-gray-50 flex items-center justify-center"
                          >+</button>
                        </div>
                        <button onClick={() => removeLine(line.id)} className="text-red-400 hover:text-red-600">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}

                    <div className="border-t border-gray-100 pt-3 flex items-center justify-between">
                      <p className="text-sm text-gray-500">
                        Total: <span className="font-semibold text-gray-900">{lines.reduce((s, l) => s + l.quantity, 0)} units</span>
                      </p>
                      <Button onClick={handleSubmit} isLoading={isPending} disabled={lines.length === 0 || !locationId}>
                        <PackageCheck className="h-4 w-4" /> Submit GRN
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      ) : (
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-gray-900">GRN History</h2>
          </CardHeader>
          {historyLoading ? <Spinner /> : !history?.data.length ? (
            <EmptyState icon={PackageCheck} title="No GRNs recorded yet" />
          ) : (
            <div className="divide-y divide-gray-50">
              {history.data.map((grn) => (
                <div key={grn.reference} className="px-6 py-4 hover:bg-gray-50">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-mono font-semibold text-gray-900">{grn.reference}</p>
                      <p className="text-sm text-gray-500">
                        {grn.warehouse} › {grn.location} · {grn.lineCount} line(s) · {grn.totalQuantity} units
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {grn.products.slice(0, 3).map((p) => (
                          <Badge key={p.sku} variant="default">{p.sku} ×{p.quantity}</Badge>
                        ))}
                        {grn.products.length > 3 && (
                          <Badge variant="default">+{grn.products.length - 3} more</Badge>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-gray-400">
                        {grn.performedBy ? `${grn.performedBy.firstName} ${grn.performedBy.lastName}` : 'System'}
                      </p>
                      <p className="text-xs text-gray-400">{formatDistanceToNow(grn.createdAt as unknown as string)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  )
}
