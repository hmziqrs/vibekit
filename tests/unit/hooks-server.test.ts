import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

const hooksSource = readFileSync(resolve(process.cwd(), 'src/hooks.server.ts'), 'utf8')

describe('hooks.server.ts structure', () => {
  it('exports handle via sequence of middleware', () => {
    expect(hooksSource).toContain('export const handle: Handle = sequence(')
  })

  it('exports handleError for server error logging', () => {
    expect(hooksSource).toContain('export const handleError: HandleServerError')
  })

  it('uses correct middleware ordering', () => {
    const sequenceMatch = hooksSource.match(/export const handle: Handle = sequence\(([\s\S]*?)\)/)
    expect(sequenceMatch).not.toBeNull()
    const body = sequenceMatch![1]
    const handlers = body
      .split(',')
      .map((h) => h.trim())
      .filter(Boolean)
    expect(handlers).toEqual([
      'handleParaglide',
      'handleSecurityHeaders',
      'handleBetterAuth',
      'handleMaintenance',
      'handleHono',
      'handleRouteGuards',
    ])
  })
})

describe('handleSecurityHeaders', () => {
  it('sets X-Content-Type-Options', () => {
    expect(hooksSource).toContain("'X-Content-Type-Options', 'nosniff'")
  })

  it('sets X-Frame-Options to DENY', () => {
    expect(hooksSource).toContain("'X-Frame-Options', 'DENY'")
  })

  it('sets Referrer-Policy', () => {
    expect(hooksSource).toContain("'Referrer-Policy', 'strict-origin-when-cross-origin'")
  })

  it('sets Permissions-Policy', () => {
    expect(hooksSource).toContain(
      "'Permissions-Policy', 'camera=(), microphone=(), geolocation=()'"
    )
  })

  it('sets Cross-Origin policies', () => {
    expect(hooksSource).toContain("'Cross-Origin-Opener-Policy', 'same-origin'")
    expect(hooksSource).toContain("'Cross-Origin-Resource-Policy', 'same-origin'")
  })

  it('sets HSTS for HTTPS only', () => {
    expect(hooksSource).toContain("'Strict-Transport-Security'")
    expect(hooksSource).toContain("event.url.protocol === 'https:'")
  })

  it('skips API routes', () => {
    expect(hooksSource).toContain("event.url.pathname.startsWith('/api/')")
  })
})

describe('handleBetterAuth auth lockout', () => {
  it('checks lockout for sign-in email POST', () => {
    expect(hooksSource).toContain(
      "pathname === '/api/auth/sign-in/email' && event.request.method === 'POST'"
    )
  })

  it('returns 429 for locked accounts', () => {
    expect(hooksSource).toContain('status: 429')
    expect(hooksSource).toContain("'ACCOUNT_LOCKED'")
  })

  it('returns 403 for suspended (banned) accounts', () => {
    expect(hooksSource).toContain('status: 403')
    expect(hooksSource).toContain("'ACCOUNT_BANNED'")
  })

  it('records failed attempts on unsuccessful login', () => {
    expect(hooksSource).toContain('recordFailedAttempt')
    expect(hooksSource).toContain("'login_failed'")
  })

  it('resets attempts on successful login', () => {
    expect(hooksSource).toContain('resetAttempts')
  })

  it('writes login security event on success', () => {
    expect(hooksSource).toContain("'login'")
  })

  it('detects new devices', () => {
    expect(hooksSource).toContain('isNewDevice')
    expect(hooksSource).toContain("'new_device'")
  })

  it('handles suspended user sessions by signing out', () => {
    expect(hooksSource).toContain("session.user.status === 'suspended'")
    expect(hooksSource).toContain('auth.api.signOut')
  })
})

describe('handleBetterAuth tracked events', () => {
  it('tracks social login', () => {
    expect(hooksSource).toContain("'sign-in/social': 'login'")
  })

  it('tracks password changes', () => {
    expect(hooksSource).toContain("'change-password': 'password_change'")
  })

  it('tracks two-factor enable/disable', () => {
    expect(hooksSource).toContain("'two-factor/enable': 'two_factor_enabled'")
    expect(hooksSource).toContain("'two-factor/disable': 'two_factor_disabled'")
  })

  it('tracks sign-out events', () => {
    expect(hooksSource).toContain("pathname === '/api/auth/sign-out'")
    expect(hooksSource).toContain("'logout'")
  })
})

describe('handleMaintenance', () => {
  it('has a maintenance whitelist', () => {
    expect(hooksSource).toContain('MAINTENANCE_WHITELIST')
    expect(hooksSource).toContain("'/api/health'")
    expect(hooksSource).toContain("'/api/announcements'")
  })

  it('returns 503 when maintenance mode is active', () => {
    expect(hooksSource).toContain('status: 503')
    expect(hooksSource).toContain("'MAINTENANCE_MODE'")
  })

  it('allows admin users to bypass maintenance', () => {
    expect(hooksSource).toContain("event.locals.user?.role === 'admin'")
  })

  it('skips during build phase', () => {
    expect(hooksSource).toContain('if (building) return resolve(event)')
  })

  it('checks systemConfig for maintenance_mode', () => {
    expect(hooksSource).toContain("eq(systemConfig.key, 'maintenance_mode')")
  })
})

describe('handleRouteGuards', () => {
  it('redirects authenticated users away from auth pages', () => {
    expect(hooksSource).toContain("pathname === '/login'")
    expect(hooksSource).toContain("pathname === '/register'")
    expect(hooksSource).toContain("pathname === '/forgot-password'")
    expect(hooksSource).toContain("pathname.startsWith('/reset-password')")
    expect(hooksSource).toContain("location: '/app'")
    expect(hooksSource).toContain('status: 302')
  })

  it('requires auth for admin routes', () => {
    expect(hooksSource).toContain("pathname === '/admin' || pathname.startsWith('/admin/')")
    expect(hooksSource).toContain("user.role !== 'admin'")
  })

  it('requires auth for app routes', () => {
    expect(hooksSource).toContain("pathname === '/app' || pathname.startsWith('/app/')")
    expect(hooksSource).toContain('encodeURIComponent(pathname)')
  })

  it('redirects to onboarding if not completed', () => {
    expect(hooksSource).toContain('!user.onboardingCompleted')
    expect(hooksSource).toContain("Location: '/app/onboarding'")
  })

  it('admins skip onboarding redirect', () => {
    expect(hooksSource).toContain("user.role !== 'admin'")
  })
})

describe('handleHono', () => {
  it('delegates /api/ routes to Hono app', () => {
    expect(hooksSource).toContain("event.url.pathname.startsWith('/api/')")
    expect(hooksSource).toContain('app.fetch')
  })

  it('passes auth context to Hono', () => {
    expect(hooksSource).toContain('__auth: event.locals.auth')
    expect(hooksSource).toContain('__services: event.locals.services')
    expect(hooksSource).toContain('__session: event.locals.session')
    expect(hooksSource).toContain('__user: event.locals.user')
  })

  it('resolves non-API routes normally', () => {
    const honoHandler = hooksSource.match(/const handleHono: Handle[\s\S]*?return resolve\(event\)/)
    expect(honoHandler).not.toBeNull()
  })
})

describe('handleError', () => {
  it('logs error with structured fields', () => {
    expect(hooksSource).toContain('error: err instanceof Error ? err.message : String(err)')
    expect(hooksSource).toContain('method: event.request.method')
    expect(hooksSource).toContain('url: event.url.pathname')
    expect(hooksSource).toContain('status')
  })

  it('includes stack trace for Error instances', () => {
    expect(hooksSource).toContain('stack: err instanceof Error ? err.stack : undefined')
  })
})
