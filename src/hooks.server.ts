import { building } from '$app/environment'
import { getTextDirection } from '$lib/paraglide/runtime'
import { paraglideMiddleware } from '$lib/paraglide/server'
import { createAuth, getEmailService, setEmailService } from '$lib/server/auth'
import { checkLockout, recordFailedAttempt, resetAttempts } from '$lib/server/auth-lockout'
import type { getDb } from '$lib/server/db'
import { session as sessionTable, systemConfig } from '$lib/server/db/schema'
import { createEmailService } from '$lib/server/email/index'
import { app } from '$lib/server/hono'
import { createServices } from '$lib/server/services'
import {
  isNewDevice,
  writeSecurityEvent,
  type SecurityEventType,
} from '$lib/server/services/security-events'
import { error as httpError, type Handle, type HandleServerError } from '@sveltejs/kit'
import { sequence } from '@sveltejs/kit/hooks'
import { svelteKitHandler } from 'better-auth/svelte-kit'
import { asc, eq } from 'drizzle-orm'

const handleParaglide: Handle = ({ event, resolve }) =>
  paraglideMiddleware(event.request as Request, ({ request, locale }) => {
    event.request = request

    return resolve(event, {
      transformPageChunk: ({ html }) =>
        html
          .replace('%paraglide.lang%', locale)
          .replace('%paraglide.dir%', getTextDirection(locale)),
    })
  })

const handleSecurityHeaders: Handle = async ({ event, resolve }) => {
  // Skip for API responses (they set their own headers)
  if (event.url.pathname.startsWith('/api/')) {
    return resolve(event)
  }

  // Store nonce for components that need it (e.g. cf-beacon)
  const nonce = crypto.randomUUID().replace(/-/g, '')
  event.locals.cspNonce = nonce

  const response = await resolve(event, {
    // Pass nonce to SvelteKit so it adds it to inline scripts/styles
    csp: { nonce },
  })

  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('Cross-Origin-Opener-Policy', 'same-origin')
  response.headers.set('Cross-Origin-Resource-Policy', 'same-origin')

  // Only set HSTS in production
  if (event.url.protocol === 'https:') {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=63072000; includeSubDomains; preload'
    )
  }

  return response
}

const handleBetterAuth: Handle = async ({ event, resolve }) => {
  // Skip DB access during prerender and build phase
  if (building) {
    return resolve(event)
  }

  // Create adapter-scoped services. Returns null when no runtime DB is available
  // (e.g. prerenderable routes during Cloudflare dev/build).
  const services = await createServices(event)
  if (!services) {
    return resolve(event)
  }
  const db = services.db as ReturnType<typeof getDb>

  event.locals.services = services
  event.locals.auth = createAuth(services.db)

  // Ensure the global email service is available for auth callbacks and security alerts.
  // On Node this was already set by createNodeServices(); on Cloudflare this is the
  // First opportunity since services are per-request.
  if (!getEmailService()) {
    setEmailService(createEmailService(services.email, services.db))
  }

  const { auth } = event.locals
  const session = await auth.api.getSession({ headers: event.request.headers })

  if (session) {
    // Enforce suspended user status — immediately revoke access
    if (session.user.status === 'suspended') {
      await auth.api.signOut({ headers: event.request.headers })
      event.locals.session = undefined
      event.locals.user = undefined
    } else {
      event.locals.session = session.session
      event.locals.user = session.user
    }
  }

  // Account lockout: check before sign-in, record result after
  const { pathname } = event.url
  const requestIP = event.request.headers.get('cf-connecting-ip') ?? event.getClientAddress()
  const requestUA = event.request.headers.get('user-agent') ?? null

  if (pathname === '/api/auth/sign-in/email' && event.request.method === 'POST') {
    const cloned = event.request.clone()
    let email = ''
    try {
      const body: Record<string, unknown> = await cloned.json()
      email = typeof body.email === 'string' ? body.email.toLowerCase().trim() : ''
    } catch {
      // Invalid body — let the auth handler deal with it
    }

    if (email) {
      const { locked, remainingAttempts } = await checkLockout(services.db, email)
      if (locked) {
        await writeSecurityEvent(services.db, {
          eventType: 'account_locked',
          ipAddress: requestIP,
          metadata: { email },
          userAgent: requestUA ?? undefined,
        })
        // Send security alert email
        const emailService = getEmailService()
        if (emailService) {
          emailService
            .sendSecurityAlert(email, {
              eventTime: new Date().toISOString(),
              eventType: 'account_locked',
              ipAddress: requestIP,
            })
            .catch((error) => console.error('Security alert email failed:', error))
        }
        return Response.json(
          {
            code: 'ACCOUNT_LOCKED',
            message: 'Too many failed attempts. Try again in 15 minutes.',
          },
          { status: 429 }
        )
      }

      // Check if user is suspended (banned) — block sign-in
      {
        const { user: userTable } = await import('$lib/server/db/auth.schema')
        const [foundUser] = await db
          .select({
            banExpiresAt: userTable.banExpiresAt,
            banReason: userTable.banReason,
            status: userTable.status,
          })
          .from(userTable)
          .where(eq(userTable.email, email))
        if (foundUser?.status === 'suspended') {
          return Response.json(
            {
              code: 'ACCOUNT_BANNED',
              message: 'This account has been suspended.',
              reason: foundUser.banReason ?? null,
            },
            { status: 403 }
          )
        }
      }

      const response = await svelteKitHandler({ auth, building, event, resolve })

      if (response.status < 400) {
        await resetAttempts(services.db, email)

        // Parse response to get userId for security event
        let userId: string | undefined
        try {
          const resClone = response.clone()
          const resBody: Record<string, unknown> = await resClone.json()
          const resUser = resBody.user as Record<string, unknown> | undefined
          userId = typeof resUser?.id === 'string' ? resUser.id : undefined
        } catch (error) {
          // Response parsing failed — skip security event without userId
          console.error('Failed to parse auth response for security event:', error)
        }

        if (userId) {
          await writeSecurityEvent(services.db, {
            eventType: 'login',
            ipAddress: requestIP,
            userAgent: requestUA ?? undefined,
            userId,
          })

          // Enforce concurrent session limit (max 5 per user)
          const MAX_SESSIONS = 5
          try {
            const sessions = await services.db
              .select()
              .from(sessionTable)
              .where(eq(sessionTable.userId, userId))
              .orderBy(asc(sessionTable.createdAt))
            if (sessions.length >= MAX_SESSIONS) {
              const evictCount = sessions.length - MAX_SESSIONS + 1
              const evictIds = sessions.slice(0, evictCount).map((s) => s.id)
              await Promise.all(
                evictIds.map((sid) =>
                  services.db
                    .delete(sessionTable)
                    .where(eq(sessionTable.id, sid))
                    .catch(() => {})
                )
              )
            }

            // Populate IP and user agent on the newest session
            const latestSession = sessions[sessions.length - 1]
            if (latestSession && (!latestSession.ipAddress || !latestSession.userAgent)) {
              await services.db
                .update(sessionTable)
                .set({ ipAddress: requestIP, userAgent: requestUA })
                .where(eq(sessionTable.id, latestSession.id))
                .catch(() => {})
            }
          } catch (error) {
            console.error('Session limit enforcement failed:', error)
          }
        }

        // New device detection — compare IP against known sessions
        if (userId) {
          try {
            const knownSessions = await services.db
              .select()
              .from(sessionTable)
              .where(eq(sessionTable.userId, userId))
            const knownIPs = knownSessions
              .map((s) => s.ipAddress)
              .filter((ip): ip is string => ip !== null)
            if (isNewDevice(knownIPs, requestIP ?? '')) {
              await writeSecurityEvent(services.db, {
                eventType: 'new_device',
                ipAddress: requestIP,
                metadata: { knownIPCount: knownIPs.length },
                userAgent: requestUA ?? undefined,
                userId,
              })
              // Send security alert email
              const alertService = getEmailService()
              if (alertService && event.locals.user?.email) {
                alertService
                  .sendSecurityAlert(event.locals.user.email, {
                    details: `Known devices: ${knownIPs.length}`,
                    eventTime: new Date().toISOString(),
                    eventType: 'new_device',
                    ipAddress: requestIP,
                    userAgent: requestUA ?? undefined,
                    userName: event.locals.user.name ?? undefined,
                  })
                  .catch((error) => console.error('Security alert email failed:', error))
              }
            }
          } catch (error) {
            // New device detection failed — non-critical, don't block login
            console.error('New device detection failed:', error)
          }
        }

        console.info(
          JSON.stringify({
            email,
            event: 'auth.login',
            ip: requestIP,
            userAgent: requestUA,
          })
        )
      } else {
        const result = await recordFailedAttempt(services.db, email)
        await writeSecurityEvent(services.db, {
          eventType: 'login_failed',
          ipAddress: requestIP,
          metadata: { attemptCount: result.attemptCount, email },
          userAgent: requestUA ?? undefined,
        })
        console.warn(
          JSON.stringify({
            email,
            event: 'auth.login_failed',
            ip: requestIP,
            remainingAttempts,
            userAgent: requestUA,
          })
        )
      }

      return response
    }
  }

  // Track social login, 2FA, and password change events
  if (event.request.method === 'POST') {
    const trackedPaths: Record<string, SecurityEventType> = {
      'change-password': 'password_change',
      'sign-in/social': 'login',
      'two-factor/disable': 'two_factor_disabled',
      'two-factor/enable': 'two_factor_enabled',
    }
    const matchedEntry = Object.entries(trackedPaths).find(
      ([path]) => pathname === `/api/auth/${path}`
    )
    if (matchedEntry) {
      const [, eventType] = matchedEntry
      const response = await svelteKitHandler({ auth, building, event, resolve })
      if (response.status < 400) {
        const userId = event.locals.user?.id
        await writeSecurityEvent(services.db, {
          eventType,
          ipAddress: requestIP,
          userAgent: requestUA ?? undefined,
          userId,
        })
        // Send security alert for password and 2FA changes
        if (
          (eventType === 'password_change' ||
            eventType === 'two_factor_enabled' ||
            eventType === 'two_factor_disabled') &&
          event.locals.user?.email
        ) {
          const alertService = getEmailService()
          if (alertService) {
            alertService
              .sendSecurityAlert(event.locals.user.email, {
                eventTime: new Date().toISOString(),
                eventType:
                  eventType === 'password_change' ? 'password_change' : 'two_factor_change',
                ipAddress: requestIP,
                userAgent: requestUA ?? undefined,
                userName: event.locals.user.name ?? undefined,
              })
              .catch((error) => console.error('Security alert email failed:', error))
          }
        }
      }
      return response
    }
  }

  // Track sign-out events
  if (pathname === '/api/auth/sign-out' && event.request.method === 'POST') {
    const userId = event.locals.user?.id
    const response = await svelteKitHandler({ auth, building, event, resolve })
    if (response.status < 400 && userId) {
      await writeSecurityEvent(services.db, {
        eventType: 'logout',
        ipAddress: requestIP,
        userAgent: requestUA ?? undefined,
        userId,
      })
    }
    return response
  }

  return svelteKitHandler({ auth, building, event, resolve })
}

const MAINTENANCE_WHITELIST = [
  '/api/health',
  '/api/announcements',
  '/api/admin/cleanup',
  '/api/admin/publish-scheduled',
]

const handleMaintenance: Handle = async ({ event, resolve }) => {
  if (building) return resolve(event)

  const { pathname } = event.url

  // Skip for whitelisted paths (health check, announcements)
  if (MAINTENANCE_WHITELIST.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return resolve(event)
  }

  // Admin users bypass maintenance mode
  if (event.locals.user?.role === 'admin') {
    return resolve(event)
  }

  // Check maintenance mode
  const { services } = event.locals
  if (services) {
    try {
      const maintenanceDb = services.db as ReturnType<typeof getDb>
      const [row] = await maintenanceDb
        .select({ value: systemConfig.value })
        .from(systemConfig)
        .where(eq(systemConfig.key, 'maintenance_mode'))
        .limit(1)

      if (row?.value === 'true') {
        return Response.json(
          {
            error: {
              code: 'MAINTENANCE_MODE',
              message: 'System is under maintenance. Please try again later.',
            },
          },
          { status: 503 }
        )
      }
    } catch {
      // Config table may not exist yet (migration pending) — allow through
      console.info('Maintenance mode check skipped (config unavailable)')
    }
  }

  return resolve(event)
}

const handleRouteGuards: Handle = async ({ event, resolve }) => {
  const { pathname } = event.url
  const { user } = event.locals

  // Redirect authenticated users away from auth pages
  if (
    user &&
    (pathname === '/login' ||
      pathname === '/register' ||
      pathname === '/forgot-password' ||
      pathname.startsWith('/reset-password'))
  ) {
    return new Response('Redirect', {
      headers: { location: '/app' },
      status: 302,
    })
  }

  // Admin routes require auth + admin role + 2FA
  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    if (!user) {
      return new Response(null, {
        headers: { Location: `/login?next=${encodeURIComponent(pathname)}` },
        status: 302,
      })
    }
    if (user.role !== 'admin') {
      throw httpError(403, { message: 'Admin access required' })
    }
    // Require 2FA for admin access
    if (!user.twoFactorEnabled && !pathname.startsWith('/api/')) {
      return new Response(null, {
        headers: { Location: '/app/settings?require2fa=1' },
        status: 302,
      })
    }
  }

  // App routes require auth
  if (pathname === '/app' || pathname.startsWith('/app/')) {
    if (!user) {
      return new Response(null, {
        headers: { Location: `/login?next=${encodeURIComponent(pathname)}` },
        status: 302,
      })
    }
    // Redirect to onboarding if not completed (skip for admins and onboarding page itself)
    if (
      !user.onboardingCompleted &&
      user.role !== 'admin' &&
      pathname !== '/app/onboarding' &&
      !pathname.startsWith('/api/')
    ) {
      return new Response(null, {
        headers: { Location: '/app/onboarding' },
        status: 302,
      })
    }
  }

  return resolve(event)
}

const handleHono: Handle = ({ event, resolve }) => {
  if (event.url.pathname === '/api' || event.url.pathname.startsWith('/api/')) {
    return app.fetch(
      event.request,
      {
        ...event.platform?.env,
        __auth: event.locals.auth,
        __services: event.locals.services,
        __session: event.locals.session ?? null,
        __user: event.locals.user ?? null,
      },
      event.platform?.ctx
    )
  }
  return resolve(event)
}

export const handle: Handle = sequence(
  handleParaglide,
  handleSecurityHeaders,
  handleBetterAuth,
  handleMaintenance,
  handleHono,
  handleRouteGuards
)

export const handleError: HandleServerError = async ({ error: err, event, status }) => {
  console.error(
    JSON.stringify({
      error: err instanceof Error ? err.message : String(err),
      method: event.request.method,
      stack: err instanceof Error ? err.stack : undefined,
      status,
      url: event.url.pathname,
    })
  )
}
