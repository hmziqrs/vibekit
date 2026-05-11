import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

const root = resolve(__dirname, '../..')

describe('auth security config', () => {
  describe('rate limiting', () => {
    it('enables rate limiting in auth config', () => {
      const authPath = resolve(root, 'src/lib/server/auth.ts')
      const content = readFileSync(authPath, 'utf8')
      expect(content).toContain('rateLimit')
      expect(content).toContain('enabled: true')
    })

    it('configures storage for rate limiting', () => {
      const authPath = resolve(root, 'src/lib/server/auth.ts')
      const content = readFileSync(authPath, 'utf8')
      // Currently using memory storage; TODO: migrate to database after adding schema
      expect(content).toContain("storage: 'memory'")
    })

    it('sets strict limits on sign-in endpoint', () => {
      const authPath = resolve(root, 'src/lib/server/auth.ts')
      const content = readFileSync(authPath, 'utf8')
      expect(content).toContain("'/sign-in/email'")
      expect(content).toContain('max: 5')
    })

    it('sets strict limits on sign-up endpoint', () => {
      const authPath = resolve(root, 'src/lib/server/auth.ts')
      const content = readFileSync(authPath, 'utf8')
      expect(content).toContain("'/sign-up/email'")
      expect(content).toContain('max: 3')
    })

    it('sets strict limits on password reset endpoints', () => {
      const authPath = resolve(root, 'src/lib/server/auth.ts')
      const content = readFileSync(authPath, 'utf8')
      expect(content).toContain("'/forget-password'")
      expect(content).toContain("'/reset-password'")
    })
  })

  describe('cookie security', () => {
    it('sets explicit cookie attributes', () => {
      const authPath = resolve(root, 'src/lib/server/auth.ts')
      const content = readFileSync(authPath, 'utf8')
      expect(content).toContain('defaultCookieAttributes')
      expect(content).toContain('httpOnly: true')
      expect(content).toContain("sameSite: 'lax'")
      expect(content).toContain("path: '/'")
    })

    it('does not force secure cookies (auto-detect)', () => {
      const authPath = resolve(root, 'src/lib/server/auth.ts')
      const content = readFileSync(authPath, 'utf8')
      // Should NOT have useSecureCookies set
      expect(content).not.toContain('useSecureCookies: true')
    })
  })

  describe('csrf protection', () => {
    it('documents CSRF is handled by Better Auth', () => {
      const authPath = resolve(root, 'src/lib/server/auth.ts')
      const content = readFileSync(authPath, 'utf8')
      expect(content).toContain('CSRF')
      expect(content).toContain('disableCSRFCheck')
    })

    it('does not disable CSRF checks', () => {
      const authPath = resolve(root, 'src/lib/server/auth.ts')
      const content = readFileSync(authPath, 'utf8')
      expect(content).not.toContain('disableCSRFCheck: true')
      expect(content).not.toContain('disableOriginCheck: true')
    })
  })
})

describe('suspended user enforcement', () => {
  it('checks user status in handleBetterAuth', () => {
    const hooksPath = resolve(root, 'src/hooks.server.ts')
    const content = readFileSync(hooksPath, 'utf8')
    expect(content).toContain("status === 'suspended'")
    expect(content).toContain('signOut')
  })

  it('clears session and user locals for suspended users', () => {
    const hooksPath = resolve(root, 'src/hooks.server.ts')
    const content = readFileSync(hooksPath, 'utf8')
    expect(content).toContain('event.locals.session = undefined')
    expect(content).toContain('event.locals.user = undefined')
  })

  it('deletes sessions when admin suspends a user', () => {
    const honoPath = resolve(root, 'src/lib/server/hono/index.ts')
    const content = readFileSync(honoPath, 'utf8')
    expect(content).toContain("updates.status === 'suspended'")
    expect(content).toContain('sessionTable')
    expect(content).toContain('delete(sessionTable)')
  })

  it('imports session table from auth schema', () => {
    const honoPath = resolve(root, 'src/lib/server/hono/index.ts')
    const content = readFileSync(honoPath, 'utf8')
    expect(content).toContain('session as sessionTable')
    expect(content).toContain("'$lib/server/db/auth.schema'")
  })
})

describe('brute-force lockout integration', () => {
  it('imports lockout functions in hooks.server.ts', () => {
    const hooksPath = resolve(root, 'src/hooks.server.ts')
    const content = readFileSync(hooksPath, 'utf8')
    expect(content).toContain("from '$lib/server/auth-lockout'")
    expect(content).toContain('checkLockout')
    expect(content).toContain('recordFailedAttempt')
    expect(content).toContain('resetAttempts')
  })

  it('integrates lockout check in handleBetterAuth', () => {
    const hooksPath = resolve(root, 'src/hooks.server.ts')
    const content = readFileSync(hooksPath, 'utf8')
    // Lockout check is integrated directly into handleBetterAuth
    expect(content).toContain("pathname === '/api/auth/sign-in/email'")
    expect(content).toContain('svelteKitHandler')
  })

  it('returns 429 when account is locked', () => {
    const hooksPath = resolve(root, 'src/hooks.server.ts')
    const content = readFileSync(hooksPath, 'utf8')
    expect(content).toContain('ACCOUNT_LOCKED')
    expect(content).toContain('status: 429')
  })

  it('logs successful and failed login attempts', () => {
    const hooksPath = resolve(root, 'src/hooks.server.ts')
    const content = readFileSync(hooksPath, 'utf8')
    expect(content).toContain("'auth.login'")
    expect(content).toContain("'auth.login_failed'")
  })
})

describe('login_attempt schema', () => {
  it('exists in the database schema', () => {
    const schemaPath = resolve(root, 'src/lib/server/db/schema.ts')
    const content = readFileSync(schemaPath, 'utf8')
    expect(content).toContain('loginAttempt')
    expect(content).toContain("sqliteTable('login_attempt'")
  })

  it('has required columns', () => {
    const schemaPath = resolve(root, 'src/lib/server/db/schema.ts')
    const content = readFileSync(schemaPath, 'utf8')
    expect(content).toContain('attemptCount')
    expect(content).toContain('lockedUntil')
    expect(content).toContain('lastAttemptAt')
  })

  it('has migration file', () => {
    const migrationDir = resolve(root, 'drizzle')
    const content = readFileSync(resolve(migrationDir, '0009_stiff_morgan_stark.sql'), 'utf8')
    expect(content).toContain('CREATE TABLE')
    expect(content).toContain('login_attempt')
    expect(content).toContain('attempt_count')
    expect(content).toContain('locked_until')
  })
})
