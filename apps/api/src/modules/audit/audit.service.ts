import { db } from '../../config/database'

interface CreateAuditLogInput {
  userId?: string
  action: string
  resource: string
  resourceId?: string
  before?: unknown
  after?: unknown
  ipAddress?: string
  userAgent?: string
}

export async function createAuditLog(input: CreateAuditLogInput) {
  return db.auditLog.create({
    data: {
      userId: input.userId,
      action: input.action,
      resource: input.resource,
      resourceId: input.resourceId,
      before: input.before ? (input.before as object) : undefined,
      after: input.after ? (input.after as object) : undefined,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
    },
  })
}

export async function getAuditLogs(opts: {
  resource?: string
  resourceId?: string
  userId?: string
  skip: number
  take: number
}) {
  const where = {
    ...(opts.resource && { resource: opts.resource }),
    ...(opts.resourceId && { resourceId: opts.resourceId }),
    ...(opts.userId && { userId: opts.userId }),
  }

  const [items, total] = await Promise.all([
    db.auditLog.findMany({
      where,
      skip: opts.skip,
      take: opts.take,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
      },
    }),
    db.auditLog.count({ where }),
  ])

  return { items, total }
}
