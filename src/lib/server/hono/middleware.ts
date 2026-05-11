import type { OrgAction, OrgRole } from '$lib/permissions'
import { createAuthForHono } from '$lib/server/auth-hono'
import { item, organization, organizationMember } from '$lib/server/db/schema'
import {
  ForbiddenError,
  NotFoundError,
  RateLimitError,
  ServiceUnavailableError,
  UnauthorizedError,
} from '$lib/server/errors'
import { hasPermission } from '$lib/server/permissions'
import { rateLimit } from '$lib/server/rate-limit'
import { createServices } from '$lib/server/services'
import { and, eq, isNull } from 'drizzle-orm'
import { createMiddleware } from 'hono/factory'

import type { Env, OrgEnv, ProtectedEnv } from './types'

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

export const withOrgMembership = createMiddleware<OrgEnv>(async (c, next) => {
  const { db } = c.get('services')
  const userId = c.get('user').id
  const orgId = c.req.param('orgId') ?? ''

  const org = await db
    .select()
    .from(organization)
    .where(and(eq(organization.id, orgId), isNull(organization.deletedAt)))
    .get()

  if (!org) throw new NotFoundError()

  const membership = await db
    .select()
    .from(organizationMember)
    .where(and(eq(organizationMember.organizationId, orgId), eq(organizationMember.userId, userId)))
    .get()

  if (!membership) throw new ForbiddenError('Not a member of this organization')

  c.set('membership' as never, membership as never)
  c.set('organization' as never, org as never)
  await next()
})

export const requireOrgAdmin = createMiddleware<OrgEnv>(async (c, next) => {
  const membership = c.get('membership' as never) as { role: string }
  if (membership.role !== 'owner' && membership.role !== 'admin') {
    throw new ForbiddenError('Admin access required')
  }
  await next()
})

export const requireOrgOwner = createMiddleware<OrgEnv>(async (c, next) => {
  const membership = c.get('membership' as never) as { role: string }
  if (membership.role !== 'owner') {
    throw new ForbiddenError('Owner access required')
  }
  await next()
})

export const requirePermission = (action: OrgAction) =>
  createMiddleware<OrgEnv>(async (c, next) => {
    const membership = c.get('membership' as never) as { role: OrgRole }
    if (!hasPermission(membership.role, action)) {
      throw new ForbiddenError(`Missing permission: ${action}`)
    }
    await next()
  })
