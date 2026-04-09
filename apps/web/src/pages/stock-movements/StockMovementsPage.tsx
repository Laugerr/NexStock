import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, ArrowRightLeft } from 'lucide-react'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge, movementTypeVariant } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { Modal } from '@/components/ui/Modal'
import { useStockMovements, useCreateStockMovement } from '@/hooks/use-stock-movements'
import { useProducts } from '@/hooks/use-products'
import { formatDistanceToNow } from '@/lib/utils'
import type { MovementType } from '@/types/api.types'

const createSchema = z.object({
  type: z.enum(['RECEIPT', 'PUTAWAY', 'PICK', 'ADJUSTMENT', 'TRANSFER', 'RETURN', 'WRITE_OFF']),
  productId: z.string().uuid('Select a product'),
  toLocationId: z.string().uuid().optional().or(z.literal('')),
  fromLocationId: z.string().uuid().optional().or(z.literal('')),
  quantity: z.coerce.number().int().positive('Must be positive'),
  reference: z.string().optional(),
  notes: z.string().optional(),
})

type CreateForm = z.infer<typeof createSchema>

const MOVEMENT_TYPES: MovementType[] = [
  'RECEIPT', 'PUTAWAY', 'PICK', 'ADJUSTMENT', 'TRANSFER', 'RETURN', 'WRITE_OFF',
]

export function StockMovementsPage() {
  const [modalOpen, setModalOpen] = useState(false)
  const [filterType, setFilterType] = useState<MovementType | ''>('')

  const { data, isLoading } = useStockMovements({
    type: filterType || undefined,
    limit: 20,
  })
  const { mutate: create, isPending } = useCreateStockMovement()
  const { data: productsData } = useProducts({ limit: 100 })

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
    defaultValues: { type: 'RECEIPT' },
  })

  const movementType = watch('type')

  const onSubmit = (values: CreateForm) => {
    create(
      {
        ...values,
        fromLocationId: values.fromLocationId || undefined,
        toLocationId: values.toLocationId || undefined,
      },
      { onSuccess: () => { setModalOpen(false); reset() } },
    )
  }

  const showFrom = ['PICK', 'TRANSFER', 'PUTAWAY', 'WRITE_OFF', 'ADJUSTMENT'].includes(movementType)
  const showTo = ['RECEIPT', 'PUTAWAY', 'TRANSFER', 'RETURN', 'ADJUSTMENT'].includes(movementType)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Stock Movements</h1>
          <p className="mt-1 text-sm text-gray-500">
            Complete history of all inventory movements across the warehouse
          </p>
        </div>
        <Button onClick={() => setModalOpen(true)}>
          <Plus className="h-4 w-4" /> Record Movement
        </Button>
      </div>

      <Card>
        <CardHeader>
          <p className="text-sm font-medium text-gray-500">
            {data ? `${data.meta.total} movement${data.meta.total !== 1 ? 's' : ''}` : ''}
          </p>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as MovementType | '')}
            className="rounded-lg border border-gray-300 py-1.5 pl-3 pr-8 text-sm focus:border-brand-500 focus:outline-none"
          >
            <option value="">All types</option>
            {MOVEMENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </CardHeader>

        {isLoading ? (
          <Spinner />
        ) : !data?.data.length ? (
          <EmptyState
            icon={ArrowRightLeft}
            title="No movements recorded"
            description="Record your first stock movement to begin tracking inventory"
            action={{ label: 'Record Movement', onClick: () => setModalOpen(true) }}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-100 bg-gray-50">
                <tr>
                  {['Type', 'Product', 'From', 'To', 'Qty', 'Reference', 'Performed By', 'When'].map((h) => (
                    <th key={h} className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data.data.map((mv) => (
                  <tr key={mv.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-3.5">
                      <Badge variant={movementTypeVariant[mv.type]}>{mv.type}</Badge>
                    </td>
                    <td className="px-6 py-3.5">
                      <p className="font-medium text-gray-900 truncate max-w-[140px]">{mv.product.name}</p>
                      <p className="text-xs text-gray-400 font-mono">{mv.product.sku}</p>
                    </td>
                    <td className="px-6 py-3.5 font-mono text-xs text-gray-600">{mv.fromLocation?.code ?? '—'}</td>
                    <td className="px-6 py-3.5 font-mono text-xs text-gray-600">{mv.toLocation?.code ?? '—'}</td>
                    <td className="px-6 py-3.5 font-semibold text-gray-900">
                      {mv.quantity} <span className="text-xs font-normal text-gray-500">{mv.product.unit}</span>
                    </td>
                    <td className="px-6 py-3.5 text-gray-500 font-mono text-xs">{mv.reference ?? '—'}</td>
                    <td className="px-6 py-3.5 text-gray-600">
                      {mv.performedBy.firstName} {mv.performedBy.lastName}
                    </td>
                    <td className="px-6 py-3.5 text-gray-400">{formatDistanceToNow(mv.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal isOpen={modalOpen} onClose={() => { setModalOpen(false); reset() }} title="Record Stock Movement" size="lg">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Movement Type *</label>
              <select
                {...register('type')}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
              >
                {MOVEMENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Product *</label>
              <select
                {...register('productId')}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
              >
                <option value="">Select product...</option>
                {productsData?.data.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                ))}
              </select>
              {errors.productId && <p className="text-xs text-red-600">{errors.productId.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {showFrom && (
              <Input
                label="From Location ID"
                placeholder="UUID of source location"
                error={errors.fromLocationId?.message}
                {...register('fromLocationId')}
              />
            )}
            {showTo && (
              <Input
                label="To Location ID"
                placeholder="UUID of destination location"
                error={errors.toLocationId?.message}
                {...register('toLocationId')}
              />
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input label="Quantity *" type="number" min="1" error={errors.quantity?.message} {...register('quantity')} />
            <Input label="Reference" placeholder="GRN-001, ORD-100..." {...register('reference')} />
          </div>

          <Input label="Notes" placeholder="Optional notes..." {...register('notes')} />

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => { setModalOpen(false); reset() }}>Cancel</Button>
            <Button type="submit" isLoading={isPending}>Record Movement</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
