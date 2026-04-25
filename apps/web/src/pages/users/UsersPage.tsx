import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Users, UserPlus } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardHeader } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { useUsers, useRoles } from '@/hooks/use-users'
import { formatDate } from '@/lib/utils'
import apiClient from '@/lib/api-client'
import type { ApiResponse, User } from '@/types/api.types'
import toast from 'react-hot-toast'

const createUserSchema = z.object({
  firstName: z.string().min(1, 'Required'),
  lastName: z.string().min(1, 'Required'),
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Minimum 8 characters'),
  roleId: z.string().min(1, 'Select a role'),
})
type CreateUserForm = z.infer<typeof createUserSchema>

const roleVariant: Record<string, 'danger' | 'info' | 'default'> = {
  admin: 'danger',
  warehouse_manager: 'info',
  picker: 'default',
}

export function UsersPage() {
  const [modalOpen, setModalOpen] = useState(false)
  const queryClient = useQueryClient()
  const { data, isLoading } = useUsers()
  const { data: roles } = useRoles()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateUserForm>({ resolver: zodResolver(createUserSchema) })

  const { mutate: createUser, isPending } = useMutation({
    mutationFn: async (body: CreateUserForm) => {
      const { data } = await apiClient.post<ApiResponse<User>>('/api/v1/auth/register', body)
      return data.data
    },
    onSuccess: (user) => {
      toast.success(`User ${user.firstName} ${user.lastName} created`)
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setModalOpen(false)
      reset()
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg ?? 'Failed to create user')
    },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Users</h1>
          <p className="mt-1 text-sm text-gray-500">Manage system users and their role assignments</p>
        </div>
        <Button onClick={() => setModalOpen(true)}>
          <UserPlus className="h-4 w-4" /> Add User
        </Button>
      </div>

      <Card>
        <CardHeader>
          <p className="text-sm font-medium text-gray-500">
            {data ? `${data.meta.total} user${data.meta.total !== 1 ? 's' : ''}` : ''}
          </p>
        </CardHeader>
        {isLoading ? (
          <Spinner />
        ) : !data?.data.length ? (
          <EmptyState icon={Users} title="No users found" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-100 bg-gray-50">
                <tr>
                  {['Name', 'Email', 'Role', 'Status', 'Joined'].map((h) => (
                    <th
                      key={h}
                      className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data.data.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">
                          {user.firstName[0]}{user.lastName[0]}
                        </div>
                        <span className="font-medium text-gray-900">
                          {user.firstName} {user.lastName}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-600">{user.email}</td>
                    <td className="px-6 py-4">
                      <Badge variant={roleVariant[user.role.name] ?? 'default'}>
                        {user.role.name.replace('_', ' ')}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={user.isActive ? 'success' : 'danger'}>
                        {user.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-gray-500">{formatDate(user.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Create user modal */}
      <Modal isOpen={modalOpen} onClose={() => { setModalOpen(false); reset() }} title="Add New User">
        <form onSubmit={handleSubmit((d) => createUser(d))} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="First Name *"
              {...register('firstName')}
              error={errors.firstName?.message}
            />
            <Input
              label="Last Name *"
              {...register('lastName')}
              error={errors.lastName?.message}
            />
          </div>
          <Input
            label="Email *"
            type="email"
            {...register('email')}
            error={errors.email?.message}
          />
          <Input
            label="Password *"
            type="password"
            placeholder="Min 8 characters"
            {...register('password')}
            error={errors.password?.message}
          />
          <div>
            <label className="text-sm font-medium text-gray-700">Role *</label>
            <select
              {...register('roleId')}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
            >
              <option value="">Select role...</option>
              {roles?.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name.replace('_', ' ')}
                </option>
              ))}
            </select>
            {errors.roleId && <p className="mt-1 text-xs text-red-600">{errors.roleId.message}</p>}
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => { setModalOpen(false); reset() }}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isPending}>
              Create User
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
