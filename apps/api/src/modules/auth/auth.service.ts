import { randomUUID } from 'crypto'
import { FastifyInstance } from 'fastify'
import { db } from '../../config/database'
import { comparePasswords, hashPassword } from '../../shared/utils/password'
import { AccountLockedError, ConflictError, NotFoundError, UnauthorizedError } from '../../shared/errors/app-error'
import { detectAccountLocked } from '../security/security.service'
import type { RegisterInput } from './auth.schema'

const MAX_FAILED_ATTEMPTS = 5
const LOCKOUT_DURATION_MS = 15 * 60 * 1000 // 15 minutes

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

  // Check account lockout
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    const retryAfterSeconds = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 1000)
    throw new AccountLockedError(retryAfterSeconds)
  }

  const isValid = await comparePasswords(password, user.passwordHash)
  if (!isValid) {
    const newFailedAttempts = user.failedLoginAttempts + 1
    const shouldLock = newFailedAttempts >= MAX_FAILED_ATTEMPTS
    await db.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: newFailedAttempts,
        lockedUntil: shouldLock ? new Date(Date.now() + LOCKOUT_DURATION_MS) : undefined,
      },
    })
    if (shouldLock) {
      detectAccountLocked(user.id).catch(() => {})
      throw new AccountLockedError(LOCKOUT_DURATION_MS / 1000)
    }
    throw new UnauthorizedError('Invalid email or password')
  }

  // Successful login — reset lockout state
  await db.user.update({
    where: { id: user.id },
    data: { failedLoginAttempts: 0, lockedUntil: null },
  })

  const token = fastify.jwt.sign({
    sub: user.id,
    email: user.email,
    roleId: user.roleId,
    roleName: user.role.name,
    jti: randomUUID(),
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

export async function revokeToken(jti: string, userId: string, expiresAt: Date) {
  await db.tokenBlacklist.create({ data: { jti, userId, expiresAt } })
  // Fire-and-forget cleanup of expired entries
  db.tokenBlacklist.deleteMany({ where: { expiresAt: { lt: new Date() } } }).catch(() => {})
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
