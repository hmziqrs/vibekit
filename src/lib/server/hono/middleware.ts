import { createAuthForHono } from '$lib/server/auth-hono'
import { item } from '$lib/server/db/schema'
import {
  ForbiddenError,
  NotFoundError,
  RateLimitError,
  ServiceUnavailableError,
  UnauthorizedError,
} from '$lib/server/errors'
import { rateLimit } from '$lib/server/rate-limit'
import { createServices } from '$lib/server/services'
import { and, eq, isNull } from 'drizzle-orm'
import { createMiddleware } from 'hono/factory'

import type { Env, ProtectedEnv } from './types'

export const withServices = createMiddleware<Env>(async (c, next) => {
  const injected = c.env.__services
  if (injected) {
    c.set('services', injected)
    c.set('auth', (c.env.__auth as Env['Variables']['auth']) ?? createAuthForHono(injected.db))
    c.set('user', (c.env.__user as Env['Variables']['user']) ?? null)
    c.set('session', (c.env.__session as Env['Variables']['session']) ?? null)
    await next()
    return
  }

  const services = await createServices({ platform: { env: c.env } })
  if (!services) throw new ServiceUnavailableError()
  c.set('services', services)
  c.set('auth', createAuthForHono(services.db))
  await next()
})

export const withSession = createMiddleware<Env>(async (c, next) => {
  if (c.env.__user !== undefined) {
    await next()
    return
  }
  const session = await c.get('auth').api.getSession({ headers: c.req.raw.headers })
  if (session?.user) {
    const userData = session.user as typeof session.user & {
      deletedAt?: Date | null
      status?: string | null
    }
    if (
      userData.deletedAt ||
      userData.status === 'suspended' ||
      userData.status === 'deactivated'
    ) {
      c.set('user', null)
      c.set('session', null)
      await next()
      return
    }
  }
  c.set('user', session?.user ?? null)
  c.set('session', session?.session ?? null)
  await next()
})

export const requireUser = createMiddleware<Env>(async (c, next) => {
  if (!c.get('user')) throw new UnauthorizedError()
  await next()
})

export const requireAdmin = createMiddleware<Env>(async (c, next) => {
  const user = c.get('user')
  if (!user) throw new UnauthorizedError()
  if (user.role !== 'admin') throw new ForbiddenError()
  await next()
})

export const withRateLimit = (prefix: string, limit = 20, windowMs = 60_000) =>
  createMiddleware<ProtectedEnv>(async (c, next) => {
    const { allowed } = rateLimit(`${prefix}:${c.get('user').id}`, limit, windowMs)
    if (!allowed) throw new RateLimitError()
    await next()
  })

export const withOwnedItem = createMiddleware<ProtectedEnv>(async (c, next) => {
  const { db } = c.get('services')
  const userId = c.get('user').id
  const id = c.req.param('id')

  const resource = await db
    .select()
    .from(item)
    .where(and(eq(item.id, id), eq(item.userId, userId), isNull(item.deletedAt)))
    .get()

  if (!resource) throw new NotFoundError()
  c.set('resource', resource as never)
  await next()
})
