import Fastify from 'fastify'
import helmet from '@fastify/helmet'
import { env } from './config/env'

// Plugins
import corsPlugin from './plugins/cors'
import jwtPlugin from './plugins/jwt'
import errorHandlerPlugin from './plugins/error-handler'
import rateLimitPlugin from './plugins/rate-limit'

// Routes
import { healthRoutes } from './modules/health/health.route'
import { authRoutes } from './modules/auth/auth.route'
import { userRoutes } from './modules/users/users.route'
import { warehouseRoutes } from './modules/warehouses/warehouses.route'
import { locationRoutes } from './modules/locations/locations.route'
import { productRoutes } from './modules/products/products.route'
import { inventoryRoutes } from './modules/inventory/inventory.route'
import { stockMovementRoutes } from './modules/stock-movements/stock-movements.route'
import { grnRoutes } from './modules/grn/grn.route'
import { cycleCountRoutes } from './modules/cycle-count/cycle-count.route'
import { auditRoutes } from './modules/audit/audit.route'
import { reportRoutes } from './modules/reports/reports.route'

export async function buildServer() {
  const app = Fastify({
    logger: {
      level: env.LOG_LEVEL,
      ...(env.NODE_ENV === 'development' && {
        transport: {
          target: 'pino-pretty',
          options: { colorize: true, translateTime: 'HH:MM:ss', ignore: 'pid,hostname' },
        },
      }),
    },
    trustProxy: true, // Required: Vercel / proxies set x-forwarded-for
  })

  // ── Security headers ───────────────────────────────────────────────────────
  await app.register(helmet, {
    // Strict CSP for a JSON API — no scripts, no frames, no embeds
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'none'"],
        frameAncestors: ["'none'"],
      },
    },
    hsts: {
      maxAge: 31_536_000, // 1 year
      includeSubDomains: true,
      preload: true,
    },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    frameguard: { action: 'deny' },
    noSniff: true,
  })

  // Permissions-Policy not covered by helmet — add manually
  app.addHook('onSend', async (_request, reply) => {
    reply.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  })

  // ── Global plugins ─────────────────────────────────────────────────────────
  await app.register(corsPlugin)
  await app.register(jwtPlugin)
  await app.register(errorHandlerPlugin)
  await app.register(rateLimitPlugin)

  // ── Routes ─────────────────────────────────────────────────────────────────
  await app.register(
    async (v1) => {
      await v1.register(healthRoutes, { prefix: '/health' })
      await v1.register(authRoutes, { prefix: '/auth' })
      await v1.register(userRoutes, { prefix: '/users' })
      await v1.register(warehouseRoutes, { prefix: '/warehouses' })
      await v1.register(locationRoutes, { prefix: '/locations' })
      await v1.register(productRoutes, { prefix: '/products' })
      await v1.register(inventoryRoutes, { prefix: '/inventory' })
      await v1.register(stockMovementRoutes, { prefix: '/stock-movements' })
      await v1.register(grnRoutes, { prefix: '/grn' })
      await v1.register(cycleCountRoutes, { prefix: '/cycle-count' })
      await v1.register(auditRoutes, { prefix: '/audit' })
      await v1.register(reportRoutes, { prefix: '/reports' })
    },
    { prefix: '/api/v1' },
  )

  return app
}
