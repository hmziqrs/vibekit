import { describe, expect, it, vi } from 'vitest'

function createMockDb(rows: Record<string, unknown>[] = []) {
  const mockPromise = Promise.resolve(rows)
  const whereFn = vi.fn<() => Promise<Record<string, unknown>[]>>().mockReturnValue(mockPromise)
  const fromFn = vi.fn<() => { where: typeof whereFn }>().mockReturnValue({ where: whereFn })
  const selectFn = vi.fn<() => { from: typeof fromFn }>().mockReturnValue({ from: fromFn })
  const valuesFn = vi.fn<() => Promise<void>>().mockResolvedValue(undefined)
  const insertFn = vi.fn<() => { values: typeof valuesFn }>().mockReturnValue({ values: valuesFn })
  const setFn = vi.fn<() => { where: typeof whereFn }>().mockReturnValue({ where: whereFn })
  const updateFn = vi.fn<() => { set: typeof setFn }>().mockReturnValue({ set: setFn })
  const deleteWhereFn = vi.fn<() => Promise<void>>().mockResolvedValue(undefined)
  const deleteFn = vi.fn<() => { where: typeof deleteWhereFn }>().mockReturnValue({
    where: deleteWhereFn,
  })

  return {
    _rows: rows,
    delete: deleteFn,
    insert: insertFn,
    select: selectFn,
    update: updateFn,
  } as unknown
}

describe('feature-flag service module', () => {
  it('exports all required functions', async () => {
    const mod = await import('$lib/server/feature-flags')
    expect(typeof mod.listFeatureFlags).toBe('function')
    expect(typeof mod.getFeatureFlag).toBe('function')
    expect(typeof mod.createFeatureFlag).toBe('function')
    expect(typeof mod.updateFeatureFlag).toBe('function')
    expect(typeof mod.deleteFeatureFlag).toBe('function')
    expect(typeof mod.toggleFeatureFlag).toBe('function')
    expect(typeof mod.activateKillSwitch).toBe('function')
    expect(typeof mod.evaluateFeatureFlag).toBe('function')
    expect(typeof mod.evaluateMultipleFlags).toBe('function')
  })
})

describe('evaluateFeatureFlag', () => {
  it('returns false when flag does not exist', async () => {
    const { evaluateFeatureFlag } = await import('$lib/server/feature-flags')
    const db = createMockDb([])
    const result = await evaluateFeatureFlag(db, 'nonexistent')
    expect(result).toBe(false)
  })

  it('returns false when kill switch is active', async () => {
    const { evaluateFeatureFlag } = await import('$lib/server/feature-flags')
    const db = createMockDb([
      {
        enabled: true,
        killSwitch: true,
        key: 'test-flag',
        rolloutPercentage: 100,
      },
    ])
    const result = await evaluateFeatureFlag(db, 'test-flag')
    expect(result).toBe(false)
  })

  it('returns false when flag is disabled', async () => {
    const { evaluateFeatureFlag } = await import('$lib/server/feature-flags')
    const db = createMockDb([
      {
        enabled: false,
        killSwitch: false,
        key: 'test-flag',
        rolloutPercentage: 100,
      },
    ])
    const result = await evaluateFeatureFlag(db, 'test-flag')
    expect(result).toBe(false)
  })

  it('returns true when flag is enabled with 100% rollout', async () => {
    const { evaluateFeatureFlag } = await import('$lib/server/feature-flags')
    const db = createMockDb([
      {
        enabled: true,
        killSwitch: false,
        key: 'test-flag',
        rolloutPercentage: 100,
      },
    ])
    const result = await evaluateFeatureFlag(db, 'test-flag')
    expect(result).toBe(true)
  })

  it('returns false when rollout percentage is 0', async () => {
    const { evaluateFeatureFlag } = await import('$lib/server/feature-flags')
    const db = createMockDb([
      {
        enabled: true,
        killSwitch: false,
        key: 'test-flag',
        rolloutPercentage: 0,
      },
    ])
    const result = await evaluateFeatureFlag(db, 'test-flag')
    expect(result).toBe(false)
  })

  it('returns false when environment does not match', async () => {
    const { evaluateFeatureFlag } = await import('$lib/server/feature-flags')
    const db = createMockDb([
      {
        enabled: true,
        environment: 'production',
        killSwitch: false,
        key: 'test-flag',
        rolloutPercentage: 100,
      },
    ])
    const result = await evaluateFeatureFlag(db, 'test-flag', { environment: 'staging' })
    expect(result).toBe(false)
  })

  it('passes when flag environment is null (all environments)', async () => {
    const { evaluateFeatureFlag } = await import('$lib/server/feature-flags')
    const db = createMockDb([
      {
        enabled: true,
        environment: null,
        killSwitch: false,
        key: 'test-flag',
        rolloutPercentage: 100,
      },
    ])
    const result = await evaluateFeatureFlag(db, 'test-flag', { environment: 'staging' })
    expect(result).toBe(true)
  })

  it('uses deterministic hashing for same user+key', async () => {
    const { evaluateFeatureFlag } = await import('$lib/server/feature-flags')
    const db = createMockDb([
      {
        enabled: true,
        killSwitch: false,
        key: 'test-flag',
        rolloutPercentage: 50,
      },
    ])

    const r1 = await evaluateFeatureFlag(db, 'test-flag', { userId: 'user-123' })
    const r2 = await evaluateFeatureFlag(db, 'test-flag', { userId: 'user-123' })
    expect(r1).toBe(r2)
  })

  it('produces varied results across different users with 50% rollout', async () => {
    const { evaluateFeatureFlag } = await import('$lib/server/feature-flags')
    const db = createMockDb([
      {
        enabled: true,
        killSwitch: false,
        key: 'test-flag',
        rolloutPercentage: 50,
      },
    ])

    const results = new Set<boolean>()
    for (let i = 0; i < 20; i++) {
      // eslint-disable-next-line no-await-in-loop
      results.add(await evaluateFeatureFlag(db, 'test-flag', { userId: `user-${i}` }))
    }
    expect(results.size).toBeGreaterThan(1)
  })
})

describe('evaluateMultipleFlags', () => {
  it('returns all false for non-existent flags', async () => {
    const { evaluateMultipleFlags } = await import('$lib/server/feature-flags')
    const db = createMockDb([])
    const result = await evaluateMultipleFlags(db, ['a', 'b', 'c'])
    expect(result).toStrictEqual({ a: false, b: false, c: false })
  })

  it('returns empty object for empty keys', async () => {
    const { evaluateMultipleFlags } = await import('$lib/server/feature-flags')
    const db = createMockDb([])
    const result = await evaluateMultipleFlags(db, [])
    expect(result).toStrictEqual({})
  })
})

describe('FlagEvaluationContext type', () => {
  it('accepts environment and userId', async () => {
    const { evaluateFeatureFlag } = await import('$lib/server/feature-flags')
    const db = createMockDb([
      {
        enabled: true,
        killSwitch: false,
        key: 'test-flag',
        rolloutPercentage: 100,
      },
    ])
    // TypeScript will enforce the type at compile time
    const result = await evaluateFeatureFlag(db, 'test-flag', {
      environment: 'production',
      userId: 'user-1',
    })
    expect(typeof result).toBe('boolean')
  })

  it('accepts empty context', async () => {
    const { evaluateFeatureFlag } = await import('$lib/server/feature-flags')
    const db = createMockDb([
      {
        enabled: true,
        killSwitch: false,
        key: 'test-flag',
        rolloutPercentage: 100,
      },
    ])
    const result = await evaluateFeatureFlag(db, 'test-flag', {})
    expect(result).toBe(true)
  })

  it('accepts no context', async () => {
    const { evaluateFeatureFlag } = await import('$lib/server/feature-flags')
    const db = createMockDb([
      {
        enabled: true,
        killSwitch: false,
        key: 'test-flag',
        rolloutPercentage: 100,
      },
    ])
    const result = await evaluateFeatureFlag(db, 'test-flag')
    expect(result).toBe(true)
  })
})

describe('flag evaluation priority', () => {
  it('kill switch takes priority over enabled', async () => {
    const { evaluateFeatureFlag } = await import('$lib/server/feature-flags')
    const db = createMockDb([
      {
        enabled: true,
        killSwitch: true,
        key: 'test-flag',
        rolloutPercentage: 100,
      },
    ])
    // Kill switch should return false even though enabled=true and 100% rollout
    const result = await evaluateFeatureFlag(db, 'test-flag')
    expect(result).toBe(false)
  })

  it('disabled takes priority over rollout', async () => {
    const { evaluateFeatureFlag } = await import('$lib/server/feature-flags')
    const db = createMockDb([
      {
        enabled: false,
        killSwitch: false,
        key: 'test-flag',
        rolloutPercentage: 100,
      },
    ])
    const result = await evaluateFeatureFlag(db, 'test-flag')
    expect(result).toBe(false)
  })

  it('environment mismatch blocks evaluation', async () => {
    const { evaluateFeatureFlag } = await import('$lib/server/feature-flags')
    const db = createMockDb([
      {
        enabled: true,
        environment: 'production',
        killSwitch: false,
        key: 'test-flag',
        rolloutPercentage: 100,
      },
    ])
    // Everything is good but environment doesn't match
    const result = await evaluateFeatureFlag(db, 'test-flag', { environment: 'development' })
    expect(result).toBe(false)
  })
})
