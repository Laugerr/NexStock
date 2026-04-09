import Fastify from 'fastify'
import { env } from './config/env'

// Plugins
import corsPlugin from './plugins/cors'
import jwtPlugin from './plugins/jwt'
import errorHandlerPlugin from './plugins/error-handler'

// Routes
import { healthRoutes } from './modules/health/health.route'
import { authRoutes } from './modules/auth/auth.route'
import { userRoutes } from './modules/users/users.route'
import { warehouseRoutes } from './modules/warehouses/warehouses.route'
import { productRoutes } from './modules/products/products.route'
import { inventoryRoutes } from './modules/inventory/inventory.route'
import { stockMovementRoutes } from './modules/stock-movements/stock-movements.route'
import { auditRoutes } from './modules/audit/audit.route'

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
    trustProxy: true,
  })

  // ── Global plugins ─────────────────────────────────────────────────────────
  await app.register(corsPlugin)
  await app.register(jwtPlugin)
  await app.register(errorHandlerPlugin)

  // ── Routes ─────────────────────────────────────────────────────────────────
  await app.register(healthRoutes, { prefix: '/health' })

  // API v1
  await app.register(
    async (v1) => {
      await v1.register(authRoutes, { prefix: '/auth' })
      await v1.register(userRoutes, { prefix: '/users' })
      await v1.register(warehouseRoutes, { prefix: '/warehouses' })
      await v1.register(productRoutes, { prefix: '/products' })
      await v1.register(inventoryRoutes, { prefix: '/inventory' })
      await v1.register(stockMovementRoutes, { prefix: '/stock-movements' })
      await v1.register(auditRoutes, { prefix: '/audit' })
    },
    { prefix: '/api/v1' },
  )

  return app
}
