import { useState, useCallback } from 'react'
import { Plus, Trash2, ShoppingCart, ScanLine } from 'lucide-react'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { BarcodeInput } from '@/components/ui/BarcodeInput'
import { useInventory } from '@/hooks/use-inventory'
import { useCreateStockMovement } from '@/hooks/use-stock-movements'
import { useBarcodeProductLookup } from '@/hooks/use-locations'
import type { InventoryItem } from '@/types/api.types'
import toast from 'react-hot-toast'

interface PickLine {
  id: string
  productId: string
  sku: string
  name: string
  unit: string
  fromLocationId: string
  fromLocationCode: string
  quantity: number
  maxQty: number
}

export function PickPackPage() {
  const [orderRef, setOrderRef] = useState('')
  const [lines, setLines] = useState<PickLine[]>([])
  const [lastPickRef, setLastPickRef] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [search, setSearch] = useState('')

  const { data: inventoryData, isLoading } = useInventory({ search: search || undefined, limit: 50 })
  const { mutateAsync: createMovement } = useCreateStockMovement()
  const lookupProduct = useBarcodeProductLookup()

  const addLine = (inv: InventoryItem) => {
    if (!inv) return
    const available = inv.quantity - inv.reservedQty
    if (available <= 0) { toast.error('No available stock at this location'); return }
    const exists = lines.find((l) => l.productId === inv.product.id && l.fromLocationId === inv.location.id)
    if (exists) { toast.error('Already added'); return }
    setLines((prev) => [...prev, {
      id: crypto.randomUUID(),
      productId: inv.product.id,
      sku: inv.product.sku,
      name: inv.product.name,
      unit: inv.product.unit,
      fromLocationId: inv.location.id,
      fromLocationCode: inv.location.code,
      quantity: 1,
      maxQty: available,
    }])
  }

  const handleBarcodeScan = useCallback(async (barcode: string) => {
    const product = await lookupProduct(barcode)
    if (!product) { toast.error(`No product found for barcode: ${barcode}`); return }
    setSearch(product.sku)
    toast.success(`Searching for ${product.sku}...`)
  }, [lookupProduct])

  const updateQty = (id: string, qty: number) =>
    setLines((prev) => prev.map((l) => l.id === id ? { ...l, quantity: Math.min(l.maxQty, Math.max(1, qty)) } : l))

  const removeLine = (id: string) => setLines((prev) => prev.filter((l) => l.id !== id))

  const handleSubmit = async () => {
    if (!orderRef.trim()) { toast.error('Enter an order reference'); return }
    if (lines.length === 0) { toast.error('Add at least one pick line'); return }

    setIsSubmitting(true)
    let successCount = 0

    for (const line of lines) {
      try {
        await createMovement({
          type: 'PICK',
          productId: line.productId,
          fromLocationId: line.fromLocationId,
          quantity: line.quantity,
          reference: orderRef.trim(),
        })
        successCount++
      } catch {
        toast.error(`Failed to pick ${line.name}`)
      }
    }

    if (successCount > 0) {
      toast.success(`Pick complete — ${successCount} line(s) picked for ${orderRef}`)
      setLastPickRef(orderRef)
      setLines([])
      setOrderRef('')
    }
    setIsSubmitting(false)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Pick & Pack</h1>
        <p className="mt-1 text-sm text-gray-500">Pick stock from storage for fulfillment</p>
      </div>

      {lastPickRef && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 flex items-center gap-3">
          <ShoppingCart className="h-5 w-5 text-emerald-600 shrink-0" />
          <p className="text-sm text-emerald-800 font-medium">
            Pick complete for order <span className="font-mono">{lastPickRef}</span>
          </p>
          <button onClick={() => setLastPickRef(null)} className="ml-auto text-emerald-400">×</button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Search & add */}
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-gray-900">Find Stock</h2>
          </CardHeader>
          <div className="p-5 space-y-4">
            <BarcodeInput
              label="Scan product barcode"
              onScan={handleBarcodeScan}
            />
            <Input
              label="Or search by product name / SKU"
              placeholder="Widget A..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            {isLoading ? <Spinner label="Searching..." /> : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {inventoryData?.data.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">No stock found</p>
                ) : (
                  inventoryData?.data.map((inv) => {
                    const available = inv.quantity - inv.reservedQty
                    return (
                      <div
                        key={inv.id}
                        className="flex items-center gap-3 rounded-lg border border-gray-200 p-3 hover:bg-gray-50"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 text-sm truncate">{inv.product.name}</p>
                          <p className="text-xs text-gray-400 font-mono">{inv.product.sku} · {inv.location.code}</p>
                        </div>
                        <Badge variant={available > 0 ? 'success' : 'danger'}>
                          {available} avail
                        </Badge>
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={available <= 0}
                          onClick={() => addLine(inv)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    )
                  })
                )}
              </div>
            )}
          </div>
        </Card>

        {/* Pick list */}
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-gray-900">Pick List</h2>
            <span className="text-sm text-gray-500">{lines.length} line(s)</span>
          </CardHeader>
          <div className="p-5 space-y-4">
            <Input
              label="Order Reference *"
              placeholder="ORD-12345"
              value={orderRef}
              onChange={(e) => setOrderRef(e.target.value)}
            />

            {lines.length === 0 ? (
              <EmptyState
                icon={ScanLine}
                title="No pick lines"
                description="Search for products on the left to add pick lines"
              />
            ) : (
              <div className="space-y-2">
                {lines.map((line) => (
                  <div key={line.id} className="flex items-center gap-3 rounded-lg border border-gray-200 p-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 text-sm truncate">{line.name}</p>
                      <p className="text-xs text-gray-400 font-mono">{line.sku} · From: <strong>{line.fromLocationCode}</strong></p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => updateQty(line.id, line.quantity - 1)} className="h-6 w-6 rounded border border-gray-300 text-sm hover:bg-gray-100">−</button>
                      <input
                        type="number"
                        value={line.quantity}
                        onChange={(e) => updateQty(line.id, parseInt(e.target.value) || 1)}
                        className="w-14 rounded border border-gray-300 px-1 py-0.5 text-center text-sm focus:outline-none"
                      />
                      <button onClick={() => updateQty(line.id, line.quantity + 1)} className="h-6 w-6 rounded border border-gray-300 text-sm hover:bg-gray-100">+</button>
                    </div>
                    <button onClick={() => removeLine(line.id)} className="text-red-400 hover:text-red-600">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}

                <div className="border-t pt-3 flex items-center justify-between">
                  <p className="text-sm text-gray-500">
                    Total: <strong>{lines.reduce((s, l) => s + l.quantity, 0)} units</strong>
                  </p>
                  <Button onClick={handleSubmit} isLoading={isSubmitting}>
                    <ShoppingCart className="h-4 w-4" /> Complete Pick
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}
