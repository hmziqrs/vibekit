import { isAppError } from '$lib/server/errors'
import {
  requireOrgAdmin,
  requireOrgOwner,
  requirePermission,
  requireTeamPermission,
  withOrgMembership,
  withTeamMembership,
} from '$lib/server/hono/middleware'
import type { Env, OrgEnv, TeamEnv, Variables } from '$lib/server/hono/types'
import { Hono, type Schema } from 'hono'
import type { BlankEnv } from 'hono/types'
import { describe, expect, it, vi } from 'vitest'

type TestUser = NonNullable<Variables['user']>
type TestSession = NonNullable<Variables['session']>
type TestAuth = Variables['auth']
type TestServices = Variables['services']

function mockUser(id: string, role: string): TestUser {
  return { id, role } as unknown as TestUser
}

function mockSession(id: string): TestSession {
  return { id } as unknown as TestSession
}

function mockAuth(): TestAuth {
  return {} as unknown as TestAuth
}

function mockServices(dbOverrides: Record<string, unknown> = {}): TestServices {
  return { db: dbOverrides } as unknown as TestServices
}

function withErrorHandler<E extends BlankEnv = Env>(app: unknown) {
  return (app as Hono<BlankEnv, Schema, '/'>).onError((err: unknown, c) => {
    if (isAppError(err)) {
      return c.json(err.toJSON(), err.status as never)
    }
    return c.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Internal Server Error', status: 500 } },
      500 as never
    )
  }) as unknown as Hono<E, Schema, '/'>
}

function createMockDb(responses: unknown[]) {
  const getFn = vi.fn<() => Promise<unknown>>()
  for (const resp of responses) {
    getFn.mockResolvedValueOnce(resp)
  }
  const whereFn = vi.fn<() => { get: typeof getFn }>().mockReturnValue({ get: getFn })
  const fromFn = vi.fn<() => { where: typeof whereFn }>().mockReturnValue({ where: whereFn })
  const selectFn = vi.fn<() => { from: typeof fromFn }>().mockReturnValue({ from: fromFn })
  return { from: fromFn, get: getFn, select: selectFn, where: whereFn }
}

describe('withOrgMembership', () => {
  it('sets org and membership when user is a member', async () => {
    const user = mockUser('user-1', 'user')
    const org = {
      createdAt: new Date(),
      deletedAt: null,
      description: 'Test org',
      id: 'org-1',
      name: 'Test Org',
      ownerId: 'owner-1',
      slug: 'test-org',
      updatedAt: new Date(),
    }
    const membership = {
      id: 'mem-1',
      joinedAt: new Date(),
      organizationId: 'org-1',
      role: 'member',
      userId: 'user-1',
    }
    const mockDb = createMockDb([org, membership])

    let capturedOrg: unknown
    let capturedMembership: unknown

    const app = withErrorHandler(
      new Hono<OrgEnv>()
        .use('*', async (c, next) => {
          c.set('services', mockServices(mockDb))
          c.set('auth', mockAuth())
          c.set('user', user)
          c.set('session', mockSession('sess-1'))
          await next()
        })
        .get('/orgs/:orgId/test', withOrgMembership, (c) => {
          capturedOrg = c.get('organization' as never)
          capturedMembership = c.get('membership' as never)
          return c.json({ ok: true })
        })
    )

    const res = await app.request('/orgs/org-1/test')
    expect(res.status).toBe(200)
    expect(capturedOrg).toStrictEqual(org)
    expect(capturedMembership).toStrictEqual(membership)
  })

  it('returns 404 when org does not exist', async () => {
    const user = mockUser('user-1', 'user')
    const mockDb = createMockDb([null])

    const app = withErrorHandler(
      new Hono<OrgEnv>()
        .use('*', async (c, next) => {
          c.set('services', mockServices(mockDb))
          c.set('auth', mockAuth())
          c.set('user', user)
          c.set('session', mockSession('sess-1'))
          await next()
        })
        .get('/orgs/:orgId/test', withOrgMembership, (c) => c.json({ ok: true }))
    )

    const res = await app.request('/orgs/org-nonexistent/test')
    expect(res.status).toBe(404)
  })

  it('returns 403 when user is not a member', async () => {
    const user = mockUser('user-1', 'user')
    const mockDb = createMockDb([
      { createdAt: new Date(), deletedAt: null, id: 'org-1', name: 'Test', slug: 'test' },
      null,
    ])

    const app = withErrorHandler(
      new Hono<OrgEnv>()
        .use('*', async (c, next) => {
          c.set('services', mockServices(mockDb))
          c.set('auth', mockAuth())
          c.set('user', user)
          c.set('session', mockSession('sess-1'))
          await next()
        })
        .get('/orgs/:orgId/test', withOrgMembership, (c) => c.json({ ok: true }))
    )

    const res = await app.request('/orgs/org-1/test')
    expect(res.status).toBe(403)
  })
})

describe('requireOrgAdmin', () => {
  function createOrgApp(role: string) {
    return withErrorHandler(
      new Hono<OrgEnv>()
        .use('*', async (c, next) => {
          c.set('services', mockServices())
          c.set('auth', mockAuth())
          c.set('user', mockUser('user-1', 'user'))
          c.set('session', mockSession('sess-1'))
          c.set(
            'membership' as never,
            {
              id: 'mem-1',
              joinedAt: new Date(),
              organizationId: 'org-1',
              role,
              userId: 'user-1',
            } as never
          )
          c.set('organization' as never, { id: 'org-1', name: 'Test' } as never)
          await next()
        })
        .get('/test', requireOrgAdmin, (c) => c.json({ ok: true }))
    )
  }

  it('allows owner through', async () => {
    const res = await createOrgApp('owner').request('/test')
    expect(res.status).toBe(200)
  })

  it('allows admin through', async () => {
    const res = await createOrgApp('admin').request('/test')
    expect(res.status).toBe(200)
  })

  it('rejects member with 403', async () => {
    const res = await createOrgApp('member').request('/test')
    expect(res.status).toBe(403)
  })

  it('rejects viewer with 403', async () => {
    const res = await createOrgApp('viewer').request('/test')
    expect(res.status).toBe(403)
  })
})

describe('requireOrgOwner', () => {
  function createOwnerApp(role: string) {
    return withErrorHandler(
      new Hono<OrgEnv>()
        .use('*', async (c, next) => {
          c.set('services', mockServices())
          c.set('auth', mockAuth())
          c.set('user', mockUser('user-1', 'user'))
          c.set('session', mockSession('sess-1'))
          c.set(
            'membership' as never,
            {
              id: 'mem-1',
              joinedAt: new Date(),
              organizationId: 'org-1',
              role,
              userId: 'user-1',
            } as never
          )
          c.set('organization' as never, { id: 'org-1', name: 'Test' } as never)
          await next()
        })
        .get('/test', requireOrgOwner, (c) => c.json({ ok: true }))
    )
  }

  it('allows owner through', async () => {
    const res = await createOwnerApp('owner').request('/test')
    expect(res.status).toBe(200)
  })

  it('rejects admin with 403', async () => {
    const res = await createOwnerApp('admin').request('/test')
    expect(res.status).toBe(403)
  })

  it('rejects member with 403', async () => {
    const res = await createOwnerApp('member').request('/test')
    expect(res.status).toBe(403)
  })
})

describe('requirePermission', () => {
  it('allows when role has the permission', async () => {
    const middleware = requirePermission('org.settings.update')
    const app = withErrorHandler(
      new Hono<OrgEnv>()
        .use('*', async (c, next) => {
          c.set('services', mockServices())
          c.set('auth', mockAuth())
          c.set('user', mockUser('user-1', 'user'))
          c.set('session', mockSession('sess-1'))
          c.set(
            'membership' as never,
            {
              id: 'mem-1',
              joinedAt: new Date(),
              organizationId: 'org-1',
              role: 'admin',
              userId: 'user-1',
            } as never
          )
          c.set('organization' as never, { id: 'org-1', name: 'Test' } as never)
          await next()
        })
        .get('/test', middleware, (c) => c.json({ ok: true }))
    )

    const res = await app.request('/test')
    expect(res.status).toBe(200)
  })

  it('rejects when role lacks the permission', async () => {
    const middleware = requirePermission('org.delete')
    const app = withErrorHandler(
      new Hono<OrgEnv>()
        .use('*', async (c, next) => {
          c.set('services', mockServices())
          c.set('auth', mockAuth())
          c.set('user', mockUser('user-1', 'user'))
          c.set('session', mockSession('sess-1'))
          c.set(
            'membership' as never,
            {
              id: 'mem-1',
              joinedAt: new Date(),
              organizationId: 'org-1',
              role: 'viewer',
              userId: 'user-1',
            } as never
          )
          c.set('organization' as never, { id: 'org-1', name: 'Test' } as never)
          await next()
        })
        .get('/test', middleware, (c) => c.json({ ok: true }))
    )

    const res = await app.request('/test')
    expect(res.status).toBe(403)
    const body = (await res.json()) as { error: { message: string } }
    expect(body.error.message).toContain('org.delete')
  })
})

describe('withTeamMembership', () => {
  it('sets team and teamMembership when user is a team member', async () => {
    const user = mockUser('user-1', 'user')
    const teamRow = {
      createdAt: new Date(),
      deletedAt: null,
      description: null,
      id: 'team-1',
      name: 'Engineering',
      organizationId: 'org-1',
      updatedAt: new Date(),
    }
    const teamMembershipRow = {
      id: 'tm-1',
      joinedAt: new Date(),
      role: 'lead',
      teamId: 'team-1',
      userId: 'user-1',
    }
    const mockDb = createMockDb([teamRow, teamMembershipRow])

    let capturedTeam: unknown
    let capturedTeamMembership: unknown

    const app = withErrorHandler(
      new Hono<TeamEnv>()
        .use('*', async (c, next) => {
          c.set('services', mockServices(mockDb))
          c.set('auth', mockAuth())
          c.set('user', user)
          c.set('session', mockSession('sess-1'))
          c.set(
            'membership' as never,
            {
              id: 'mem-1',
              joinedAt: new Date(),
              organizationId: 'org-1',
              role: 'member',
              userId: 'user-1',
            } as never
          )
          c.set('organization' as never, { id: 'org-1', name: 'Test' } as never)
          await next()
        })
        .get('/orgs/:orgId/teams/:teamId/test', withTeamMembership, (c) => {
          capturedTeam = c.get('team' as never)
          capturedTeamMembership = c.get('teamMembership' as never)
          return c.json({ ok: true })
        }) as unknown
    )

    const res = await app.request('/orgs/org-1/teams/team-1/test')
    expect(res.status).toBe(200)
    expect(capturedTeam).toStrictEqual(teamRow)
    expect(capturedTeamMembership).toStrictEqual(teamMembershipRow)
  })

  it('returns 404 when team does not exist', async () => {
    const user = mockUser('user-1', 'user')
    const mockDb = createMockDb([null])

    const app = withErrorHandler(
      new Hono<TeamEnv>()
        .use('*', async (c, next) => {
          c.set('services', mockServices(mockDb))
          c.set('auth', mockAuth())
          c.set('user', user)
          c.set('session', mockSession('sess-1'))
          c.set(
            'membership' as never,
            {
              id: 'mem-1',
              joinedAt: new Date(),
              organizationId: 'org-1',
              role: 'member',
              userId: 'user-1',
            } as never
          )
          c.set('organization' as never, { id: 'org-1', name: 'Test' } as never)
          await next()
        })
        .get('/orgs/:orgId/teams/:teamId/test', withTeamMembership, (c) =>
          c.json({ ok: true })
        ) as unknown
    )

    const res = await app.request('/orgs/org-1/teams/nonexistent/test')
    expect(res.status).toBe(404)
  })

  it('returns 403 when team belongs to different org', async () => {
    const user = mockUser('user-1', 'user')
    const mockDb = createMockDb([
      {
        createdAt: new Date(),
        deletedAt: null,
        description: null,
        id: 'team-1',
        name: 'Eng',
        organizationId: 'org-other',
        updatedAt: new Date(),
      },
    ])

    const app = withErrorHandler(
      new Hono<TeamEnv>()
        .use('*', async (c, next) => {
          c.set('services', mockServices(mockDb))
          c.set('auth', mockAuth())
          c.set('user', user)
          c.set('session', mockSession('sess-1'))
          c.set(
            'membership' as never,
            {
              id: 'mem-1',
              joinedAt: new Date(),
              organizationId: 'org-1',
              role: 'member',
              userId: 'user-1',
            } as never
          )
          c.set('organization' as never, { id: 'org-1', name: 'Test' } as never)
          await next()
        })
        .get('/orgs/:orgId/teams/:teamId/test', withTeamMembership, (c) =>
          c.json({ ok: true })
        ) as unknown
    )

    const res = await app.request('/orgs/org-1/teams/team-1/test')
    expect(res.status).toBe(403)
  })

  it('sets teamMembership to null when user is not a team member', async () => {
    const user = mockUser('user-1', 'user')
    const mockDb = createMockDb([
      {
        createdAt: new Date(),
        deletedAt: null,
        description: null,
        id: 'team-1',
        name: 'Eng',
        organizationId: 'org-1',
        updatedAt: new Date(),
      },
      null,
    ])

    let capturedTeamMembership: unknown

    const app = withErrorHandler(
      new Hono<TeamEnv>()
        .use('*', async (c, next) => {
          c.set('services', mockServices(mockDb))
          c.set('auth', mockAuth())
          c.set('user', user)
          c.set('session', mockSession('sess-1'))
          c.set(
            'membership' as never,
            {
              id: 'mem-1',
              joinedAt: new Date(),
              organizationId: 'org-1',
              role: 'member',
              userId: 'user-1',
            } as never
          )
          c.set('organization' as never, { id: 'org-1', name: 'Test' } as never)
          await next()
        })
        .get('/orgs/:orgId/teams/:teamId/test', withTeamMembership, (c) => {
          capturedTeamMembership = c.get('teamMembership' as never)
          return c.json({ ok: true })
        }) as unknown
    )

    const res = await app.request('/orgs/org-1/teams/team-1/test')
    expect(res.status).toBe(200)
    expect(capturedTeamMembership).toBeNull()
  })
})

describe('requireTeamPermission', () => {
  function createTeamPermissionApp(orgRole: string, teamRole: string | null, action: string) {
    const middleware = requireTeamPermission(action as 'team.update')
    return withErrorHandler(
      new Hono<TeamEnv>()
        .use('*', async (c, next) => {
          c.set('services', mockServices())
          c.set('auth', mockAuth())
          c.set('user', mockUser('user-1', 'user'))
          c.set('session', mockSession('sess-1'))
          c.set(
            'membership' as never,
            {
              id: 'mem-1',
              joinedAt: new Date(),
              organizationId: 'org-1',
              role: orgRole,
              userId: 'user-1',
            } as never
          )
          c.set('organization' as never, { id: 'org-1', name: 'Test' } as never)
          c.set('team' as never, { id: 'team-1', name: 'Eng', organizationId: 'org-1' } as never)
          c.set(
            'teamMembership' as never,
            teamRole
              ? ({
                  id: 'tm-1',
                  joinedAt: new Date(),
                  role: teamRole,
                  teamId: 'team-1',
                  userId: 'user-1',
                } as never)
              : (null as never)
          )
          await next()
        })
        .get('/test', middleware, (c) => c.json({ ok: true })) as unknown
    )
  }

  it('allows org owner for any team action', async () => {
    const res = await createTeamPermissionApp('owner', null, 'team.delete').request('/test')
    expect(res.status).toBe(200)
  })

  it('allows org admin for team.update', async () => {
    const res = await createTeamPermissionApp('admin', null, 'team.update').request('/test')
    expect(res.status).toBe(200)
  })

  it('allows team lead for team.settings.update', async () => {
    const res = await createTeamPermissionApp('member', 'lead', 'team.settings.update').request(
      '/test'
    )
    expect(res.status).toBe(200)
  })

  it('rejects team member for team.update', async () => {
    const res = await createTeamPermissionApp('member', 'member', 'team.update').request('/test')
    expect(res.status).toBe(403)
  })

  it('rejects org viewer with no team role for team.update', async () => {
    const res = await createTeamPermissionApp('viewer', null, 'team.update').request('/test')
    expect(res.status).toBe(403)
  })
})
