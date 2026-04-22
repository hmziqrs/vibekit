import { building } from '$app/environment'
import { getTextDirection } from '$lib/paraglide/runtime'
import { paraglideMiddleware } from '$lib/paraglide/server'
import { createAuth } from '$lib/server/auth'
import { error } from '@sveltejs/kit'
import type { Handle } from '@sveltejs/kit'
import { sequence } from '@sveltejs/kit/hooks'
import { svelteKitHandler } from 'better-auth/svelte-kit'

const handleParaglide: Handle = ({ event, resolve }) =>
  paraglideMiddleware(event.request, ({ request, locale }) => {
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
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' https://static.cloudflareinsights.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self';"
  )

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

  // The Cloudflare adapter wraps env in a Proxy that throws when accessing
  // bindings in prerenderable routes (even during dev). Wrap in try-catch.
  let db: D1Database | undefined
  try {
    db = event.platform?.env?.DB
  } catch {
    db = undefined
  }

  if (!db) {
    return resolve(event)
  }

  event.locals.auth = createAuth(db)

  const { auth } = event.locals
  const session = await auth.api.getSession({ headers: event.request.headers })

  if (session) {
    event.locals.session = session.session
    event.locals.user = session.user
  }

  return svelteKitHandler({ event, resolve, auth, building })
}

const handleRouteGuards: Handle = async ({ event, resolve }) => {
  const { pathname } = event.url
  const user = event.locals.user

  // Admin routes require auth + admin role
  if (pathname.startsWith('/admin')) {
    if (!user) {
      return new Response(null, {
        status: 302,
        headers: { Location: `/login?next=${encodeURIComponent(pathname)}` },
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
        status: 302,
        headers: { Location: `/login?next=${encodeURIComponent(pathname)}` },
      })
    }
  }

  return resolve(event)
}

export const handle: Handle = sequence(
  handleParaglide,
  handleSecurityHeaders,
  handleBetterAuth,
  handleRouteGuards
)
