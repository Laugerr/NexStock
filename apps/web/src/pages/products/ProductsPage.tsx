import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Package, Search } from 'lucide-react'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { Modal } from '@/components/ui/Modal'
import { useProducts, useCreateProduct } from '@/hooks/use-products'
import { formatDate } from '@/lib/utils'

const createSchema = z.object({
  sku: z.string().min(2).regex(/^[A-Z0-9-_]+$/, 'Uppercase alphanumeric, dashes, underscores'),
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  barcode: z.string().optional(),
  unit: z.string().default('EACH'),
  category: z.string().optional(),
})

type CreateForm = z.infer<typeof createSchema>

export function ProductsPage() {
  const [modalOpen, setModalOpen] = useState(false)
  const [search, setSearch] = useState('')

  const { data, isLoading } = useProducts({ search: search || undefined })
  const { mutate: create, isPending } = useCreateProduct()

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
    defaultValues: { unit: 'EACH' },
  })

  const onSubmit = (values: CreateForm) => {
    create(values, { onSuccess: () => { setModalOpen(false); reset() } })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Products</h1>
          <p className="mt-1 text-sm text-gray-500">
            Product catalog with SKU management and inventory tracking
          </p>
        </div>
        <Button onClick={() => setModalOpen(true)}>
          <Plus className="h-4 w-4" /> Add Product
        </Button>
      </div>

      <Card>
        <CardHeader>
          <p className="text-sm font-medium text-gray-500">
            {data ? `${data.meta.total} product${data.meta.total !== 1 ? 's' : ''}` : ''}
          </p>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or SKU..."
              className="w-full rounded-lg border border-gray-300 bg-white py-1.5 pl-9 pr-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>
        </CardHeader>
        {isLoading ? (
          <Spinner />
        ) : !data?.data.length ? (
          <EmptyState
            icon={Package}
            title="No products found"
            description={search ? `No results for "${search}"` : 'Add your first product to get started'}
            action={!search ? { label: 'Add Product', onClick: () => setModalOpen(true) } : undefined}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-100 bg-gray-50">
                <tr>
                  {['SKU', 'Name', 'Category', 'Unit', 'Stock Records', 'Status', 'Created'].map((h) => (
                    <th key={h} className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data.data.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs font-semibold text-gray-900">{p.sku}</td>
                    <td className="px-6 py-4 font-medium text-gray-900">{p.name}</td>
                    <td className="px-6 py-4">
                      {p.category ? <Badge variant="default">{p.category}</Badge> : <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-6 py-4 text-gray-500">{p.unit}</td>
                    <td className="px-6 py-4 text-gray-700">{p._count?.inventoryItems ?? 0}</td>
                    <td className="px-6 py-4">
                      <Badge variant={p.isActive ? 'success' : 'danger'}>{p.isActive ? 'Active' : 'Inactive'}</Badge>
                    </td>
                    <td className="px-6 py-4 text-gray-500">{formatDate(p.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal isOpen={modalOpen} onClose={() => { setModalOpen(false); reset() }} title="Add Product">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="SKU *" placeholder="PROD-100" error={errors.sku?.message} {...register('sku')} />
            <Input label="Unit" placeholder="EACH" {...register('unit')} />
          </div>
          <Input label="Name *" placeholder="Product name" error={errors.name?.message} {...register('name')} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Category" placeholder="Electronics" {...register('category')} />
            <Input label="Barcode" placeholder="1234567890" {...register('barcode')} />
          </div>
          <Input label="Description" placeholder="Optional description..." {...register('description')} />
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => { setModalOpen(false); reset() }}>Cancel</Button>
            <Button type="submit" isLoading={isPending}>Create Product</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
