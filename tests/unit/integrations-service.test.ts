import { beforeEach, describe, expect, it, vi } from 'vitest'

function createMockDb(rows: Record<string, unknown>[] = []) {
  const limitFn = vi.fn().mockResolvedValue(rows)
  const orderByAfterWhere = vi.fn().mockReturnValue({ limit: limitFn })
  const whereResult: Record<string, unknown> = {
    limit: limitFn,
    orderBy: orderByAfterWhere,
  }
  // Make whereResult thenable so `await db.select().from().where()` resolves to rows
  whereResult.then = (resolve: (v: unknown) => void) => Promise.resolve(rows).then(resolve)
  whereResult.catch = () => rows

  const whereFn = vi.fn().mockReturnValue(whereResult)
  const orderByFn = vi.fn().mockReturnValue({ limit: limitFn, where: whereFn })

  const whereUpdateFn = vi.fn().mockResolvedValue(undefined)
  const setFn = vi.fn().mockReturnValue({ where: whereUpdateFn })
  const valuesFn = vi.fn().mockResolvedValue(undefined)
  const insertFn = vi.fn().mockReturnValue({ values: valuesFn })
  const updateFn = vi.fn().mockReturnValue({ set: setFn })
  const fromFn = vi.fn().mockReturnValue({
    orderBy: orderByFn,
    where: whereFn,
  })

  return {
    _insertFn: insertFn,
    _setFn: setFn,
    _updateFn: updateFn,
    _valuesFn: valuesFn,
    _whereFn: whereFn,
    insert: insertFn,
    select: vi.fn().mockReturnValue({ from: fromFn }),
    update: updateFn,
  } as unknown
}

describe('integrations service module', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('exports all required functions', { timeout: 30_000 }, async () => {
    const mod = await import('$lib/server/integrations/service')
    expect(typeof mod.listIntegrations).toBe('function')
    expect(typeof mod.createIntegration).toBe('function')
    expect(typeof mod.updateIntegrationTokens).toBe('function')
    expect(typeof mod.disconnectIntegration).toBe('function')
    expect(typeof mod.getIntegration).toBe('function')
    expect(typeof mod.checkIntegrationHealth).toBe('function')
    expect(typeof mod.listAllIntegrations).toBe('function')
  })
})

describe('createIntegration', () => {
  it('inserts integration with correct values', async () => {
    const { createIntegration } = await import('$lib/server/integrations/service')
    const db = createMockDb()

    const result = await createIntegration(db, {
      accessToken: 'ghp_test123',
      provider: 'github',
      scopes: ['repo', 'user'],
      userId: 'user-1',
    })

    expect(result.provider).toBe('github')
    expect(result.id).toBeDefined()
    expect(db._insertFn).toHaveBeenCalledTimes(1)
    const values = db._valuesFn.mock.calls[0][0] as Record<string, unknown>
    expect(values.provider).toBe('github')
    expect(values.accessToken).toBe('ghp_test123')
    expect(values.scopes).toEqual(['repo', 'user'])
    expect(values.status).toBe('active')
    expect(values.userId).toBe('user-1')
  })

  it('accepts optional fields', async () => {
    const { createIntegration } = await import('$lib/server/integrations/service')
    const db = createMockDb()
    const expiresAt = new Date('2026-12-01')

    await createIntegration(db, {
      accessToken: 'xoxb-test',
      expiresAt,
      externalAccountId: 'T12345',
      metadata: { teamName: 'My Team' },
      organizationId: 'org-1',
      provider: 'slack',
      refreshToken: 'refresh-123',
      scopes: ['chat:read'],
      userId: 'user-1',
    })

    const values = db._valuesFn.mock.calls[0][0] as Record<string, unknown>
    expect(values.tokenExpiresAt).toEqual(expiresAt)
    expect(values.externalAccountId).toBe('T12345')
    expect(values.organizationId).toBe('org-1')
    expect(values.refreshToken).toBe('refresh-123')
  })
})

describe('disconnectIntegration', () => {
  it('sets status to disconnected', async () => {
    const { disconnectIntegration } = await import('$lib/server/integrations/service')
    const db = createMockDb([{ id: 'int-1' }])

    const result = await disconnectIntegration(db, 'int-1', 'user-1')

    expect(result).toEqual({ id: 'int-1' })
    const setArg = db._setFn.mock.calls[0][0] as Record<string, unknown>
    expect(setArg.status).toBe('disconnected')
    expect(setArg.accessToken).toBe('')
    expect(setArg.refreshToken).toBeNull()
  })

  it('returns null when integration not found', async () => {
    const { disconnectIntegration } = await import('$lib/server/integrations/service')
    const db = createMockDb([])

    const result = await disconnectIntegration(db, 'int-missing', 'user-1')

    expect(result).toBeNull()
  })
})

describe('updateIntegrationTokens', () => {
  it('updates token fields and sets status to active', async () => {
    const { updateIntegrationTokens } = await import('$lib/server/integrations/service')
    const db = createMockDb()
    const expiresAt = new Date('2027-01-01')

    await updateIntegrationTokens(db, 'int-1', {
      accessToken: 'new-token',
      expiresAt,
      refreshToken: 'new-refresh',
    })

    const setArg = db._setFn.mock.calls[0][0] as Record<string, unknown>
    expect(setArg.accessToken).toBe('new-token')
    expect(setArg.tokenExpiresAt).toEqual(expiresAt)
    expect(setArg.refreshToken).toBe('new-refresh')
    expect(setArg.status).toBe('active')
    expect(setArg.lastSyncedAt).toBeInstanceOf(Date)
  })
})

describe('getIntegration', () => {
  it('returns integration row', async () => {
    const { getIntegration } = await import('$lib/server/integrations/service')
    const db = createMockDb([{ id: 'int-1', provider: 'github' }])

    const result = await getIntegration(db, 'int-1', 'user-1')

    expect(result).toEqual({ id: 'int-1', provider: 'github' })
  })

  it('returns null when not found', async () => {
    const { getIntegration } = await import('$lib/server/integrations/service')
    const db = createMockDb([])

    const result = await getIntegration(db, 'int-missing', 'user-1')

    expect(result).toBeNull()
  })
})

describe('checkIntegrationHealth', () => {
  it('returns active status for valid integration', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ ok: true }),
    } as Response)

    const { checkIntegrationHealth } = await import('$lib/server/integrations/service')
    const db = createMockDb([
      {
        accessToken: 'valid-token',
        id: 'int-1',
        provider: 'github',
        status: 'active',
        tokenExpiresAt: new Date('2099-01-01'),
      },
    ])

    const result = await checkIntegrationHealth(db, 'int-1')

    expect(result).toEqual({ id: 'int-1', provider: 'github', status: 'active' })
    fetchSpy.mockRestore()
  })

  it('returns expired status when token is expired', async () => {
    const { checkIntegrationHealth } = await import('$lib/server/integrations/service')
    const db = createMockDb([
      {
        accessToken: 'expired-token',
        id: 'int-2',
        provider: 'slack',
        status: 'active',
        tokenExpiresAt: new Date('2020-01-01'),
      },
    ])

    const result = await checkIntegrationHealth(db, 'int-2')

    expect(result?.status).toBe('expired')
  })

  it('returns error status when provider ping fails', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: false } as Response)

    vi.resetModules()
    const { checkIntegrationHealth } = await import('$lib/server/integrations/service')
    const db = createMockDb([
      {
        accessToken: 'bad-token',
        id: 'int-3',
        provider: 'github',
        status: 'active',
        tokenExpiresAt: new Date('2099-01-01'),
      },
    ])

    const result = await checkIntegrationHealth(db, 'int-3')

    expect(result?.status).toBe('error')
    fetchSpy.mockRestore()
  })

  it('returns null when integration not found', async () => {
    const { checkIntegrationHealth } = await import('$lib/server/integrations/service')
    const db = createMockDb([])

    const result = await checkIntegrationHealth(db, 'int-missing')

    expect(result).toBeNull()
  })
})

describe('listAllIntegrations', () => {
  it('returns integrations with default limit', async () => {
    const { listAllIntegrations } = await import('$lib/server/integrations/service')
    const db = createMockDb([{ id: 'int-1' }])

    const result = await listAllIntegrations(db)

    expect(result).toEqual([{ id: 'int-1' }])
  })

  it('accepts filter options', async () => {
    const { listAllIntegrations } = await import('$lib/server/integrations/service')
    const db = createMockDb([{ id: 'int-1' }])

    await listAllIntegrations(db, { limit: 10, provider: 'github', status: 'active' })

    // The where function should have been called with filter conditions
    expect(db._whereFn).toHaveBeenCalled()
  })
})
