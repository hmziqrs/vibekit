import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

const authSource = readFileSync(resolve(process.cwd(), 'src/lib/server/auth.ts'), 'utf8')

describe('auth config structure', () => {
  it('exports authConfig object', () => {
    expect(authSource).toContain('export const authConfig')
  })

  it('exports createAuth factory function', () => {
    expect(authSource).toContain('export const createAuth = (db: AppDb)')
  })

  it('exports setEmailService for dependency injection', () => {
    expect(authSource).toContain('export function setEmailService(service: EmailService)')
  })

  it('uses uuidv7 for ID generation', () => {
    expect(authSource).toContain('uuidv7')
    expect(authSource).toContain('generateId: () => uuidv7()')
  })
})

describe('auth config security', () => {
  it('enables email verification requirement', () => {
    expect(authSource).toContain('requireEmailVerification: true')
  })

  it('enables CSRF protection (default in Better Auth)', () => {
    expect(authSource).toContain('CSRF protection is enabled by default')
  })

  it('sets httpOnly cookies', () => {
    expect(authSource).toContain('httpOnly: true')
  })

  it('uses lax sameSite policy', () => {
    expect(authSource).toContain("sameSite: 'lax'")
  })

  it('encrypts OAuth tokens', () => {
    expect(authSource).toContain('encryptOAuthTokens: true')
  })

  it('uses secret from environment', () => {
    expect(authSource).toContain('secret: env.BETTER_AUTH_SECRET')
  })

  it('sets base URL from environment', () => {
    expect(authSource).toContain('baseURL: env.ORIGIN')
  })
})

describe('rate limiting', () => {
  it('enables rate limiting', () => {
    expect(authSource).toContain('enabled: true')
  })

  it('rate limits sign-in attempts', () => {
    expect(authSource).toContain("'/sign-in/email': { max: 5, window: 60 }")
  })

  it('rate limits sign-up attempts', () => {
    expect(authSource).toContain("'/sign-up/email': { max: 3, window: 60 }")
  })

  it('rate limits forgot-password', () => {
    expect(authSource).toContain("'/forget-password': { max: 3, window: 600 }")
  })

  it('rate limits reset-password', () => {
    expect(authSource).toContain("'/reset-password': { max: 5, window: 600 }")
  })
})

describe('user additional fields', () => {
  it('defines role field with user/admin types', () => {
    expect(authSource).toContain("type: ['user', 'admin']")
    expect(authSource).toContain("defaultValue: 'user'")
  })

  it('defines status field with active/suspended/deactivated', () => {
    expect(authSource).toContain("type: ['active', 'suspended', 'deactivated']")
    expect(authSource).toContain("defaultValue: 'active'")
  })

  it('defines onboardingCompleted as boolean', () => {
    expect(authSource).toContain('onboardingCompleted')
    expect(authSource).toContain("type: 'boolean'")
  })

  it('defines banExpiresAt as date', () => {
    expect(authSource).toContain('banExpiresAt')
    expect(authSource).toContain("type: 'date'")
  })

  it('defines banReason as string', () => {
    expect(authSource).toContain('banReason')
    expect(authSource).toContain("type: 'string'")
  })

  it('marks role and status as non-user-input', () => {
    const roleMatch = authSource.match(/role: \{[\s\S]*?input: (true|false)/)
    expect(roleMatch).not.toBeNull()
    expect(roleMatch![0]).toContain('input: false')
  })
})

describe('social providers', () => {
  it('conditionally includes Google when credentials present', () => {
    expect(authSource).toContain('env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET')
    expect(authSource).toContain('google')
  })

  it('conditionally includes GitHub when credentials present', () => {
    expect(authSource).toContain('env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET')
    expect(authSource).toContain('github')
  })

  it('uses select_account prompt for Google', () => {
    expect(authSource).toContain("prompt: 'select_account'")
  })
})

describe('plugins', () => {
  it('includes passkey plugin', () => {
    expect(authSource).toContain('passkey(')
    expect(authSource).toContain('rpName: ')
  })

  it('includes twoFactor plugin with TOTP options', () => {
    expect(authSource).toContain('twoFactor(')
    expect(authSource).toContain('digits: 6')
    expect(authSource).toContain('period: 30')
  })

  it('includes sveltekitCookies plugin', () => {
    expect(authSource).toContain('sveltekitCookies(getRequestEvent)')
    expect(authSource).toContain('// Make sure this is the last plugin in the array')
  })
})

describe('account linking', () => {
  it('enables account linking', () => {
    expect(authSource).toContain('accountLinking')
    expect(authSource).toContain('enabled: true')
  })

  it('disallows different emails', () => {
    expect(authSource).toContain('allowDifferentEmails: false')
  })

  it('trusts google, github, and email-password', () => {
    expect(authSource).toContain("'google', 'github', 'email-password'")
  })
})

describe('email service integration', () => {
  it('handles password reset with email service', () => {
    expect(authSource).toContain('sendPasswordReset')
  })

  it('handles email verification with email service', () => {
    expect(authSource).toContain('sendVerificationEmail')
  })

  it('logs URLs when email service is not configured', () => {
    expect(authSource).toContain("logger.info('Password reset URL (no email service)'")
    expect(authSource).toContain("logger.info('Email verification URL (no email service)'")
  })

  it('uses module-level _emailService singleton', () => {
    expect(authSource).toContain('let _emailService: EmailService | null = null')
  })
})

describe('createAuth factory', () => {
  it('uses drizzle adapter with sqlite provider', () => {
    expect(authSource).toContain("drizzleAdapter(db, { provider: 'sqlite' })")
  })

  it('passes authConfig spread into betterAuth', () => {
    expect(authSource).toContain('...authConfig')
  })
})
