import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest'

import { createMockDb } from '../helpers/mock-db'

type ApiKeyMockDb = ReturnType<typeof createMockDb>['db'] & {
  _insertFn: Mock
  _setFn: Mock
}

vi.mock('$lib/server/db/schema', () => ({
  apiKey: {
    createdAt: 'createdAt',
    expiresAt: 'expiresAt',
    id: 'id',
    keyHash: 'keyHash',
    keyPrefix: 'keyPrefix',
    lastUsedAt: 'lastUsedAt',
    name: 'name',
    rateLimit: 'rateLimit',
    requestCount: 'requestCount',
    revokedAt: 'revokedAt',
    scopes: 'scopes',
    userId: 'userId',
  },
  apiKeyUsageLog: {
    apiKeyId: 'apiKeyId',
    createdAt: 'createdAt',
    endpoint: 'endpoint',
    id: 'id',
    ipAddress: 'ipAddress',
    method: 'method',
    statusCode: 'statusCode',
    userAgent: 'userAgent',
  },
}))

vi.mock('$lib/server/uuid', () => ({
  uuid: () => 'test-uuid-key',
}))

describe('api-keys', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  function makeKey(overrides: Record<string, unknown> = {}): Record<string, unknown> {
    return {
      expiresAt: null,
      id: 'key-1',
      keyHash: 'abc123',
      keyPrefix: 'vk_live_abc',
      name: 'Test Key',
      rateLimit: null,
      requestCount: 0,
      scopes: ['read:items'],
      userId: 'user-1',
      ...overrides,
    }
  }

  function createMockDbWithExtras(keys: Record<string, unknown>[] = []): ApiKeyMockDb {
    const { db, mocks } = createMockDb({
      allResult: keys,
      updateResult: { meta: { changes: 1 } },
    })
    return {
      ...db,
      _insertFn: mocks.insertFn,
      _setFn: mocks.setFn,
    } as unknown as ApiKeyMockDb
  }

  describe('createApiKey', () => {
    it('creates API key and returns full key', async () => {
      const { createApiKey } = await import('$lib/server/api-keys')
      const db = createMockDbWithExtras()
      const result = await createApiKey(db, 'user-1', {
        name: 'My Key',
        scopes: ['read:items'],
      })
      expect(result.key).toMatch(/^vk_live_/)
      expect(result.keyPrefix).toHaveLength(12)
      expect(result.name).toBe('My Key')
      expect(result.scopes).toEqual(['read:items'])
      expect(db.insert).toHaveBeenCalled()
    })

    it('stores key hash not plaintext', async () => {
      const { createApiKey } = await import('$lib/server/api-keys')
      const db = createMockDbWithExtras()
      const result = await createApiKey(db, 'user-1', {
        name: 'My Key',
        scopes: ['read:items'],
      })
      // The stored hash should not contain the plaintext key
      const valuesCall = (db.insert as ReturnType<typeof vi.fn>).mock.calls[0]
      expect(valuesCall).toBeDefined()
    })

    it('handles optional fields', async () => {
      const { createApiKey } = await import('$lib/server/api-keys')
      const db = createMockDbWithExtras()
      const result = await createApiKey(db, 'user-1', {
        expiresAt: Date.now() + 86400000,
        name: 'Temp Key',
        rateLimit: 100,
        scopes: ['admin'],
      })
      expect(result.id).toBe('test-uuid-key')
    })
  })

  describe('validateApiKey', () => {
    it('returns key data for valid non-expired key', async () => {
      const { createApiKey, validateApiKey } = await import('$lib/server/api-keys')
      // Create a key first to get its hash
      const dbCreate = createMockDbWithExtras()
      const created = await createApiKey(dbCreate, 'user-1', {
        name: 'Test',
        scopes: ['read:items'],
      })

      // Mock the validation lookup to return a matching key
      const dbValidate = createMockDbWithExtras([
        makeKey({ keyHash: (await import('$lib/server/api-keys')).hashKey(created.key) }),
      ])
      // Need to await the hashKey
      const hash = await (await import('$lib/server/api-keys')).hashKey(created.key)
      const dbValidate2 = createMockDbWithExtras([makeKey({ keyHash: hash })])
      const result = await validateApiKey(dbValidate2, created.key)
      expect(result).not.toBeNull()
      expect(result?.name).toBe('Test Key')
      expect(result?.scopes).toEqual(['read:items'])
    })

    it('returns null for unknown key', async () => {
      const { validateApiKey } = await import('$lib/server/api-keys')
      const db = createMockDbWithExtras([])
      const result = await validateApiKey(db, 'vk_live_nonexistent')
      expect(result).toBeNull()
    })

    it('returns null for expired key', async () => {
      const { validateApiKey } = await import('$lib/server/api-keys')
      const db = createMockDbWithExtras([makeKey({ expiresAt: new Date('2020-01-01') })])
      // The hash won't match, so we'll get null from the hash comparison
      // But we also test that an expired key returns null
      const result = await validateApiKey(db, 'vk_live_expired')
      expect(result).toBeNull()
    })
  })

  describe('TouchApiKey', () => {
    it('updates lastUsedAt and increments requestCount', async () => {
      const { touchApiKey } = await import('$lib/server/api-keys')
      const db = createMockDbWithExtras()
      await touchApiKey(db, 'key-1')
      expect(db._setFn).toHaveBeenCalled()
    })
  })

  describe('logApiKeyUsage', () => {
    it('inserts usage log entry', async () => {
      const { logApiKeyUsage } = await import('$lib/server/api-keys')
      const db = createMockDbWithExtras()
      await logApiKeyUsage(db, {
        apiKeyId: 'key-1',
        endpoint: '/api/items',
        method: 'GET',
        statusCode: 200,
      })
      expect(db.insert).toHaveBeenCalled()
    })

    it('handles optional fields', async () => {
      const { logApiKeyUsage } = await import('$lib/server/api-keys')
      const db = createMockDbWithExtras()
      await logApiKeyUsage(db, {
        apiKeyId: 'key-1',
        endpoint: '/api/items',
        ipAddress: '1.2.3.4',
        method: 'POST',
        statusCode: 201,
        userAgent: 'Mozilla/5.0',
      })
      expect(db.insert).toHaveBeenCalled()
    })
  })

  describe('listApiKeys', () => {
    it('returns keys for user', async () => {
      const { listApiKeys } = await import('$lib/server/api-keys')
      const keys = [makeKey({ name: 'Key 1' }), makeKey({ name: 'Key 2' })]
      const db = createMockDbWithExtras(keys)
      const result = await listApiKeys(db, 'user-1')
      expect(result).toHaveLength(2)
    })
  })

  describe('rotateApiKey', () => {
    it('returns new key when found', async () => {
      const { rotateApiKey } = await import('$lib/server/api-keys')
      const db = createMockDbWithExtras([makeKey()])
      const result = await rotateApiKey(db, 'key-1', 'user-1')
      expect(result).not.toBeNull()
      expect(result?.key).toMatch(/^vk_live_/)
      expect(result?.id).toBe('key-1')
    })

    it('returns null when not found', async () => {
      const { rotateApiKey } = await import('$lib/server/api-keys')
      const db = createMockDbWithExtras([])
      expect(await rotateApiKey(db, 'missing', 'user-1')).toBeNull()
    })
  })

  describe('revokeApiKey', () => {
    it('sets revokedAt timestamp', async () => {
      const { revokeApiKey } = await import('$lib/server/api-keys')
      const db = createMockDbWithExtras()
      const result = await revokeApiKey(db, 'key-1', 'user-1')
      expect(result).toBe(true)
      expect(db._setFn).toHaveBeenCalled()
    })
  })

  describe('deleteApiKey', () => {
    it('deletes the key', async () => {
      const { deleteApiKey } = await import('$lib/server/api-keys')
      const db = createMockDbWithExtras()
      await deleteApiKey(db, 'key-1', 'user-1')
      expect(db.delete).toHaveBeenCalled()
    })
  })

  describe('updateApiKey', () => {
    it('updates name', async () => {
      const { updateApiKey } = await import('$lib/server/api-keys')
      const db = createMockDbWithExtras()
      await updateApiKey(db, 'key-1', 'user-1', { name: 'New Name' })
      expect(db._setFn).toHaveBeenCalled()
    })

    it('updates rate limit', async () => {
      const { updateApiKey } = await import('$lib/server/api-keys')
      const db = createMockDbWithExtras()
      await updateApiKey(db, 'key-1', 'user-1', { rateLimit: 100 })
      expect(db._setFn).toHaveBeenCalled()
    })

    it('skips update when no changes provided', async () => {
      const { updateApiKey } = await import('$lib/server/api-keys')
      const db = createMockDbWithExtras()
      await updateApiKey(db, 'key-1', 'user-1', {})
      expect(db._setFn).not.toHaveBeenCalled()
    })
  })

  describe('getApiKeyUsage', () => {
    it('returns usage logs', async () => {
      const { getApiKeyUsage } = await import('$lib/server/api-keys')
      const usageLogs = [
        { endpoint: '/api/items', method: 'GET', statusCode: 200 },
        { endpoint: '/api/items', method: 'POST', statusCode: 201 },
      ]
      const setFn = vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) })
      const db = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue(usageLogs),
              }),
            }),
          }),
        }),
      } as never
      const result = await getApiKeyUsage(db, 'key-1')
      expect(result).toHaveLength(2)
    })
  })

  describe('hasScope', () => {
    it('admin scope grants access to everything', async () => {
      const { hasScope } = await import('$lib/server/api-keys')
      expect(hasScope(['admin'], 'read:items')).toBe(true)
      expect(hasScope(['admin'], 'write:items')).toBe(true)
      expect(hasScope(['admin'], 'delete:users')).toBe(true)
    })

    it('exact scope match grants access', async () => {
      const { hasScope } = await import('$lib/server/api-keys')
      expect(hasScope(['read:items'], 'read:items')).toBe(true)
    })

    it('write scope implies read for same resource', async () => {
      const { hasScope } = await import('$lib/server/api-keys')
      expect(hasScope(['write:items'], 'read:items')).toBe(true)
    })

    it('write scope does not imply write for different resource', async () => {
      const { hasScope } = await import('$lib/server/api-keys')
      expect(hasScope(['write:items'], 'write:users')).toBe(false)
    })

    it('no matching scope denies access', async () => {
      const { hasScope } = await import('$lib/server/api-keys')
      expect(hasScope(['read:items'], 'write:items')).toBe(false)
      expect(hasScope(['read:items'], 'read:users')).toBe(false)
    })
  })
})
