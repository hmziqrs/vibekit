import type { OrgAction, OrgRole, TeamAction, TeamRole } from '$lib/permissions'
import {
  hasScope as apiKeyHasScope,
  logApiKeyUsage,
  touchApiKey,
  validateApiKey,
} from '$lib/server/api-keys'
import { createAuthForHono } from '$lib/server/auth-hono'
import { item, organization, organizationMember, team, teamMember } from '$lib/server/db/schema'
import {
  ForbiddenError,
  NotFoundError,
  RateLimitError,
  ServiceUnavailableError,
  UnauthorizedError,
} from '$lib/server/errors'
import { hasPermission, hasTeamPermission } from '$lib/server/permissions'
import { rateLimit } from '$lib/server/rate-limit'
import { createServices } from '$lib/server/services'
import { and, eq, isNull } from 'drizzle-orm'
import { createMiddleware } from 'hono/factory'

import type { Env, OrgEnv, ProtectedEnv, TeamEnv } from './types'

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

export const withApiKey = (requiredScope?: string) =>
  createMiddleware<Env>(async (c, next) => {
    c.set('apiKey', null)

    const authHeader = c.req.header('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      await next()
      return
    }

    const token = authHeader.slice(7)
    if (!token.startsWith('vk_')) {
      await next()
      return
    }

    const { db } = c.get('services')
    const keyRecord = await validateApiKey(db, token)
    if (!keyRecord) {
      await next()
      return
    }

    if (requiredScope && !apiKeyHasScope(keyRecord.scopes, requiredScope)) {
      throw new ForbiddenError(`API key missing scope: ${requiredScope}`)
    }

    c.set('apiKey', keyRecord)

    // Set user from API key's userId
    if (!c.get('user')) {
      const { user: userTable } = await import('$lib/server/db/auth.schema').then((m) => ({
        user: m.user,
      }))
      const foundUser = await db
        .select()
        .from(userTable)
        .where(eq(userTable.id, keyRecord.userId))
        .get()
      if (foundUser) {
        c.set('user', foundUser as never)
      }
    }

    // Update usage stats (fire and forget)
    c.executionCtx?.waitUntil?.(
      Promise.all([
        touchApiKey(db, keyRecord.id),
        logApiKeyUsage(db, {
          apiKeyId: keyRecord.id,
          endpoint: c.req.path,
          ipAddress: c.req.header('cf-connecting-ip') ?? c.req.header('x-forwarded-for'),
          method: c.req.method,
          statusCode: 200,
          userAgent: c.req.header('user-agent'),
        }),
      ])
    )

    await next()
  })

export const withRateLimit = (prefix: string, limit = 20, windowMs = 60_000) =>
  createMiddleware<Env>(async (c, next) => {
    const user = c.get('user')
    const key = user
      ? `${prefix}:${user.id}`
      : `${prefix}:ip:${c.req.header('cf-connecting-ip') ?? c.req.header('x-forwarded-for') ?? 'anon'}`
    const { allowed } = rateLimit(key, limit, windowMs)
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

export const withTeamMembership = createMiddleware<TeamEnv>(async (c, next) => {
  const { db } = c.get('services')
  const userId = c.get('user').id
  const teamId = c.req.param('teamId') ?? ''

  const teamRow = await db
    .select()
    .from(team)
    .where(and(eq(team.id, teamId), isNull(team.deletedAt)))
    .get()

  if (!teamRow) throw new NotFoundError()

  const orgId = (c.get('organization' as never) as { id: string }).id
  if (teamRow.organizationId !== orgId) {
    throw new ForbiddenError('Team does not belong to this organization')
  }

  const membership = await db
    .select()
    .from(teamMember)
    .where(and(eq(teamMember.teamId, teamId), eq(teamMember.userId, userId)))
    .get()

  c.set('team' as never, teamRow as never)
  c.set('teamMembership' as never, (membership ?? null) as never)
  await next()
})

export const requireTeamPermission = (action: TeamAction) =>
  createMiddleware<TeamEnv>(async (c, next) => {
    const orgRole = (c.get('membership' as never) as { role: OrgRole }).role
    const teamMembership = c.get('teamMembership' as never) as {
      role: TeamRole
    } | null
    const teamRole = teamMembership?.role ?? null
    if (!hasTeamPermission(orgRole, teamRole, action)) {
      throw new ForbiddenError(`Missing permission: ${action}`)
    }
    await next()
  })
