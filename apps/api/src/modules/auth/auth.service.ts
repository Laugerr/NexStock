import { FastifyInstance } from 'fastify'
import { db } from '../../config/database'
import { comparePasswords, hashPassword } from '../../shared/utils/password'
import { ConflictError, NotFoundError, UnauthorizedError } from '../../shared/errors/app-error'
import type { RegisterInput } from './auth.schema'

export async function loginUser(
  fastify: FastifyInstance,
  email: string,
  password: string,
) {
  const user = await db.user.findUnique({
    where: { email: email.toLowerCase().trim() },
    include: { role: true },
  })

  if (!user || !user.isActive) {
    // Avoid email enumeration — same message for both cases
    throw new UnauthorizedError('Invalid email or password')
  }

  const isValid = await comparePasswords(password, user.passwordHash)
  if (!isValid) {
    throw new UnauthorizedError('Invalid email or password')
  }

  const token = fastify.jwt.sign({
    sub: user.id,
    email: user.email,
    roleId: user.roleId,
    roleName: user.role.name,
  })

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role.name,
    },
  }
}

export async function registerUser(input: RegisterInput) {
  const existing = await db.user.findUnique({
    where: { email: input.email.toLowerCase().trim() },
  })

  if (existing) {
    throw new ConflictError('A user with this email already exists')
  }

  // Default to picker role if none provided
  let roleId = input.roleId
  if (!roleId) {
    const pickerRole = await db.role.findUnique({ where: { name: 'picker' } })
    if (!pickerRole) throw new NotFoundError('Default role')
    roleId = pickerRole.id
  }

  const passwordHash = await hashPassword(input.password)

  const user = await db.user.create({
    data: {
      email: input.email.toLowerCase().trim(),
      passwordHash,
      firstName: input.firstName,
      lastName: input.lastName,
      roleId,
    },
    include: { role: true },
  })

  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role.name,
  }
}

export async function getCurrentUser(userId: string) {
  const user = await db.user.findUnique({
    where: { id: userId },
    include: {
      role: {
        include: {
          rolePermissions: { include: { permission: true } },
        },
      },
    },
  })

  if (!user || !user.isActive) {
    throw new UnauthorizedError('User not found or inactive')
  }

  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role.name,
    permissions: user.role.rolePermissions.map(
      (rp) => `${rp.permission.action}:${rp.permission.resource}`,
    ),
  }
}
