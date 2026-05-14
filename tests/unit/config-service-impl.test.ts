import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('$lib/server/db/schema', () => ({
  configVersion: {
    changedBy: 'changedBy',
    configKey: 'configKey',
    createdAt: 'createdAt',
    environment: 'environment',
    id: 'id',
    newValue: 'newValue',
    oldValue: 'oldValue',
  },
  systemConfig: {
    description: 'description',
    environment: 'environment',
    id: 'id',
    key: 'key',
    type: 'type',
    updatedBy: 'updatedBy',
    value: 'value',
  },
}))

vi.mock('$lib/server/uuid', () => ({
  uuid: () => 'test-uuid-config',
}))

describe('config-service impl', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  function createMockDb(configRows: Record<string, unknown>[] = []) {
    const setFn = vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) })
    const insertFn = vi.fn().mockReturnValue({ values: vi.fn().mockResolvedValue(undefined) })

    return {
      _insertFn: insertFn,
      _setFn: setFn,
      insert: insertFn,
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(configRows),
          orderBy: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              offset: vi.fn().mockResolvedValue(configRows),
            }),
          }),
        }),
      }),
      update: vi.fn().mockReturnValue({ set: setFn }),
    } as unknown
  }

  describe('getConfigValue', () => {
    it('returns config when found', async () => {
      const { getConfigValue } = await import('$lib/server/config-service')
      const rows = [{ key: 'app.name', value: 'Vibekit' }]
      const db = createMockDb(rows)
      const result = await getConfigValue(db, 'app.name')
      expect(result).not.toBeNull()
      expect(result?.key).toBe('app.name')
    })

    it('returns null when not found', async () => {
      const { getConfigValue } = await import('$lib/server/config-service')
      const db = createMockDb([])
      expect(await getConfigValue(db, 'missing.key')).toBeNull()
    })

    it('checks environment-specific key first', async () => {
      const { getConfigValue } = await import('$lib/server/config-service')
      let selectCount = 0
      const db = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockImplementation(() => {
              selectCount++
              if (selectCount === 1)
                return Promise.resolve([{ key: 'app.name:staging', value: 'Staging' }])
              return Promise.resolve([])
            }),
          }),
        }),
      } as never
      const result = await getConfigValue(db, 'app.name', 'staging')
      expect(result?.key).toBe('app.name:staging')
    })

    it('falls back to base key when env-specific not found', async () => {
      const { getConfigValue } = await import('$lib/server/config-service')
      let selectCount = 0
      const db = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockImplementation(() => {
              selectCount++
              if (selectCount === 1) return Promise.resolve([])
              return Promise.resolve([{ key: 'app.name', value: 'Vibekit' }])
            }),
          }),
        }),
      } as never
      const result = await getConfigValue(db, 'app.name', 'production')
      expect(result?.key).toBe('app.name')
    })
  })

  describe('setConfigValue', () => {
    it('inserts new config when not existing', async () => {
      const { setConfigValue } = await import('$lib/server/config-service')
      const db = createMockDb([])
      const result = await setConfigValue(db, {
        changedBy: 'admin-1',
        key: 'app.theme',
        value: 'dark',
      })
      expect(result.key).toBe('app.theme')
      expect(result.value).toBe('dark')
      expect(db._insertFn).toHaveBeenCalledTimes(2) // config + version
    })

    it('updates existing config', async () => {
      const { setConfigValue } = await import('$lib/server/config-service')
      const db = createMockDb([{ key: 'app.theme', value: 'light' }])
      const result = await setConfigValue(db, {
        key: 'app.theme',
        value: 'dark',
      })
      expect(result.value).toBe('dark')
      expect(db._setFn).toHaveBeenCalled()
      expect(db._insertFn).toHaveBeenCalledTimes(1) // version only
    })

    it('uses environment-prefixed key', async () => {
      const { setConfigValue } = await import('$lib/server/config-service')
      const db = createMockDb([])
      const result = await setConfigValue(db, {
        environment: 'staging',
        key: 'app.debug',
        value: 'true',
      })
      expect(result.key).toBe('app.debug:staging')
    })
  })

  describe('getConfigHistory', () => {
    it('returns history entries', async () => {
      const { getConfigHistory } = await import('$lib/server/config-service')
      const history = [
        { configKey: 'app.theme', newValue: 'dark', oldValue: 'light' },
        { configKey: 'app.theme', newValue: 'light', oldValue: 'default' },
      ]
      const db = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                offset: vi.fn().mockResolvedValue(history),
              }),
            }),
          }),
        }),
      } as never
      const result = await getConfigHistory(db)
      expect(result).toHaveLength(2)
    })

    it('filters by key when provided', async () => {
      const { getConfigHistory } = await import('$lib/server/config-service')
      const history = [{ configKey: 'app.theme', newValue: 'dark' }]
      const db = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  offset: vi.fn().mockResolvedValue(history),
                }),
              }),
            }),
          }),
        }),
      } as never
      const result = await getConfigHistory(db, 'app.theme')
      expect(result).toHaveLength(1)
    })
  })

  describe('resolveConfig', () => {
    it('resolves multiple keys', async () => {
      const { resolveConfig } = await import('$lib/server/config-service')
      let selectCount = 0
      const db = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockImplementation(() => {
              selectCount++
              return Promise.resolve([{ value: selectCount === 1 ? 'Vibekit' : 'dark' }])
            }),
          }),
        }),
      } as never
      const result = await resolveConfig(db, ['app.name', 'app.theme'])
      expect(result['app.name']).toBe('Vibekit')
      expect(result['app.theme']).toBe('dark')
    })

    it('skips missing keys', async () => {
      const { resolveConfig } = await import('$lib/server/config-service')
      let selectCount = 0
      const db = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockImplementation(() => {
              selectCount++
              return selectCount === 1
                ? Promise.resolve([{ value: 'Vibekit' }])
                : Promise.resolve([])
            }),
          }),
        }),
      } as never
      const result = await resolveConfig(db, ['app.name', 'missing.key'])
      expect(result['app.name']).toBe('Vibekit')
      expect(result['missing.key']).toBeUndefined()
    })

    it('returns empty object for empty keys', async () => {
      const { resolveConfig } = await import('$lib/server/config-service')
      const db = createMockDb([])
      const result = await resolveConfig(db, [])
      expect(result).toEqual({})
    })
  })
})
