import { building } from '$app/environment'
import { getTextDirection } from '$lib/paraglide/runtime'
import { paraglideMiddleware } from '$lib/paraglide/server'
import { createAuth } from '$lib/server/auth'
import { checkLockout, recordFailedAttempt, resetAttempts } from '$lib/server/auth-lockout'
import { app } from '$lib/server/hono'
import { createServices } from '$lib/server/services'
import { error, type Handle, type HandleServerError } from '@sveltejs/kit'
import { sequence } from '@sveltejs/kit/hooks'
import { svelteKitHandler } from 'better-auth/svelte-kit'

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
      const { locked } = await checkLockout(services.db, email)
      if (locked) {
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
        console.info(
          JSON.stringify({
            email,
            event: 'auth.login',
            ip: event.request.headers.get('cf-connecting-ip') ?? event.getClientAddress(),
            userAgent: event.request.headers.get('user-agent'),
          })
        )
      } else {
        await recordFailedAttempt(services.db, email)
        console.warn(
          JSON.stringify({
            email,
            event: 'auth.login_failed',
            ip: event.request.headers.get('cf-connecting-ip') ?? event.getClientAddress(),
            userAgent: event.request.headers.get('user-agent'),
          })
        )
      }

      return response
    }
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
