import { useState } from 'react'
import { MoveRight, PackageCheck } from 'lucide-react'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { useInventory } from '@/hooks/use-inventory'
import { useLocations } from '@/hooks/use-locations'
import { useCreateStockMovement } from '@/hooks/use-stock-movements'
import toast from 'react-hot-toast'

interface PutAwayItem {
  inventoryItemId: string
  productId: string
  sku: string
  name: string
  unit: string
  fromLocationId: string
  fromLocationCode: string
  availableQty: number
  quantity: number
  selected: boolean
}

export function PutAwayPage() {
  const [items, setItems] = useState<PutAwayItem[]>([])
  const [targetLocationId, setTargetLocationId] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [initialized, setInitialized] = useState(false)

  const { data: receivingInventory, isLoading } = useInventory({ zoneType: 'RECEIVING', limit: 100 })
  const { data: storageLocations } = useLocations({ zoneType: 'STORAGE' })
  const { mutateAsync: createMovement } = useCreateStockMovement()

  // Initialize items from inventory data
  if (receivingInventory && !initialized) {
    setItems(
      receivingInventory.data.map((inv) => ({
        inventoryItemId: inv.id,
        productId: inv.product.id,
        sku: inv.product.sku,
        name: inv.product.name,
        unit: inv.product.unit,
        fromLocationId: inv.location.id,
        fromLocationCode: inv.location.code,
        availableQty: inv.quantity - inv.reservedQty,
        quantity: inv.quantity - inv.reservedQty,
        selected: false,
      })),
    )
    setInitialized(true)
  }

  const toggleItem = (id: string) =>
    setItems((prev) => prev.map((it) => it.inventoryItemId === id ? { ...it, selected: !it.selected } : it))

  const updateQty = (id: string, qty: number) =>
    setItems((prev) =>
      prev.map((it) =>
        it.inventoryItemId === id
          ? { ...it, quantity: Math.min(it.availableQty, Math.max(1, qty)) }
          : it,
      ),
    )

  const selectedItems = items.filter((i) => i.selected)

  const handleSubmit = async () => {
    if (!targetLocationId) { toast.error('Select a target storage location'); return }
    if (selectedItems.length === 0) { toast.error('Select at least one item to put-away'); return }

    setIsSubmitting(true)
    let successCount = 0

    for (const item of selectedItems) {
      try {
        await createMovement({
          type: 'PUTAWAY',
          productId: item.productId,
          fromLocationId: item.fromLocationId,
          toLocationId: targetLocationId,
          quantity: item.quantity,
          reference: `PUTAWAY-${new Date().toISOString().slice(0, 10)}`,
          notes: `Put-away from ${item.fromLocationCode}`,
        })
        successCount++
      } catch {
        toast.error(`Failed to put-away ${item.name}`)
      }
    }

    if (successCount > 0) {
      toast.success(`Put-away complete — ${successCount} product(s) moved`)
      setItems((prev) => prev.map((it) => ({ ...it, selected: false })))
      setTargetLocationId('')
      setInitialized(false) // re-fetch
    }
    setIsSubmitting(false)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Put-Away</h1>
        <p className="mt-1 text-sm text-gray-500">
          Move received stock from receiving zones to storage locations
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Target location picker */}
        <Card className="lg:col-span-1">
          <CardHeader><h2 className="text-sm font-semibold text-gray-900">Target Location</h2></CardHeader>
          <div className="p-5 space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Storage Location *</label>
              <select
                value={targetLocationId}
                onChange={(e) => setTargetLocationId(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
              >
                <option value="">Select storage location...</option>
                {storageLocations?.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.zone.warehouse.code} › {loc.zone.code} › {loc.code}
                  </option>
                ))}
              </select>
            </div>

            {selectedItems.length > 0 && (
              <div className="rounded-lg bg-brand-50 border border-brand-200 p-3">
                <p className="text-sm font-medium text-brand-800">{selectedItems.length} item(s) selected</p>
                <p className="text-xs text-brand-600">
                  {selectedItems.reduce((s, i) => s + i.quantity, 0)} total units
                </p>
              </div>
            )}

            <Button
              className="w-full"
              onClick={handleSubmit}
              isLoading={isSubmitting}
              disabled={selectedItems.length === 0 || !targetLocationId}
            >
              <MoveRight className="h-4 w-4" /> Execute Put-Away
            </Button>
          </div>
        </Card>

        {/* Receiving inventory */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <h2 className="text-sm font-semibold text-gray-900">Items in Receiving Zones</h2>
            <span className="text-sm text-gray-500">{items.length} item(s)</span>
          </CardHeader>
          {isLoading ? <Spinner /> : items.length === 0 ? (
            <EmptyState
              icon={PackageCheck}
              title="No items in receiving zones"
              description="Receive stock via GRN first"
            />
          ) : (
            <div className="divide-y divide-gray-50">
              {items.map((item) => (
                <div
                  key={item.inventoryItemId}
                  className={`flex items-center gap-4 px-5 py-3.5 cursor-pointer hover:bg-gray-50 transition-colors ${item.selected ? 'bg-brand-50' : ''}`}
                  onClick={() => toggleItem(item.inventoryItemId)}
                >
                  <input
                    type="checkbox"
                    checked={item.selected}
                    onChange={() => toggleItem(item.inventoryItemId)}
                    onClick={(e) => e.stopPropagation()}
                    className="h-4 w-4 rounded border-gray-300 text-brand-600"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{item.name}</p>
                    <p className="text-xs text-gray-400 font-mono">{item.sku} · From: <strong>{item.fromLocationCode}</strong></p>
                  </div>
                  <Badge variant="info">{item.availableQty} {item.unit}</Badge>
                  {item.selected && (
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => updateQty(item.inventoryItemId, item.quantity - 1)}
                        className="h-6 w-6 rounded border border-gray-300 text-xs hover:bg-gray-100"
                      >−</button>
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateQty(item.inventoryItemId, parseInt(e.target.value) || 1)}
                        className="w-14 rounded border border-gray-300 px-1 py-0.5 text-center text-sm focus:outline-none"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <button
                        onClick={() => updateQty(item.inventoryItemId, item.quantity + 1)}
                        className="h-6 w-6 rounded border border-gray-300 text-xs hover:bg-gray-100"
                      >+</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
