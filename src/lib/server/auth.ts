import { getRequestEvent } from '$app/server'
import { env } from '$env/dynamic/private'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { betterAuth } from 'better-auth/minimal'
import { sveltekitCookies } from 'better-auth/svelte-kit'
import { uuidv7 } from 'uuidv7'

import type { AppDb } from './services/types'

export const authConfig = {
  advanced: {
    database: {
      generateId: () => uuidv7(),
    },
  },
  baseURL: env.ORIGIN,
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    sendResetPassword: async ({ user, url }) => {
      // TODO: Wire to real email service (Resend, SendGrid, etc.)
      console.log(`[dev] Password reset for ${user.email}: ${url}`)
    },
  },
  emailVerification: {
    sendVerificationEmail: async ({ user, url }) => {
      // TODO: Wire to real email service (Resend, SendGrid, etc.)
      console.log(`[dev] Email verification for ${user.email}: ${url}`)
    },
  },
  secret: env.BETTER_AUTH_SECRET,
  user: {
    additionalFields: {
      deletedAt: {
        input: false,
        required: false,
        type: 'date',
      },
      displayName: {
        input: false,
        required: false,
        type: 'string',
      },
      lastLoginAt: {
        input: false,
        required: false,
        type: 'date',
      },
      role: {
        defaultValue: 'user',
        input: false,
        required: false,
        type: ['user', 'admin'],
      },
      status: {
        defaultValue: 'active',
        input: false,
        required: false,
        type: ['active', 'suspended'],
      },
    },
  },
} satisfies Omit<Parameters<typeof betterAuth>[0], 'database' | 'plugins'>

export const createAuth = (db: AppDb) =>
  betterAuth({
    ...authConfig,
    database: drizzleAdapter(db, { provider: 'sqlite' }),
    plugins: [
      sveltekitCookies(getRequestEvent), // Make sure this is the last plugin in the array
    ],
  })

/**
 * DO NOT USE!
 *
 * This instance is used by the `better-auth` CLI for schema generation ONLY.
 * To access `auth` at runtime, use `event.locals.auth`.
 */
export const auth = createAuth(null!)
