import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3001),
  HOST: z.string().default('0.0.0.0'),

  // Must be a valid Postgres URL (pooler URL in production)
  DATABASE_URL: z
    .string()
    .url('DATABASE_URL must be a valid URL')
    .refine(
      (url) => url.startsWith('postgresql://') || url.startsWith('postgres://'),
      'DATABASE_URL must start with postgresql:// or postgres://',
    ),

  // Must be at least 32 chars — generate with: openssl rand -base64 32
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('7d'),

  // Comma-separated list of allowed CORS origins. No wildcards in production.
  CORS_ORIGINS: z.string().default('http://localhost:5173'),

  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace'])
    .default('info'),
})

export type Env = z.infer<typeof envSchema>

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  // Only print field names + messages — never print the actual values
  console.error('❌ Invalid environment variables:')
  console.error(JSON.stringify(parsed.error.flatten().fieldErrors, null, 2))
  process.exit(1)
}

export const env = parsed.data

// ── Production safety guards ────────────────────────────────────────────────
if (env.NODE_ENV === 'production') {
  if (env.CORS_ORIGINS.includes('*')) {
    console.error('❌ CORS_ORIGINS must not contain wildcards in production')
    process.exit(1)
  }

  if (env.CORS_ORIGINS.split(',').some((o) => o.trim().includes('localhost'))) {
    console.warn('⚠️  CORS_ORIGINS contains localhost — is this intentional in production?')
  }
}
