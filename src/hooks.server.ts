import { building } from '$app/environment'
import { getTextDirection } from '$lib/paraglide/runtime'
import { paraglideMiddleware } from '$lib/paraglide/server'
import { createAuth } from '$lib/server/auth'
import { checkLockout, recordFailedAttempt, resetAttempts } from '$lib/server/auth-lockout'
import { session as sessionTable } from '$lib/server/db/schema'
import { app } from '$lib/server/hono'
import { createServices } from '$lib/server/services'
import {
  isNewDevice,
  writeSecurityEvent,
  type SecurityEventType,
} from '$lib/server/services/security-events'
import { error, type Handle, type HandleServerError } from '@sveltejs/kit'
import { sequence } from '@sveltejs/kit/hooks'
import { svelteKitHandler } from 'better-auth/svelte-kit'
import { eq } from 'drizzle-orm'

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
  const response = await resolve(event)

  // Skip for API responses (they set their own headers)
  if (event.url.pathname.startsWith('/api/')) {
    return response
  }

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

  event.locals.services = services
  event.locals.auth = createAuth(services.db)

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
        return Response.json(
          {
            code: 'ACCOUNT_LOCKED',
            message: 'Too many failed attempts. Try again in 15 minutes.',
          },
          { status: 429 }
        )
      }

      const response = await svelteKitHandler({ auth, building, event, resolve })

      if (response.status < 400) {
        await resetAttempts(services.db, email)

        // Parse response to get userId for security event
        let userId: string | undefined
        try {
          const resClone = response.clone()
          const resBody: Record<string, unknown> = await resClone.json()
          const user = resBody.user as Record<string, unknown> | undefined
          userId = typeof user?.id === 'string' ? user.id : undefined
        } catch {
          // Response parsing failed — still log without userId
        }

        await writeSecurityEvent(services.db, {
          eventType: 'login',
          ipAddress: requestIP,
          userAgent: requestUA ?? undefined,
          userId,
        })

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
            }
          } catch {
            // New device detection failed — non-critical, don't block login
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

  // Admin routes require auth + admin role
  if (pathname.startsWith('/admin')) {
    if (!user) {
      return new Response(null, {
        headers: { Location: `/login?next=${encodeURIComponent(pathname)}` },
        status: 302,
      })
    }
    if (user.role !== 'admin') {
      throw error(403, { message: 'Admin access required' })
    }
  }

  // App routes require auth
  if (pathname.startsWith('/app')) {
    if (!user) {
      return new Response(null, {
        headers: { Location: `/login?next=${encodeURIComponent(pathname)}` },
        status: 302,
      })
    }
  }

  return resolve(event)
}

const handleHono: Handle = ({ event, resolve }) => {
  if (event.url.pathname.startsWith('/api/')) {
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
