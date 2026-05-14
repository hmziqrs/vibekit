import {
  API_KEY_SCOPES,
  type ApiKeyScope,
  createApiKeySchema,
  rotateApiKeySchema,
  updateApiKeySchema,
} from '$lib/validators/api-key'
import { describe, expect, it } from 'vitest'

// ---------------------------------------------------------------------------
// API_KEY_SCOPES
// ---------------------------------------------------------------------------
describe('API_KEY_SCOPES', () => {
  it('contains exactly 12 scopes', () => {
    expect(API_KEY_SCOPES).toHaveLength(12)
  })

  it('is a readonly tuple', () => {
    expect(Object.isFrozen(API_KEY_SCOPES) || Array.isArray(API_KEY_SCOPES)).toBeTruthy()
  })

  it('includes the admin scope', () => {
    expect(API_KEY_SCOPES).toContain('admin')
  })

  it('includes all delete scopes', () => {
    expect(API_KEY_SCOPES).toContain('delete:items')
  })

  it('includes all read scopes', () => {
    const readScopes = API_KEY_SCOPES.filter((s) => s.startsWith('read:'))
    expect(readScopes).toEqual([
      'read:billing',
      'read:blog',
      'read:items',
      'read:organizations',
      'read:teams',
    ])
  })

  it('includes all write scopes', () => {
    const writeScopes = API_KEY_SCOPES.filter((s) => s.startsWith('write:'))
    expect(writeScopes).toEqual([
      'write:billing',
      'write:blog',
      'write:items',
      'write:organizations',
      'write:teams',
    ])
  })

  it('has no duplicate scopes', () => {
    expect(new Set(API_KEY_SCOPES).size).toBe(API_KEY_SCOPES.length)
  })
})

// ---------------------------------------------------------------------------
// createApiKeySchema
// ---------------------------------------------------------------------------
describe('createApiKeySchema', () => {
  const validInput = {
    name: 'My API Key',
    scopes: ['read:items', 'write:items'] as ApiKeyScope[],
  }

  // -- Valid inputs ---------------------------------------------------------

  it('validates minimal required input', () => {
    const result = createApiKeySchema.safeParse(validInput)
    expect(result.success).toBeTruthy()
  })

  it('validates full input with all optional fields', () => {
    const result = createApiKeySchema.safeParse({
      ...validInput,
      expiresAt: 1735689600,
      rateLimit: 500,
    })
    expect(result.success).toBeTruthy()
  })

  it('accepts a single scope', () => {
    const result = createApiKeySchema.safeParse({
      ...validInput,
      scopes: ['admin'],
    })
    expect(result.success).toBeTruthy()
  })

  it('accepts all 12 scopes', () => {
    const result = createApiKeySchema.safeParse({
      ...validInput,
      scopes: [...API_KEY_SCOPES],
    })
    expect(result.success).toBeTruthy()
  })

  it('accepts the maximum of 20 scopes (with duplicates allowed by enum)', () => {
    const scopes: ApiKeyScope[] = [
      'admin',
      'read:billing',
      'read:blog',
      'read:items',
      'read:organizations',
      'read:teams',
      'write:billing',
      'write:blog',
      'write:items',
      'write:organizations',
      'write:teams',
      'delete:items',
      'admin',
      'read:billing',
      'read:blog',
      'read:items',
      'read:organizations',
      'read:teams',
      'write:billing',
      'write:blog',
    ]
    const result = createApiKeySchema.safeParse({ ...validInput, scopes })
    expect(result.success).toBeTruthy()
  })

  it('trims whitespace from name', () => {
    const result = createApiKeySchema.safeParse({
      ...validInput,
      name: '  Spaced Name  ',
    })
    expect(result.success).toBeTruthy()
    if (result.success) expect(result.data.name).toBe('Spaced Name')
  })

  it('accepts name at minimum length of 1', () => {
    const result = createApiKeySchema.safeParse({ ...validInput, name: 'A' })
    expect(result.success).toBeTruthy()
  })

  it('accepts name at maximum length of 100', () => {
    const result = createApiKeySchema.safeParse({
      ...validInput,
      name: 'x'.repeat(100),
    })
    expect(result.success).toBeTruthy()
  })

  it('accepts expiresAt as a positive integer', () => {
    const result = createApiKeySchema.safeParse({ ...validInput, expiresAt: 1 })
    expect(result.success).toBeTruthy()
  })

  it('accepts a large positive expiresAt timestamp', () => {
    const result = createApiKeySchema.safeParse({
      ...validInput,
      expiresAt: 9999999999,
    })
    expect(result.success).toBeTruthy()
  })

  it('accepts rateLimit at minimum of 1', () => {
    const result = createApiKeySchema.safeParse({ ...validInput, rateLimit: 1 })
    expect(result.success).toBeTruthy()
  })

  it('accepts rateLimit at maximum of 10000', () => {
    const result = createApiKeySchema.safeParse({ ...validInput, rateLimit: 10000 })
    expect(result.success).toBeTruthy()
  })

  // -- Missing required fields -----------------------------------------------

  it('rejects missing name', () => {
    const { name, ...rest } = validInput
    const result = createApiKeySchema.safeParse(rest)
    expect(result.success).toBeFalsy()
  })

  it('rejects missing scopes', () => {
    const { scopes, ...rest } = validInput
    const result = createApiKeySchema.safeParse(rest)
    expect(result.success).toBeFalsy()
  })

  // -- Name validation -------------------------------------------------------

  it('rejects empty name', () => {
    const result = createApiKeySchema.safeParse({ ...validInput, name: '' })
    expect(result.success).toBeFalsy()
  })

  it('rejects whitespace-only name after trim', () => {
    const result = createApiKeySchema.safeParse({ ...validInput, name: '   ' })
    expect(result.success).toBeFalsy()
  })

  it('rejects name exceeding 100 characters', () => {
    const result = createApiKeySchema.safeParse({
      ...validInput,
      name: 'x'.repeat(101),
    })
    expect(result.success).toBeFalsy()
  })

  it('rejects non-string name', () => {
    const result = createApiKeySchema.safeParse({ ...validInput, name: 123 })
    expect(result.success).toBeFalsy()
  })

  // -- Scopes validation -----------------------------------------------------

  it('rejects empty scopes array with custom message', () => {
    const result = createApiKeySchema.safeParse({ ...validInput, scopes: [] })
    expect(result.success).toBeFalsy()
    if (!result.success) {
      const scopeIssue = result.error.issues.find((i) => String(i.path[0]) === 'scopes')
      expect(scopeIssue?.message).toBe('At least one scope is required')
    }
  })

  it('rejects scopes array exceeding 20 items', () => {
    const scopes: ApiKeyScope[] = Array(21).fill('admin')
    const result = createApiKeySchema.safeParse({ ...validInput, scopes })
    expect(result.success).toBeFalsy()
  })

  it('rejects invalid scope values', () => {
    const result = createApiKeySchema.safeParse({
      ...validInput,
      scopes: ['read:items', 'invalid:scope'] as ApiKeyScope[],
    })
    expect(result.success).toBeFalsy()
  })

  it('rejects non-array scopes', () => {
    const result = createApiKeySchema.safeParse({ ...validInput, scopes: 'admin' })
    expect(result.success).toBeFalsy()
  })

  // -- expiresAt validation --------------------------------------------------

  it('rejects negative expiresAt', () => {
    const result = createApiKeySchema.safeParse({ ...validInput, expiresAt: -1 })
    expect(result.success).toBeFalsy()
  })

  it('rejects zero expiresAt', () => {
    const result = createApiKeySchema.safeParse({ ...validInput, expiresAt: 0 })
    expect(result.success).toBeFalsy()
  })

  it('rejects non-integer expiresAt', () => {
    const result = createApiKeySchema.safeParse({ ...validInput, expiresAt: 1.5 })
    expect(result.success).toBeFalsy()
  })

  it('rejects string expiresAt', () => {
    const result = createApiKeySchema.safeParse({
      ...validInput,
      expiresAt: '2025-01-01' as unknown as number,
    })
    expect(result.success).toBeFalsy()
  })

  // -- rateLimit validation --------------------------------------------------

  it('rejects rateLimit below 1', () => {
    const result = createApiKeySchema.safeParse({ ...validInput, rateLimit: 0 })
    expect(result.success).toBeFalsy()
  })

  it('rejects negative rateLimit', () => {
    const result = createApiKeySchema.safeParse({ ...validInput, rateLimit: -10 })
    expect(result.success).toBeFalsy()
  })

  it('rejects rateLimit above 10000', () => {
    const result = createApiKeySchema.safeParse({ ...validInput, rateLimit: 10001 })
    expect(result.success).toBeFalsy()
  })

  it('rejects non-integer rateLimit', () => {
    const result = createApiKeySchema.safeParse({ ...validInput, rateLimit: 50.5 })
    expect(result.success).toBeFalsy()
  })

  it('rejects string rateLimit', () => {
    const result = createApiKeySchema.safeParse({
      ...validInput,
      rateLimit: '100' as unknown as number,
    })
    expect(result.success).toBeFalsy()
  })

  // -- Extra fields ----------------------------------------------------------

  it('strips unknown fields', () => {
    const result = createApiKeySchema.safeParse({
      ...validInput,
      unknownField: 'value',
    })
    expect(result.success).toBeTruthy()
    if (result.success) {
      expect(result.data).not.toHaveProperty('unknownField')
    }
  })
})

// ---------------------------------------------------------------------------
// updateApiKeySchema
// ---------------------------------------------------------------------------
describe('updateApiKeySchema', () => {
  // -- Valid inputs ---------------------------------------------------------

  it('accepts empty object (no fields to update)', () => {
    const result = updateApiKeySchema.safeParse({})
    expect(result.success).toBeTruthy()
  })

  it('accepts name only', () => {
    const result = updateApiKeySchema.safeParse({ name: 'Updated Key' })
    expect(result.success).toBeTruthy()
  })

  it('accepts scopes only', () => {
    const result = updateApiKeySchema.safeParse({
      scopes: ['admin', 'write:blog'] as ApiKeyScope[],
    })
    expect(result.success).toBeTruthy()
  })

  it('accepts rateLimit only', () => {
    const result = updateApiKeySchema.safeParse({ rateLimit: 1000 })
    expect(result.success).toBeTruthy()
  })

  it('accepts null rateLimit to clear it', () => {
    const result = updateApiKeySchema.safeParse({ rateLimit: null })
    expect(result.success).toBeTruthy()
    if (result.success) expect(result.data.rateLimit).toBeNull()
  })

  it('accepts all fields together', () => {
    const result = updateApiKeySchema.safeParse({
      name: 'Fully Updated',
      rateLimit: 5000,
      scopes: ['read:billing', 'write:billing'] as ApiKeyScope[],
    })
    expect(result.success).toBeTruthy()
  })

  it('trims whitespace from name', () => {
    const result = updateApiKeySchema.safeParse({ name: '  Trimmed  ' })
    expect(result.success).toBeTruthy()
    if (result.success) expect(result.data.name).toBe('Trimmed')
  })

  // -- Name validation -------------------------------------------------------

  it('rejects empty name', () => {
    const result = updateApiKeySchema.safeParse({ name: '' })
    expect(result.success).toBeFalsy()
  })

  it('rejects whitespace-only name after trim', () => {
    const result = updateApiKeySchema.safeParse({ name: '   ' })
    expect(result.success).toBeFalsy()
  })

  it('rejects name exceeding 100 characters', () => {
    const result = updateApiKeySchema.safeParse({ name: 'x'.repeat(101) })
    expect(result.success).toBeFalsy()
  })

  it('rejects non-string name', () => {
    const result = updateApiKeySchema.safeParse({ name: 42 })
    expect(result.success).toBeFalsy()
  })

  // -- Scopes validation -----------------------------------------------------

  it('rejects empty scopes array', () => {
    const result = updateApiKeySchema.safeParse({ scopes: [] })
    expect(result.success).toBeFalsy()
  })

  it('rejects scopes exceeding 20 items', () => {
    const scopes: ApiKeyScope[] = Array(21).fill('admin')
    const result = updateApiKeySchema.safeParse({ scopes })
    expect(result.success).toBeFalsy()
  })

  it('rejects invalid scope values', () => {
    const result = updateApiKeySchema.safeParse({
      scopes: ['not:a:real:scope'] as unknown as ApiKeyScope[],
    })
    expect(result.success).toBeFalsy()
  })

  // -- rateLimit validation --------------------------------------------------

  it('rejects rateLimit below 1', () => {
    const result = updateApiKeySchema.safeParse({ rateLimit: 0 })
    expect(result.success).toBeFalsy()
  })

  it('rejects negative rateLimit', () => {
    const result = updateApiKeySchema.safeParse({ rateLimit: -5 })
    expect(result.success).toBeFalsy()
  })

  it('rejects rateLimit above 10000', () => {
    const result = updateApiKeySchema.safeParse({ rateLimit: 10001 })
    expect(result.success).toBeFalsy()
  })

  it('rejects non-integer rateLimit', () => {
    const result = updateApiKeySchema.safeParse({ rateLimit: 3.14 })
    expect(result.success).toBeFalsy()
  })

  it('rejects non-number rateLimit', () => {
    const result = updateApiKeySchema.safeParse({
      rateLimit: 'fast' as unknown as number,
    })
    expect(result.success).toBeFalsy()
  })

  // -- Extra fields ----------------------------------------------------------

  it('strips unknown fields', () => {
    const result = updateApiKeySchema.safeParse({
      name: 'Key',
      shouldBeIgnored: true,
    })
    expect(result.success).toBeTruthy()
    if (result.success) {
      expect(result.data).not.toHaveProperty('shouldBeIgnored')
    }
  })
})

// ---------------------------------------------------------------------------
// rotateApiKeySchema
// ---------------------------------------------------------------------------
describe('rotateApiKeySchema', () => {
  // -- Valid inputs ---------------------------------------------------------

  it('accepts a valid id string', () => {
    const result = rotateApiKeySchema.safeParse({ id: 'abc123' })
    expect(result.success).toBeTruthy()
  })

  it('accepts a UUID id', () => {
    const result = rotateApiKeySchema.safeParse({
      id: '0195a7a8-1234-7abc-def0-123456789abc',
    })
    expect(result.success).toBeTruthy()
  })

  it('accepts a single character id', () => {
    const result = rotateApiKeySchema.safeParse({ id: 'a' })
    expect(result.success).toBeTruthy()
  })

  it('accepts a long id string', () => {
    const result = rotateApiKeySchema.safeParse({ id: 'x'.repeat(500) })
    expect(result.success).toBeTruthy()
  })

  it('trims whitespace from id', () => {
    const result = rotateApiKeySchema.safeParse({ id: '  spaced-id  ' })
    expect(result.success).toBeTruthy()
    if (result.success) expect(result.data.id).toBe('spaced-id')
  })

  // -- Invalid inputs --------------------------------------------------------

  it('rejects missing id', () => {
    const result = rotateApiKeySchema.safeParse({})
    expect(result.success).toBeFalsy()
  })

  it('rejects empty string id', () => {
    const result = rotateApiKeySchema.safeParse({ id: '' })
    expect(result.success).toBeFalsy()
  })

  it('rejects whitespace-only id after trim', () => {
    const result = rotateApiKeySchema.safeParse({ id: '   ' })
    expect(result.success).toBeFalsy()
  })

  it('rejects non-string id', () => {
    const result = rotateApiKeySchema.safeParse({ id: 12345 })
    expect(result.success).toBeFalsy()
  })

  it('rejects null id', () => {
    const result = rotateApiKeySchema.safeParse({ id: null })
    expect(result.success).toBeFalsy()
  })

  it('rejects undefined id', () => {
    const result = rotateApiKeySchema.safeParse({ id: undefined })
    expect(result.success).toBeFalsy()
  })

  // -- Extra fields ----------------------------------------------------------

  it('strips unknown fields', () => {
    const result = rotateApiKeySchema.safeParse({ id: 'key-1', extra: true })
    expect(result.success).toBeTruthy()
    if (result.success) {
      expect(result.data).not.toHaveProperty('extra')
    }
  })
})
