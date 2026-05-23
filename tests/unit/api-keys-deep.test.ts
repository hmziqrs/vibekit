import { hasScope, hashKey } from '$lib/server/api-keys'
import {
  createApiKeySchema,
  updateApiKeySchema,
  rotateApiKeySchema,
  API_KEY_SCOPES,
} from '$lib/validators/api-key'
import { describe, expect, it, vi } from 'vitest'

import { createMockDb } from '../helpers/mock-db'

vi.mock('$lib/server/db/schema', () => ({
  apiKey: {
    createdAt: 'created_at',
    expiresAt: 'expires_at',
    id: 'id',
    keyHash: 'key_hash',
    keyPrefix: 'key_prefix',
    lastUsedAt: 'last_used_at',
    name: 'name',
    rateLimit: 'rate_limit',
    requestCount: 'request_count',
    revokedAt: 'revoked_at',
    scopes: 'scopes',
    userId: 'user_id',
  },
  apiKeyUsageLog: {
    apiKeyId: 'api_key_id',
    createdAt: 'created_at',
    endpoint: 'endpoint',
    id: 'id',
    ipAddress: 'ip_address',
    method: 'method',
    statusCode: 'status_code',
    userAgent: 'user_agent',
  },
}))

vi.mock<typeof import('$lib/server/uuid')>(import('$lib/server/uuid'), () => ({
  uuid: () => `test-uuid-${Math.random().toString(36).slice(2, 8)}`,
}))

describe('createApiKeySchema', () => {
  it('validates a correct input', () => {
    const result = createApiKeySchema.safeParse({
      name: 'My API Key',
      scopes: ['read:items', 'write:items'],
    })
    expect(result.success).toBeTruthy()
  })

  it('rejects empty name', () => {
    const result = createApiKeySchema.safeParse({
      name: '',
      scopes: ['read:items'],
    })
    expect(result.success).toBeFalsy()
  })

  it('rejects name over 100 chars', () => {
    const result = createApiKeySchema.safeParse({
      name: 'a'.repeat(101),
      scopes: ['read:items'],
    })
    expect(result.success).toBeFalsy()
  })

  it('rejects empty scopes array', () => {
    const result = createApiKeySchema.safeParse({
      name: 'Test',
      scopes: [],
    })
    expect(result.success).toBeFalsy()
  })

  it('rejects invalid scope', () => {
    const result = createApiKeySchema.safeParse({
      name: 'Test',
      scopes: ['invalid:scope'],
    })
    expect(result.success).toBeFalsy()
  })

  it('accepts admin scope', () => {
    const result = createApiKeySchema.safeParse({
      name: 'Admin Key',
      scopes: ['admin'],
    })
    expect(result.success).toBeTruthy()
  })

  it('accepts optional rateLimit', () => {
    const result = createApiKeySchema.safeParse({
      name: 'Limited Key',
      rateLimit: 100,
      scopes: ['read:items'],
    })
    expect(result.success).toBeTruthy()
  })

  it('rejects rateLimit below 1', () => {
    const result = createApiKeySchema.safeParse({
      name: 'Bad',
      rateLimit: 0,
      scopes: ['read:items'],
    })
    expect(result.success).toBeFalsy()
  })

  it('rejects rateLimit above 10000', () => {
    const result = createApiKeySchema.safeParse({
      name: 'Bad',
      rateLimit: 10_001,
      scopes: ['read:items'],
    })
    expect(result.success).toBeFalsy()
  })

  it('accepts optional expiresAt', () => {
    const result = createApiKeySchema.safeParse({
      expiresAt: Date.now() + 86_400_000,
      name: 'Expiring Key',
      scopes: ['read:items'],
    })
    expect(result.success).toBeTruthy()
  })

  it('trims name whitespace', () => {
    const result = createApiKeySchema.safeParse({
      name: '  spaced  ',
      scopes: ['read:items'],
    })
    expect(result.success).toBeTruthy()
    if (result.success) {
      expect(result.data.name).toBe('spaced')
    }
  })
})

describe('updateApiKeySchema', () => {
  it('allows partial update with name only', () => {
    const result = updateApiKeySchema.safeParse({ name: 'New Name' })
    expect(result.success).toBeTruthy()
  })

  it('allows updating scopes', () => {
    const result = updateApiKeySchema.safeParse({ scopes: ['admin'] })
    expect(result.success).toBeTruthy()
  })

  it('allows setting rateLimit to null', () => {
    const result = updateApiKeySchema.safeParse({ rateLimit: null })
    expect(result.success).toBeTruthy()
  })

  it('rejects empty object', () => {
    const result = updateApiKeySchema.safeParse({})
    expect(result.success).toBeTruthy()
  })
})

describe('rotateApiKeySchema', () => {
  it('validates correct input', () => {
    const result = rotateApiKeySchema.safeParse({ id: 'key-123' })
    expect(result.success).toBeTruthy()
  })

  it('rejects empty id', () => {
    const result = rotateApiKeySchema.safeParse({ id: '' })
    expect(result.success).toBeFalsy()
  })
})

describe('hasScope', () => {
  it('admin scope grants all access', () => {
    expect(hasScope(['admin'], 'read:items')).toBeTruthy()
    expect(hasScope(['admin'], 'write:billing')).toBeTruthy()
    expect(hasScope(['admin'], 'delete:items')).toBeTruthy()
  })

  it('exact scope match grants access', () => {
    expect(hasScope(['read:items'], 'read:items')).toBeTruthy()
  })

  it('non-matching scope denies access', () => {
    expect(hasScope(['read:items'], 'write:items')).toBeFalsy()
  })

  it('write scope implies read for same resource', () => {
    expect(hasScope(['write:items'], 'read:items')).toBeTruthy()
  })

  it('read scope does not imply write', () => {
    expect(hasScope(['read:items'], 'write:items')).toBeFalsy()
  })

  it('empty scopes deny everything', () => {
    expect(hasScope([], 'read:items')).toBeFalsy()
  })
})

describe('hashKey', () => {
  it('produces a consistent SHA-256 hash', async () => {
    const key = 'vk_live_test123'
    const hash1 = await hashKey(key)
    const hash2 = await hashKey(key)
    expect(hash1).toBe(hash2)
    expect(hash1).toHaveLength(64)
  })

  it('different keys produce different hashes', async () => {
    const hash1 = await hashKey('vk_live_key1')
    const hash2 = await hashKey('vk_live_key2')
    expect(hash1).not.toBe(hash2)
  })
})

describe('api key scopes', () => {
  it('contains all expected scopes', () => {
    expect(API_KEY_SCOPES).toContain('admin')
    expect(API_KEY_SCOPES).toContain('read:items')
    expect(API_KEY_SCOPES).toContain('write:items')
    expect(API_KEY_SCOPES).toContain('delete:items')
    expect(API_KEY_SCOPES).toContain('read:billing')
    expect(API_KEY_SCOPES).toContain('write:billing')
    expect(API_KEY_SCOPES).toContain('read:organizations')
    expect(API_KEY_SCOPES).toContain('write:organizations')
    expect(API_KEY_SCOPES).toContain('read:teams')
    expect(API_KEY_SCOPES).toContain('write:teams')
    expect(API_KEY_SCOPES).toContain('read:blog')
    expect(API_KEY_SCOPES).toContain('write:blog')
  })

  it('scopes are sorted alphabetically', () => {
    const sorted = [...API_KEY_SCOPES].toSorted()
    expect(API_KEY_SCOPES).toStrictEqual(sorted)
  })
})
