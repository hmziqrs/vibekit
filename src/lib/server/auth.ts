import { getRequestEvent } from '$app/server'
import { env } from '$env/dynamic/private'
import { getDb } from '$lib/server/db'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { betterAuth } from 'better-auth/minimal'
import { sveltekitCookies } from 'better-auth/svelte-kit'
import { uuidv7 } from 'uuidv7'

const authConfig = {
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
  plugins: [
    sveltekitCookies(getRequestEvent), // make sure this is the last plugin in the array
  ],
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
} satisfies Omit<Parameters<typeof betterAuth>[0], 'database'>

export const createAuth = (d1: D1Database) =>
  betterAuth({
    ...authConfig,
    database: drizzleAdapter(getDb(d1), { provider: 'sqlite' }),
  })

/**
 * DO NOT USE!
 *
 * This instance is used by the `better-auth` CLI for schema generation ONLY.
 * To access `auth` at runtime, use `event.locals.auth`.
 */
export const auth = createAuth(null!)
