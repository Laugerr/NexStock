import Redis from 'ioredis'
import { env } from './env'

let redis: Redis | null = null

export function getRedis(): Redis {
  if (!redis) {
    redis = new Redis(env.REDIS_URL, {
      lazyConnect: true,
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        if (times > 3) {
          // Stop retrying after 3 attempts in dev — don't crash the app
          return null
        }
        return Math.min(times * 100, 2000)
      },
    })

    redis.on('connect', () => console.info('Redis connected'))
    redis.on('error', (err) => console.error('Redis error:', err.message))
  }

  return redis
}

export async function closeRedis() {
  if (redis) {
    await redis.quit()
    redis = null
  }
}
