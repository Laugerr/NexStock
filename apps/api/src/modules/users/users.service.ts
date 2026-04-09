import { db } from '../../config/database'
import { NotFoundError } from '../../shared/errors/app-error'
import type { UpdateUserInput } from './users.schema'

const userSelect = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  isActive: true,
  createdAt: true,
  role: { select: { id: true, name: true } },
}

export async function getUsers(opts: { skip: number; take: number }) {
  const [items, total] = await Promise.all([
    db.user.findMany({
      skip: opts.skip,
      take: opts.take,
      orderBy: { createdAt: 'desc' },
      select: userSelect,
    }),
    db.user.count(),
  ])

  return { items, total }
}

export async function getUserById(id: string) {
  const user = await db.user.findUnique({ where: { id }, select: userSelect })
  if (!user) throw new NotFoundError('User', id)
  return user
}

export async function updateUser(id: string, input: UpdateUserInput) {
  const user = await db.user.findUnique({ where: { id } })
  if (!user) throw new NotFoundError('User', id)

  return db.user.update({
    where: { id },
    data: input,
    select: userSelect,
  })
}

export async function getRoles() {
  return db.role.findMany({ orderBy: { name: 'asc' } })
}
