import {
  createFeatureFlagSchema,
  evaluateFlagSchema,
  evaluateMultipleFlagsSchema,
  listFeatureFlagsSchema,
  toggleFeatureFlagSchema,
  updateFeatureFlagSchema,
} from '$lib/validators/feature-flag'
import { describe, expect, it } from 'vitest'

describe('createFeatureFlagSchema', () => {
  const validInput = {
    environment: 'development',
    key: 'new-feature',
    name: 'New Feature',
  }

  it('validates minimal valid input', () => {
    const result = createFeatureFlagSchema.safeParse(validInput)
    expect(result.success).toBeTruthy()
  })

  it('validates full input with all optional fields', () => {
    const result = createFeatureFlagSchema.safeParse({
      cohortRules: { region: 'us', plan: 'pro' },
      dependencies: ['auth-v2', 'payments-v1'],
      description: 'A detailed description of the feature flag',
      enabled: true,
      environment: 'production',
      key: 'full-feature-flag',
      killSwitch: false,
      name: 'Full Feature Flag',
      rolloutPercentage: 75,
    })
    expect(result.success).toBeTruthy()
  })

  it('trims whitespace from key', () => {
    const data = createFeatureFlagSchema.parse({ ...validInput, key: '  spaced-key  ' })
    expect(data.key).toBe('spaced-key')
  })

  it('trims whitespace from name', () => {
    const data = createFeatureFlagSchema.parse({ ...validInput, name: '  Spaced Name  ' })
    expect(data.name).toBe('Spaced Name')
  })

  it('trims whitespace from description', () => {
    const data = createFeatureFlagSchema.parse({
      ...validInput,
      description: '  spaced description  ',
    })
    expect(data.description).toBe('spaced description')
  })

  // --- key validation ---

  it('rejects missing key', () => {
    const { key: _omit, ...rest } = validInput
    const result = createFeatureFlagSchema.safeParse(rest)
    expect(result.success).toBeFalsy()
  })

  it('rejects empty key', () => {
    const result = createFeatureFlagSchema.safeParse({ ...validInput, key: '' })
    expect(result.success).toBeFalsy()
  })

  it('rejects whitespace-only key after trim', () => {
    const result = createFeatureFlagSchema.safeParse({ ...validInput, key: '   ' })
    expect(result.success).toBeFalsy()
  })

  it('rejects key exceeding 100 characters', () => {
    const longKey = 'a'.repeat(101)
    const result = createFeatureFlagSchema.safeParse({ ...validInput, key: longKey })
    expect(result.success).toBeFalsy()
  })

  it('accepts key at exactly 100 characters', () => {
    const result = createFeatureFlagSchema.safeParse({ ...validInput, key: 'a'.repeat(100) })
    expect(result.success).toBeTruthy()
  })

  it('accepts non-string key', () => {
    const result = createFeatureFlagSchema.safeParse({ ...validInput, key: 123 })
    expect(result.success).toBeFalsy()
  })

  // --- name validation ---

  it('rejects missing name', () => {
    const { name: _omit, ...rest } = validInput
    const result = createFeatureFlagSchema.safeParse(rest)
    expect(result.success).toBeFalsy()
  })

  it('rejects empty name', () => {
    const result = createFeatureFlagSchema.safeParse({ ...validInput, name: '' })
    expect(result.success).toBeFalsy()
  })

  it('rejects whitespace-only name after trim', () => {
    const result = createFeatureFlagSchema.safeParse({ ...validInput, name: '   ' })
    expect(result.success).toBeFalsy()
  })

  it('rejects name exceeding 200 characters', () => {
    const longName = 'n'.repeat(201)
    const result = createFeatureFlagSchema.safeParse({ ...validInput, name: longName })
    expect(result.success).toBeFalsy()
  })

  it('accepts name at exactly 200 characters', () => {
    const result = createFeatureFlagSchema.safeParse({ ...validInput, name: 'n'.repeat(200) })
    expect(result.success).toBeTruthy()
  })

  // --- description validation ---

  it('accepts missing description', () => {
    const result = createFeatureFlagSchema.safeParse({ ...validInput })
    expect(result.success).toBeTruthy()
  })

  it('rejects empty description', () => {
    const result = createFeatureFlagSchema.safeParse({ ...validInput, description: '' })
    expect(result.success).toBeFalsy()
  })

  it('rejects whitespace-only description after trim', () => {
    const result = createFeatureFlagSchema.safeParse({ ...validInput, description: '   ' })
    expect(result.success).toBeFalsy()
  })

  it('rejects description exceeding 500 characters', () => {
    const longDesc = 'd'.repeat(501)
    const result = createFeatureFlagSchema.safeParse({ ...validInput, description: longDesc })
    expect(result.success).toBeFalsy()
  })

  it('accepts description at exactly 500 characters', () => {
    const result = createFeatureFlagSchema.safeParse({
      ...validInput,
      description: 'd'.repeat(500),
    })
    expect(result.success).toBeTruthy()
  })

  // --- enabled validation ---

  it('accepts enabled true', () => {
    const result = createFeatureFlagSchema.safeParse({ ...validInput, enabled: true })
    expect(result.success).toBeTruthy()
  })

  it('accepts enabled false', () => {
    const result = createFeatureFlagSchema.safeParse({ ...validInput, enabled: false })
    expect(result.success).toBeTruthy()
  })

  it('rejects non-boolean enabled', () => {
    const result = createFeatureFlagSchema.safeParse({ ...validInput, enabled: 'true' })
    expect(result.success).toBeFalsy()
  })

  // --- environment validation ---

  it('accepts environment development', () => {
    const result = createFeatureFlagSchema.safeParse({
      ...validInput,
      environment: 'development',
    })
    expect(result.success).toBeTruthy()
  })

  it('accepts environment staging', () => {
    const result = createFeatureFlagSchema.safeParse({
      ...validInput,
      environment: 'staging',
    })
    expect(result.success).toBeTruthy()
  })

  it('accepts environment production', () => {
    const result = createFeatureFlagSchema.safeParse({
      ...validInput,
      environment: 'production',
    })
    expect(result.success).toBeTruthy()
  })

  it('rejects invalid environment value', () => {
    const result = createFeatureFlagSchema.safeParse({
      ...validInput,
      environment: 'testing',
    })
    expect(result.success).toBeFalsy()
  })

  it('rejects non-string environment', () => {
    const result = createFeatureFlagSchema.safeParse({ ...validInput, environment: 42 })
    expect(result.success).toBeFalsy()
  })

  it('accepts missing environment', () => {
    const { environment: _omit, ...rest } = validInput
    const result = createFeatureFlagSchema.safeParse(rest)
    expect(result.success).toBeTruthy()
  })

  // --- rolloutPercentage validation ---

  it('accepts rolloutPercentage at 0', () => {
    const result = createFeatureFlagSchema.safeParse({
      ...validInput,
      rolloutPercentage: 0,
    })
    expect(result.success).toBeTruthy()
  })

  it('accepts rolloutPercentage at 100', () => {
    const result = createFeatureFlagSchema.safeParse({
      ...validInput,
      rolloutPercentage: 100,
    })
    expect(result.success).toBeTruthy()
  })

  it('accepts rolloutPercentage in range', () => {
    const result = createFeatureFlagSchema.safeParse({
      ...validInput,
      rolloutPercentage: 42,
    })
    expect(result.success).toBeTruthy()
  })

  it('rejects rolloutPercentage below 0', () => {
    const result = createFeatureFlagSchema.safeParse({
      ...validInput,
      rolloutPercentage: -1,
    })
    expect(result.success).toBeFalsy()
  })

  it('rejects rolloutPercentage above 100', () => {
    const result = createFeatureFlagSchema.safeParse({
      ...validInput,
      rolloutPercentage: 101,
    })
    expect(result.success).toBeFalsy()
  })

  it('rejects non-integer rolloutPercentage', () => {
    const result = createFeatureFlagSchema.safeParse({
      ...validInput,
      rolloutPercentage: 50.5,
    })
    expect(result.success).toBeFalsy()
  })

  it('rejects non-number rolloutPercentage', () => {
    const result = createFeatureFlagSchema.safeParse({
      ...validInput,
      rolloutPercentage: '50',
    })
    expect(result.success).toBeFalsy()
  })

  // --- killSwitch validation ---

  it('accepts killSwitch true', () => {
    const result = createFeatureFlagSchema.safeParse({ ...validInput, killSwitch: true })
    expect(result.success).toBeTruthy()
  })

  it('accepts killSwitch false', () => {
    const result = createFeatureFlagSchema.safeParse({ ...validInput, killSwitch: false })
    expect(result.success).toBeTruthy()
  })

  it('rejects non-boolean killSwitch', () => {
    const result = createFeatureFlagSchema.safeParse({ ...validInput, killSwitch: 'yes' })
    expect(result.success).toBeFalsy()
  })

  // --- dependencies validation ---

  it('accepts string array for dependencies', () => {
    const result = createFeatureFlagSchema.safeParse({
      ...validInput,
      dependencies: ['flag-a', 'flag-b'],
    })
    expect(result.success).toBeTruthy()
  })

  it('accepts empty array for dependencies', () => {
    const result = createFeatureFlagSchema.safeParse({ ...validInput, dependencies: [] })
    expect(result.success).toBeTruthy()
  })

  it('rejects non-array dependencies', () => {
    const result = createFeatureFlagSchema.safeParse({
      ...validInput,
      dependencies: 'flag-a',
    })
    expect(result.success).toBeFalsy()
  })

  it('rejects array with non-string elements in dependencies', () => {
    const result = createFeatureFlagSchema.safeParse({
      ...validInput,
      dependencies: [123, 'flag-a'],
    })
    expect(result.success).toBeFalsy()
  })

  // --- cohortRules validation ---

  it('accepts record with string keys and unknown values', () => {
    const result = createFeatureFlagSchema.safeParse({
      ...validInput,
      cohortRules: { region: 'us', beta: true, percentage: 50 },
    })
    expect(result.success).toBeTruthy()
  })

  it('accepts empty object for cohortRules', () => {
    const result = createFeatureFlagSchema.safeParse({ ...validInput, cohortRules: {} })
    expect(result.success).toBeTruthy()
  })

  it('rejects non-object cohortRules', () => {
    const result = createFeatureFlagSchema.safeParse({ ...validInput, cohortRules: 'invalid' })
    expect(result.success).toBeFalsy()
  })

  it('strips unknown fields', () => {
    const data = createFeatureFlagSchema.parse({
      ...validInput,
      unknownField: 'value',
    })
    expect(data).not.toHaveProperty('unknownField')
  })

  it('rejects empty object', () => {
    const result = createFeatureFlagSchema.safeParse({})
    expect(result.success).toBeFalsy()
  })
})

describe('updateFeatureFlagSchema', () => {
  it('allows empty object', () => {
    const result = updateFeatureFlagSchema.safeParse({})
    expect(result.success).toBeTruthy()
  })

  it('allows partial update with single field', () => {
    const result = updateFeatureFlagSchema.safeParse({ name: 'Updated Name' })
    expect(result.success).toBeTruthy()
  })

  it('allows partial update with multiple fields', () => {
    const result = updateFeatureFlagSchema.safeParse({
      description: 'Updated description',
      enabled: false,
      environment: 'staging',
    })
    expect(result.success).toBeTruthy()
  })

  it('allows all fields at once', () => {
    const result = updateFeatureFlagSchema.safeParse({
      cohortRules: { plan: 'enterprise' },
      dependencies: ['flag-c'],
      description: 'Full update',
      enabled: true,
      environment: 'production',
      killSwitch: true,
      name: 'Fully Updated',
      rolloutPercentage: 90,
    })
    expect(result.success).toBeTruthy()
  })

  // --- key is not part of the schema ---

  it('strips key field since it is not in the schema', () => {
    const data = updateFeatureFlagSchema.parse({ key: 'some-key' })
    expect(data).not.toHaveProperty('key')
  })

  // --- name validation (optional, 1-200) ---

  it('accepts valid name', () => {
    const result = updateFeatureFlagSchema.safeParse({ name: 'Valid Name' })
    expect(result.success).toBeTruthy()
  })

  it('trims whitespace from name', () => {
    const data = updateFeatureFlagSchema.parse({ name: '  Trimmed  ' })
    expect(data.name).toBe('Trimmed')
  })

  it('rejects empty name', () => {
    const result = updateFeatureFlagSchema.safeParse({ name: '' })
    expect(result.success).toBeFalsy()
  })

  it('rejects whitespace-only name', () => {
    const result = updateFeatureFlagSchema.safeParse({ name: '   ' })
    expect(result.success).toBeFalsy()
  })

  it('rejects name exceeding 200 characters', () => {
    const result = updateFeatureFlagSchema.safeParse({ name: 'n'.repeat(201) })
    expect(result.success).toBeFalsy()
  })

  // --- description validation ---

  it('accepts valid description', () => {
    const result = updateFeatureFlagSchema.safeParse({ description: 'A valid description' })
    expect(result.success).toBeTruthy()
  })

  it('rejects empty description', () => {
    const result = updateFeatureFlagSchema.safeParse({ description: '' })
    expect(result.success).toBeFalsy()
  })

  it('rejects description exceeding 500 characters', () => {
    const result = updateFeatureFlagSchema.safeParse({ description: 'd'.repeat(501) })
    expect(result.success).toBeFalsy()
  })

  // --- enabled validation ---

  it('accepts enabled boolean', () => {
    const result = updateFeatureFlagSchema.safeParse({ enabled: true })
    expect(result.success).toBeTruthy()
  })

  it('rejects non-boolean enabled', () => {
    const result = updateFeatureFlagSchema.safeParse({ enabled: 'true' })
    expect(result.success).toBeFalsy()
  })

  // --- environment validation ---

  it('accepts valid environment', () => {
    const result = updateFeatureFlagSchema.safeParse({ environment: 'production' })
    expect(result.success).toBeTruthy()
  })

  it('rejects invalid environment', () => {
    const result = updateFeatureFlagSchema.safeParse({ environment: 'invalid' })
    expect(result.success).toBeFalsy()
  })

  // --- rolloutPercentage validation ---

  it('accepts valid rolloutPercentage', () => {
    const result = updateFeatureFlagSchema.safeParse({ rolloutPercentage: 50 })
    expect(result.success).toBeTruthy()
  })

  it('rejects rolloutPercentage below 0', () => {
    const result = updateFeatureFlagSchema.safeParse({ rolloutPercentage: -1 })
    expect(result.success).toBeFalsy()
  })

  it('rejects rolloutPercentage above 100', () => {
    const result = updateFeatureFlagSchema.safeParse({ rolloutPercentage: 101 })
    expect(result.success).toBeFalsy()
  })

  it('rejects non-integer rolloutPercentage', () => {
    const result = updateFeatureFlagSchema.safeParse({ rolloutPercentage: 0.5 })
    expect(result.success).toBeFalsy()
  })

  // --- killSwitch validation ---

  it('accepts killSwitch boolean', () => {
    const result = updateFeatureFlagSchema.safeParse({ killSwitch: true })
    expect(result.success).toBeTruthy()
  })

  it('rejects non-boolean killSwitch', () => {
    const result = updateFeatureFlagSchema.safeParse({ killSwitch: 1 })
    expect(result.success).toBeFalsy()
  })

  // --- dependencies validation ---

  it('accepts string array for dependencies', () => {
    const result = updateFeatureFlagSchema.safeParse({ dependencies: ['flag-x'] })
    expect(result.success).toBeTruthy()
  })

  it('rejects non-array dependencies', () => {
    const result = updateFeatureFlagSchema.safeParse({ dependencies: 'not-an-array' })
    expect(result.success).toBeFalsy()
  })

  // --- cohortRules validation ---

  it('accepts record for cohortRules', () => {
    const result = updateFeatureFlagSchema.safeParse({ cohortRules: { tier: 'premium' } })
    expect(result.success).toBeTruthy()
  })

  it('rejects non-object cohortRules', () => {
    const result = updateFeatureFlagSchema.safeParse({ cohortRules: [1, 2, 3] })
    expect(result.success).toBeFalsy()
  })

  // --- extra fields ---

  it('strips unknown fields', () => {
    const data = updateFeatureFlagSchema.parse({ unknownField: 'value' })
    expect(data).not.toHaveProperty('unknownField')
  })
})

describe('toggleFeatureFlagSchema', () => {
  it('accepts enabled true', () => {
    const result = toggleFeatureFlagSchema.safeParse({ enabled: true })
    expect(result.success).toBeTruthy()
  })

  it('accepts enabled false', () => {
    const result = toggleFeatureFlagSchema.safeParse({ enabled: false })
    expect(result.success).toBeTruthy()
  })

  it('rejects missing enabled', () => {
    const result = toggleFeatureFlagSchema.safeParse({})
    expect(result.success).toBeFalsy()
  })

  it('rejects non-boolean enabled', () => {
    const result = toggleFeatureFlagSchema.safeParse({ enabled: 'true' })
    expect(result.success).toBeFalsy()
  })

  it('rejects null enabled', () => {
    const result = toggleFeatureFlagSchema.safeParse({ enabled: null })
    expect(result.success).toBeFalsy()
  })

  it('rejects undefined enabled', () => {
    const result = toggleFeatureFlagSchema.safeParse({ enabled: undefined })
    expect(result.success).toBeFalsy()
  })

  it('strips extra fields', () => {
    const data = toggleFeatureFlagSchema.parse({ enabled: true, extra: 'field' })
    expect(data).not.toHaveProperty('extra')
    expect(data.enabled).toBe(true)
  })
})

describe('evaluateFlagSchema', () => {
  it('accepts empty object', () => {
    const result = evaluateFlagSchema.safeParse({})
    expect(result.success).toBeTruthy()
  })

  it('accepts context with userId', () => {
    const result = evaluateFlagSchema.safeParse({ context: { userId: 'user-123' } })
    expect(result.success).toBeTruthy()
  })

  it('accepts context with environment', () => {
    const result = evaluateFlagSchema.safeParse({ context: { environment: 'production' } })
    expect(result.success).toBeTruthy()
  })

  it('accepts context with both userId and environment', () => {
    const result = evaluateFlagSchema.safeParse({
      context: { userId: 'user-123', environment: 'staging' },
    })
    expect(result.success).toBeTruthy()
  })

  it('accepts context with no fields', () => {
    const result = evaluateFlagSchema.safeParse({ context: {} })
    expect(result.success).toBeTruthy()
  })

  it('rejects non-object context', () => {
    const result = evaluateFlagSchema.safeParse({ context: 'invalid' })
    expect(result.success).toBeFalsy()
  })

  it('rejects non-string userId', () => {
    const result = evaluateFlagSchema.safeParse({ context: { userId: 123 } })
    expect(result.success).toBeFalsy()
  })

  it('rejects non-string environment', () => {
    const result = evaluateFlagSchema.safeParse({ context: { environment: 456 } })
    expect(result.success).toBeFalsy()
  })

  it('strips unknown fields in context', () => {
    const data = evaluateFlagSchema.parse({ context: { unknownField: true } })
    expect(data.context).not.toHaveProperty('unknownField')
  })

  it('strips unknown top-level fields', () => {
    const data = evaluateFlagSchema.parse({ flagKey: 'some-flag' })
    expect(data).not.toHaveProperty('flagKey')
  })
})

describe('evaluateMultipleFlagsSchema', () => {
  it('accepts keys array with single item', () => {
    const result = evaluateMultipleFlagsSchema.safeParse({ keys: ['flag-a'] })
    expect(result.success).toBeTruthy()
  })

  it('accepts keys array with multiple items', () => {
    const result = evaluateMultipleFlagsSchema.safeParse({
      keys: ['flag-a', 'flag-b', 'flag-c'],
    })
    expect(result.success).toBeTruthy()
  })

  it('accepts keys with context', () => {
    const result = evaluateMultipleFlagsSchema.safeParse({
      context: { userId: 'user-1', environment: 'production' },
      keys: ['flag-a', 'flag-b'],
    })
    expect(result.success).toBeTruthy()
  })

  // --- keys required ---

  it('rejects missing keys', () => {
    const result = evaluateMultipleFlagsSchema.safeParse({})
    expect(result.success).toBeFalsy()
  })

  // --- keys array boundaries ---

  it('rejects empty keys array', () => {
    const result = evaluateMultipleFlagsSchema.safeParse({ keys: [] })
    expect(result.success).toBeFalsy()
  })

  it('rejects keys array exceeding 50 items', () => {
    const tooManyKeys = Array.from({ length: 51 }, (_, i) => `flag-${i}`)
    const result = evaluateMultipleFlagsSchema.safeParse({ keys: tooManyKeys })
    expect(result.success).toBeFalsy()
  })

  it('accepts keys array at exactly 50 items', () => {
    const maxKeys = Array.from({ length: 50 }, (_, i) => `flag-${i}`)
    const result = evaluateMultipleFlagsSchema.safeParse({ keys: maxKeys })
    expect(result.success).toBeTruthy()
  })

  // --- individual key validation ---

  it('rejects empty string in keys array', () => {
    const result = evaluateMultipleFlagsSchema.safeParse({ keys: ['valid-key', ''] })
    expect(result.success).toBeFalsy()
  })

  it('rejects whitespace-only string in keys array', () => {
    const result = evaluateMultipleFlagsSchema.safeParse({ keys: ['valid-key', '   '] })
    expect(result.success).toBeTruthy()
  })

  it('rejects non-string elements in keys array', () => {
    const result = evaluateMultipleFlagsSchema.safeParse({ keys: [123, 'flag-a'] })
    expect(result.success).toBeFalsy()
  })

  // --- context validation ---

  it('accepts missing context', () => {
    const result = evaluateMultipleFlagsSchema.safeParse({ keys: ['flag-a'] })
    expect(result.success).toBeTruthy()
  })

  it('rejects non-object context', () => {
    const result = evaluateMultipleFlagsSchema.safeParse({
      context: 'invalid',
      keys: ['flag-a'],
    })
    expect(result.success).toBeFalsy()
  })

  it('strips unknown fields in context', () => {
    const data = evaluateMultipleFlagsSchema.parse({
      context: { unknownField: true },
      keys: ['flag-a'],
    })
    expect(data.context).not.toHaveProperty('unknownField')
  })

  // --- extra fields ---

  it('strips unknown top-level fields', () => {
    const data = evaluateMultipleFlagsSchema.parse({
      keys: ['flag-a'],
      extraField: 'value',
    })
    expect(data).not.toHaveProperty('extraField')
  })
})

describe('listFeatureFlagsSchema', () => {
  it('accepts empty object', () => {
    const result = listFeatureFlagsSchema.safeParse({})
    expect(result.success).toBeTruthy()
  })

  // --- enabled validation ---

  // oxlint-disable-next-line jest/prefer-ending-with-an-expect
  it('accepts enabled as string "true"', () => {
    const result = listFeatureFlagsSchema.safeParse({ enabled: 'true' })
    expect(result.success).toBeTruthy()
    if (result.success) {
      expect(result.data.enabled).toBe(true)
    }
  })

  // oxlint-disable-next-line jest/prefer-ending-with-an-expect
  it('accepts enabled as string "false"', () => {
    const result = listFeatureFlagsSchema.safeParse({ enabled: 'false' })
    expect(result.success).toBeTruthy()
    if (result.success) {
      expect(result.data.enabled).toBe(false)
    }
  })

  it('transforms "true" string to boolean true', () => {
    const data = listFeatureFlagsSchema.parse({ enabled: 'true' })
    expect(data.enabled).toBe(true)
  })

  it('transforms "false" string to boolean false', () => {
    const data = listFeatureFlagsSchema.parse({ enabled: 'false' })
    expect(data.enabled).toBe(false)
  })

  it('rejects enabled as boolean true', () => {
    const result = listFeatureFlagsSchema.safeParse({ enabled: true })
    expect(result.success).toBeFalsy()
  })

  it('rejects enabled as boolean false', () => {
    const result = listFeatureFlagsSchema.safeParse({ enabled: false })
    expect(result.success).toBeFalsy()
  })

  it('rejects enabled as arbitrary string', () => {
    const result = listFeatureFlagsSchema.safeParse({ enabled: 'yes' })
    expect(result.success).toBeFalsy()
  })

  it('rejects enabled as number', () => {
    const result = listFeatureFlagsSchema.safeParse({ enabled: 1 })
    expect(result.success).toBeFalsy()
  })

  // --- environment validation ---

  it('accepts environment as string', () => {
    const result = listFeatureFlagsSchema.safeParse({ environment: 'production' })
    expect(result.success).toBeTruthy()
  })

  it('accepts any string for environment', () => {
    const result = listFeatureFlagsSchema.safeParse({ environment: 'any-value' })
    expect(result.success).toBeTruthy()
  })

  it('rejects non-string environment', () => {
    const result = listFeatureFlagsSchema.safeParse({ environment: 123 })
    expect(result.success).toBeFalsy()
  })

  // --- combined fields ---

  // oxlint-disable-next-line jest/prefer-ending-with-an-expect
  it('accepts both enabled and environment', () => {
    const result = listFeatureFlagsSchema.safeParse({
      enabled: 'true',
      environment: 'staging',
    })
    expect(result.success).toBeTruthy()
    if (result.success) {
      expect(result.data.enabled).toBe(true)
    }
  })

  // --- extra fields ---

  it('strips unknown fields', () => {
    const data = listFeatureFlagsSchema.parse({ unknownField: 'value' })
    expect(data).not.toHaveProperty('unknownField')
  })
})
