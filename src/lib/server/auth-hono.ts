import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { betterAuth } from 'better-auth/minimal'

import { authConfig } from './auth'
import type { AppDb } from './services/types'

export const createAuthForHono = (db: AppDb) =>
  betterAuth({
    ...authConfig,
    database: drizzleAdapter(db, { provider: 'sqlite' }),
    plugins: [], // Intentionally no sveltekitCookies — Hono owns the response
  })
