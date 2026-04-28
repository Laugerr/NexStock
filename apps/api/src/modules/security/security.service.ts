import { db } from '../../config/database'

// ── Constants ──────────────────────────────────────────────────────────────────
const BRUTE_FORCE_WINDOW_MS = 10 * 60 * 1000   // 10 minutes
const BRUTE_FORCE_THRESHOLD = 10               // failed attempts from same IP
const RAPID_ADJ_WINDOW_MS   = 5 * 60 * 1000   // 5 minutes
const RAPID_ADJ_THRESHOLD   = 5               // adjustments by same user
const DEDUP_WINDOW_MS       = 60 * 60 * 1000  // 1 hour — suppress duplicate events

// ── Helpers ────────────────────────────────────────────────────────────────────
async function isDuplicate(type: string, key: string): Promise<boolean> {
  const since = new Date(Date.now() - DEDUP_WINDOW_MS)
  const existing = await db.securityEvent.findFirst({
    where: {
      type,
      createdAt: { gte: since },
      OR: [{ ipAddress: key }, { userId: key }],
    },
  })
  return !!existing
}

async function createEvent(data: {
  type: string
  severity: string
  userId?: string
  ipAddress?: string
  description: string
  metadata?: object
}) {
  return db.securityEvent.create({ data })
}

// ── Detectors (all fire-and-forget) ───────────────────────────────────────────

export async function detectBruteForce(ipAddress: string): Promise<void> {
  if (!ipAddress) return
  const since = new Date(Date.now() - BRUTE_FORCE_WINDOW_MS)
  const count = await db.auditLog.count({
    where: { action: 'FAILED_LOGIN', ipAddress, createdAt: { gte: since } },
  })
  if (count < BRUTE_FORCE_THRESHOLD) return
  if (await isDuplicate('BRUTE_FORCE', ipAddress)) return
  await createEvent({
    type: 'BRUTE_FORCE',
    severity: 'HIGH',
    ipAddress,
    description: `${count} failed login attempts from IP ${ipAddress} in the last 10 minutes.`,
    metadata: { failedAttempts: count, windowMinutes: 10 },
  })
}

export async function detectAccountLocked(userId: string, ipAddress?: string): Promise<void> {
  await createEvent({
    type: 'ACCOUNT_LOCKED',
    severity: 'MEDIUM',
    userId,
    ipAddress,
    description: `Account locked after ${5} consecutive failed login attempts.`,
    metadata: { maxAttempts: 5, lockDurationMinutes: 15 },
  })
}

export async function detectRapidAdjustments(userId: string): Promise<void> {
  const since = new Date(Date.now() - RAPID_ADJ_WINDOW_MS)
  const count = await db.stockMovement.count({
    where: { type: 'ADJUSTMENT', performedById: userId, createdAt: { gte: since } },
  })
  if (count < RAPID_ADJ_THRESHOLD) return
  if (await isDuplicate('RAPID_ADJUSTMENT', userId)) return
  await createEvent({
    type: 'RAPID_ADJUSTMENT',
    severity: 'MEDIUM',
    userId,
    description: `${count} stock adjustments by the same user in the last 5 minutes.`,
    metadata: { adjustmentCount: count, windowMinutes: 5 },
  })
}

export async function detectAfterHours(userId: string, ipAddress?: string): Promise<void> {
  const hour = new Date().getUTCHours()
  const isAfterHours = hour < 6 || hour >= 22
  if (!isAfterHours) return
  await createEvent({
    type: 'AFTER_HOURS',
    severity: 'LOW',
    userId,
    ipAddress,
    description: `Login detected outside business hours (UTC ${String(hour).padStart(2, '0')}:xx).`,
    metadata: { utcHour: hour },
  })
}

// ── CRUD ───────────────────────────────────────────────────────────────────────

export async function getSecurityEvents(opts: {
  skip: number
  take: number
  type?: string
  severity?: string
  resolved?: boolean
}) {
  const where = {
    ...(opts.type && { type: opts.type }),
    ...(opts.severity && { severity: opts.severity }),
    ...(opts.resolved === true  && { resolvedAt: { not: null } }),
    ...(opts.resolved === false && { resolvedAt: null }),
  }

  const [items, total] = await Promise.all([
    db.securityEvent.findMany({
      where,
      skip: opts.skip,
      take: opts.take,
      orderBy: { createdAt: 'desc' },
    }),
    db.securityEvent.count({ where }),
  ])

  return { items, total }
}

export async function getSecuritySummary() {
  const [total, unresolved, bySeverity, byType, recentEvents] = await Promise.all([
    db.securityEvent.count(),
    db.securityEvent.count({ where: { resolvedAt: null } }),
    db.securityEvent.groupBy({ by: ['severity'], _count: { id: true } }),
    db.securityEvent.groupBy({ by: ['type'], _count: { id: true } }),
    db.securityEvent.findMany({
      where: { resolvedAt: null },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
  ])

  return {
    total,
    unresolved,
    bySeverity: Object.fromEntries(bySeverity.map((r) => [r.severity, r._count.id])),
    byType: Object.fromEntries(byType.map((r) => [r.type, r._count.id])),
    recentEvents,
  }
}

export async function resolveSecurityEvent(id: string) {
  return db.securityEvent.update({
    where: { id },
    data: { resolvedAt: new Date() },
  })
}
