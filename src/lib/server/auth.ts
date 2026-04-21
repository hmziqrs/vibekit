import { getRequestEvent } from '$app/server'
import { env } from '$env/dynamic/private'
import { getDb } from '$lib/server/db'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { betterAuth } from 'better-auth/minimal'
import { sveltekitCookies } from 'better-auth/svelte-kit'
import { uuidv7 } from 'uuidv7'

const authConfig = {
  baseURL: env.ORIGIN,
  secret: env.BETTER_AUTH_SECRET,
  emailAndPassword: { enabled: true },
  user: {
    additionalFields: {
      displayName: {
        type: 'string',
        required: false,
        input: false,
      },
      role: {
        type: ['user', 'admin'],
        required: false,
        defaultValue: 'user',
        input: false,
      },
      status: {
        type: ['active', 'suspended'],
        required: false,
        defaultValue: 'active',
        input: false,
      },
      lastLoginAt: {
        type: 'date',
        required: false,
        input: false,
      },
      deletedAt: {
        type: 'date',
        required: false,
        input: false,
      },
    },
  },
  advanced: {
    database: {
      generateId: () => uuidv7(),
    },
  },
  plugins: [
    sveltekitCookies(getRequestEvent), // make sure this is the last plugin in the array
  ],
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
