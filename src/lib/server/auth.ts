import { getRequestEvent } from '$app/server'
import { env } from '$env/dynamic/private'
import { createLogger } from '$lib/server/logger'
import { passkey } from '@better-auth/passkey'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { betterAuth } from 'better-auth/minimal'
import { twoFactor } from 'better-auth/plugins'
import { sveltekitCookies } from 'better-auth/svelte-kit'
import { uuidv7 } from 'uuidv7'

import type { EmailService } from './email/index'
import type { AppDb } from './services/types'

const logger = createLogger('auth')

let _emailService: EmailService | null = null

export function setEmailService(service: EmailService): void {
  _emailService = service
}

export const authConfig = {
  account: {
    accountLinking: {
      allowDifferentEmails: false,
      enabled: true,
      trustedProviders: ['google', 'github', 'email-password'] as const,
    },
    encryptOAuthTokens: true,
  },
  advanced: {
    // CSRF protection is enabled by default (disableCSRFCheck: false,
    // DisableOriginCheck: false). Better Auth validates the Origin header
    // Against baseURL for all mutation requests.
    database: {
      generateId: () => uuidv7(),
    },
    // Cookie security — Better Auth auto-detects HTTPS for Secure flag
    defaultCookieAttributes: {
      httpOnly: true,
      path: '/',
      sameSite: 'lax' as const,
    },
  },
  baseURL: env.ORIGIN,
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    sendResetPassword: async ({ url, user }) => {
      if (_emailService) {
        await _emailService.sendPasswordReset(user.email, url, user.name ?? undefined)
      } else {
        logger.info('Password reset URL (no email service)', { email: user.email, url })
      }
    },
  },
  emailVerification: {
    sendVerificationEmail: async ({ url, user }) => {
      if (_emailService) {
        await _emailService.sendEmailVerification(user.email, url, user.name ?? undefined)
      } else {
        logger.info('Email verification URL (no email service)', { email: user.email, url })
      }
    },
  },
  rateLimit: {
    customRules: {
      '/forget-password': { max: 3, window: 600 },
      '/reset-password': { max: 5, window: 600 },
      '/sign-in/email': { max: 5, window: 60 },
      '/sign-up/email': { max: 3, window: 60 },
    },
    enabled: true,
    max: 20,
    // TODO: Switch to "database" storage after adding rateLimit model to Drizzle schema.
    // Memory storage works for dev/single-instance but doesn't persist across Workers isolates.
    storage: 'memory' as const,
    window: 60,
  },
  secret: env.BETTER_AUTH_SECRET,
  socialProviders: {
    ...(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
      ? {
          google: {
            clientId: env.GOOGLE_CLIENT_ID,
            clientSecret: env.GOOGLE_CLIENT_SECRET,
            prompt: 'select_account' as const,
          },
        }
      : {}),
    ...(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET
      ? {
          github: {
            clientId: env.GITHUB_CLIENT_ID,
            clientSecret: env.GITHUB_CLIENT_SECRET,
          },
        }
      : {}),
  },
  user: {
    additionalFields: {
      banExpiresAt: {
        input: false,
        required: false,
        type: 'date',
      },
      banReason: {
        input: false,
        required: false,
        type: 'string',
      },
      bio: {
        input: true,
        required: false,
        type: 'string',
      },
      deletedAt: {
        input: false,
        required: false,
        type: 'date',
      },
      displayName: {
        input: true,
        required: false,
        type: 'string',
      },
      lastLoginAt: {
        input: false,
        required: false,
        type: 'date',
      },
      onboardingCompleted: {
        input: false,
        required: false,
        type: 'boolean',
      },
      onboardingStep: {
        input: false,
        required: false,
        type: 'number',
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
        type: ['active', 'suspended', 'deactivated'],
      },
      timezone: {
        input: true,
        required: false,
        type: 'string',
      },
    },
  },
} satisfies Omit<Parameters<typeof betterAuth>[0], 'database' | 'plugins'>

export const createAuth = (db: AppDb) =>
  betterAuth({
    ...authConfig,
    database: drizzleAdapter(db, { provider: 'sqlite' }),
    plugins: [
      passkey({
        origin: env.ORIGIN,
        rpID: new URL(env.ORIGIN).hostname,
        rpName: 'Vibekit',
      }),
      twoFactor({
        issuer: 'Vibekit',
        totpOptions: {
          digits: 6,
          period: 30,
        },
      }),
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
