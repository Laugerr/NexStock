import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Warehouse } from 'lucide-react'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { Modal } from '@/components/ui/Modal'
import { useWarehouses, useCreateWarehouse } from '@/hooks/use-warehouses'
import { formatDate } from '@/lib/utils'

const createSchema = z.object({
  code: z.string().min(2).regex(/^[A-Z0-9-]+$/, 'Uppercase alphanumeric only'),
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
})

type CreateForm = z.infer<typeof createSchema>

export function WarehousesPage() {
  const [modalOpen, setModalOpen] = useState(false)
  const { data, isLoading } = useWarehouses()
  const { mutate: create, isPending } = useCreateWarehouse()

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
  })

  const onSubmit = (values: CreateForm) => {
    create(values, {
      onSuccess: () => { setModalOpen(false); reset() },
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Warehouses</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your warehouse locations, zones, and storage areas
          </p>
        </div>
        <Button onClick={() => setModalOpen(true)}>
          <Plus className="h-4 w-4" />
          Add Warehouse
        </Button>
      </div>

      <Card>
        <CardHeader>
          <p className="text-sm font-medium text-gray-500">
            {data ? `${data.meta.total} warehouse${data.meta.total !== 1 ? 's' : ''}` : ''}
          </p>
        </CardHeader>
        {isLoading ? (
          <Spinner />
        ) : !data?.data.length ? (
          <EmptyState
            icon={Warehouse}
            title="No warehouses yet"
            description="Create your first warehouse to start managing inventory"
            action={{ label: 'Add Warehouse', onClick: () => setModalOpen(true) }}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-100 bg-gray-50">
                <tr>
                  {['Code', 'Name', 'Location', 'Zones', 'Status', 'Created'].map((h) => (
                    <th key={h} className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data.data.map((wh) => (
                  <tr key={wh.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs font-medium text-gray-900">{wh.code}</td>
                    <td className="px-6 py-4 font-medium text-gray-900">{wh.name}</td>
                    <td className="px-6 py-4 text-gray-500">
                      {[wh.city, wh.country].filter(Boolean).join(', ') || '—'}
                    </td>
                    <td className="px-6 py-4 text-gray-700">{wh._count?.zones ?? 0}</td>
                    <td className="px-6 py-4">
                      <Badge variant={wh.isActive ? 'success' : 'danger'}>
                        {wh.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-gray-500">{formatDate(wh.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal isOpen={modalOpen} onClose={() => { setModalOpen(false); reset() }} title="Add Warehouse">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Code *" placeholder="WH-002" error={errors.code?.message} {...register('code')} />
            <Input label="Name *" placeholder="East Distribution Center" error={errors.name?.message} {...register('name')} />
          </div>
          <Input label="Description" placeholder="Optional description..." {...register('description')} />
          <Input label="Address" placeholder="Street address" {...register('address')} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="City" placeholder="Chicago" {...register('city')} />
            <Input label="Country" placeholder="US" {...register('country')} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => { setModalOpen(false); reset() }}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isPending}>Create Warehouse</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
