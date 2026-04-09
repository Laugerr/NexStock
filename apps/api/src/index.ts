import 'dotenv/config'
import { buildServer } from './server'
import { env } from './config/env'
import { db } from './config/database'
import { closeRedis } from './config/redis'

async function main() {
  const app = await buildServer()

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    app.log.info(`Received ${signal}, shutting down gracefully...`)
    await app.close()
    await db.$disconnect()
    await closeRedis()
    process.exit(0)
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('SIGINT', () => shutdown('SIGINT'))

  try {
    await app.listen({ port: env.PORT, host: env.HOST })
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

main()
