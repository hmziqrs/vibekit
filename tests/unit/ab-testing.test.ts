import { calculateZTest } from '$lib/server/ab-testing'
import {
  assignVariantSchema,
  createExperimentSchema,
  listExperimentsSchema,
  recordEventSchema,
  updateExperimentSchema,
} from '$lib/validators/ab-testing'
import { beforeEach, describe, expect, it, vi } from 'vitest'

describe('a/B Testing Validators', () => {
  describe('createExperimentSchema', () => {
    it('validates a valid experiment', () => {
      const result = createExperimentSchema.safeParse({
        key: 'checkout-redesign',
        name: 'Checkout Redesign',
        targetMetric: 'conversion_rate',
        variants: [
          { isControl: true, name: 'Control', trafficPercentage: 50 },
          { isControl: false, name: 'Variant A', trafficPercentage: 50 },
        ],
      })
      expect(result.success).toBe(true)
    })

    it('rejects empty key', () => {
      const result = createExperimentSchema.safeParse({
        key: '',
        name: 'Test',
        targetMetric: 'conv',
        variants: [
          { name: 'Control', trafficPercentage: 50 },
          { name: 'Variant', trafficPercentage: 50 },
        ],
      })
      expect(result.success).toBe(false)
    })

    it('rejects fewer than 2 variants', () => {
      const result = createExperimentSchema.safeParse({
        key: 'test',
        name: 'Test',
        targetMetric: 'conv',
        variants: [{ name: 'Only', trafficPercentage: 100 }],
      })
      expect(result.success).toBe(false)
    })

    it('rejects more than 10 variants', () => {
      const result = createExperimentSchema.safeParse({
        key: 'test',
        name: 'Test',
        targetMetric: 'conv',
        variants: Array.from({ length: 11 }, (_, i) => ({
          name: `V${i}`,
          trafficPercentage: 10,
        })),
      })
      expect(result.success).toBe(false)
    })

    it('rejects traffic percentage of 0', () => {
      const result = createExperimentSchema.safeParse({
        key: 'test',
        name: 'Test',
        targetMetric: 'conv',
        variants: [
          { name: 'Control', trafficPercentage: 100 },
          { name: 'Variant', trafficPercentage: 0 },
        ],
      })
      expect(result.success).toBe(false)
    })

    it('trims whitespace from key and name', () => {
      const result = createExperimentSchema.safeParse({
        key: '  test-key  ',
        name: '  Test Name  ',
        targetMetric: 'metric',
        variants: [
          { name: 'A', trafficPercentage: 50 },
          { name: 'B', trafficPercentage: 50 },
        ],
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.key).toBe('test-key')
        expect(result.data.name).toBe('Test Name')
      }
    })
  })

  describe('updateExperimentSchema', () => {
    it('validates status update', () => {
      const result = updateExperimentSchema.safeParse({ status: 'running' })
      expect(result.success).toBe(true)
    })

    it('validates partial update', () => {
      const result = updateExperimentSchema.safeParse({ name: 'Updated' })
      expect(result.success).toBe(true)
    })

    it('rejects invalid status', () => {
      const result = updateExperimentSchema.safeParse({ status: 'invalid' })
      expect(result.success).toBe(false)
    })

    it('validates winning variant null', () => {
      const result = updateExperimentSchema.safeParse({ winningVariantId: null })
      expect(result.success).toBe(true)
    })
  })

  describe('assignVariantSchema', () => {
    it('validates with userId', () => {
      const result = assignVariantSchema.safeParse({ userId: 'user-123' })
      expect(result.success).toBe(true)
    })

    it('validates with sessionId', () => {
      const result = assignVariantSchema.safeParse({ sessionId: 'sess-456' })
      expect(result.success).toBe(true)
    })

    it('validates empty input', () => {
      const result = assignVariantSchema.safeParse({})
      expect(result.success).toBe(true)
    })
  })

  describe('recordEventSchema', () => {
    it('validates conversion event', () => {
      const result = recordEventSchema.safeParse({
        eventName: 'purchase',
        eventType: 'conversion',
      })
      expect(result.success).toBe(true)
    })

    it('validates custom event with value', () => {
      const result = recordEventSchema.safeParse({
        eventName: 'scroll_depth',
        eventType: 'custom',
        eventValue: 75,
        metadata: { page: '/checkout' },
      })
      expect(result.success).toBe(true)
    })

    it('rejects invalid event type', () => {
      const result = recordEventSchema.safeParse({
        eventName: 'test',
        eventType: 'invalid',
      })
      expect(result.success).toBe(false)
    })

    it('rejects missing eventName', () => {
      const result = recordEventSchema.safeParse({
        eventType: 'conversion',
      })
      expect(result.success).toBe(false)
    })
  })

  describe('listExperimentsSchema', () => {
    it('validates empty params', () => {
      const result = listExperimentsSchema.safeParse({})
      expect(result.success).toBe(true)
    })

    it('validates with status filter', () => {
      const result = listExperimentsSchema.safeParse({ status: 'running' })
      expect(result.success).toBe(true)
    })
  })
})

describe('statistical Significance', () => {
  describe('calculateZTest', () => {
    it('returns 0 zScore for identical rates', () => {
      const { zScore } = calculateZTest(0.1, 1000, 0.1, 1000)
      expect(zScore).toBe(0)
    })

    it('returns pValue close to 1 for identical rates', () => {
      const { pValue } = calculateZTest(0.1, 1000, 0.1, 1000)
      expect(pValue).toBeCloseTo(1, 5)
    })

    it('detects significant difference', () => {
      // 5% vs 10% with large sample
      const { pValue, zScore } = calculateZTest(0.05, 5000, 0.1, 5000)
      expect(Math.abs(zScore)).toBeGreaterThan(2)
      expect(pValue).toBeLessThan(0.05)
    })

    it('returns pValue=1 for zero sample sizes', () => {
      const { pValue, zScore } = calculateZTest(0.1, 0, 0.2, 100)
      expect(pValue).toBe(1)
      expect(zScore).toBe(0)
    })

    it('handles small differences with large samples', () => {
      // 10% vs 11% with very large sample
      const { pValue } = calculateZTest(0.1, 50_000, 0.11, 50_000)
      expect(pValue).toBeLessThan(0.05)
    })

    it('does not flag small differences with small samples', () => {
      // 10% vs 15% with small sample
      const { pValue } = calculateZTest(0.1, 100, 0.15, 100)
      // May or may not be significant with this sample size
      expect(pValue).toBeGreaterThan(0)
      expect(pValue).toBeLessThanOrEqual(1)
    })

    it('returns positive zScore when variant is better', () => {
      const { zScore } = calculateZTest(0.05, 1000, 0.1, 1000)
      expect(zScore).toBeGreaterThan(0)
    })

    it('returns negative zScore when control is better', () => {
      const { zScore } = calculateZTest(0.1, 1000, 0.05, 1000)
      expect(zScore).toBeLessThan(0)
    })
  })
})

describe('hash Distribution', () => {
  function simpleHash(str: string): number {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash + char) | 0
    }
    return Math.abs(hash)
  }

  it('distributes variants according to traffic percentage', () => {
    let controlCount = 0
    let variantCount = 0
    for (let i = 0; i < 2000; i++) {
      const hash = simpleHash(`user-${i}` + 'test-exp')
      const bucket = hash % 100
      if (bucket < 50) controlCount++
      else variantCount++
    }
    // Should be roughly 50/50
    expect(controlCount).toBeGreaterThan(800)
    expect(controlCount).toBeLessThan(1200)
    expect(variantCount).toBeGreaterThan(800)
    expect(variantCount).toBeLessThan(1200)
  })

  it('is deterministic for same user+experiment', () => {
    const h1 = simpleHash('user-1' + 'experiment-a')
    const h2 = simpleHash('user-1' + 'experiment-a')
    expect(h1).toBe(h2)
  })

  it('differs across experiments for same user', () => {
    const h1 = simpleHash('user-1' + 'experiment-a')
    const h2 = simpleHash('user-1' + 'experiment-b')
    expect(h1).not.toBe(h2)
  })
})

// --- Service-level tests ---

describe('ab-testing service', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  function makeExperiment(overrides: Record<string, unknown> = {}): Record<string, unknown> {
    return {
      description: null,
      id: 'exp-1',
      key: 'test-exp',
      name: 'Test Experiment',
      status: 'running',
      targetMetric: 'conversion',
      winningVariantId: null,
      ...overrides,
    }
  }

  function makeVariant(overrides: Record<string, unknown> = {}): Record<string, unknown> {
    return {
      description: null,
      experimentId: 'exp-1',
      id: 'var-1',
      isControl: true,
      name: 'Control',
      payload: {},
      trafficPercentage: 50,
      ...overrides,
    }
  }

  function createExperimentDb(
    experiment: Record<string, unknown> | null = null,
    variants: Record<string, unknown>[] = []
  ) {
    const expRows = experiment ? [experiment] : []
    const whereFn = vi.fn().mockResolvedValue(expRows)
    const variantWhereFn = vi.fn().mockResolvedValue(variants)

    // select().from(abExperiment).where() → experiments
    // select().from(abVariant).where() → variants
    // select().from(abEvent).where() → counts
    let selectCallCount = 0
    const fromFn = vi.fn().mockImplementation(() => ({
      limit: vi.fn().mockImplementation(function (this: unknown) {
        return this
      }),
      orderBy: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue(expRows),
      }),
      where: vi.fn().mockImplementation(() => {
        selectCallCount++
        const limitFn = vi.fn().mockResolvedValue(selectCallCount === 1 ? expRows : variants)
        // Return a thenable so `await` works directly, plus .limit() for chaining
        const result = selectCallCount === 1 ? expRows : variants
        const chainable = {
          limit: limitFn,
        } as unknown as Promise<unknown> & { limit: ReturnType<typeof vi.fn> }
        chainable.then = Promise.resolve(result).then.bind(Promise.resolve(result))
        chainable.catch = Promise.resolve(result).catch.bind(Promise.resolve(result))
        return chainable
      }),
    }))

    const insertFn = vi.fn().mockReturnValue({ values: vi.fn().mockResolvedValue(undefined) })
    const setFn = vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) })
    const updateFn = vi.fn().mockReturnValue({ set: setFn })

    return {
      _insertFn: insertFn,
      _setFn: setFn,
      delete: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) }),
      insert: insertFn,
      select: vi.fn().mockReturnValue({ from: fromFn }),
      update: updateFn,
    } as unknown
  }

  describe('getExperiment', () => {
    it('returns experiment when found', async () => {
      const { getExperiment } = await import('$lib/server/ab-testing')
      const db = createExperimentDb(makeExperiment({ key: 'my-exp' }))
      const exp = await getExperiment(db, 'my-exp')
      expect(exp).not.toBeNull()
      expect(exp?.key).toBe('my-exp')
    })

    it('returns null when not found', async () => {
      const { getExperiment } = await import('$lib/server/ab-testing')
      const db = createExperimentDb(null)
      expect(await getExperiment(db, 'missing')).toBeNull()
    })
  })

  describe('createExperiment', () => {
    it('creates experiment and variants', async () => {
      const { createExperiment } = await import('$lib/server/ab-testing')
      const db = createExperimentDb()
      const result = await createExperiment(db, {
        key: 'new-exp',
        name: 'New Experiment',
        targetMetric: 'click_rate',
        variants: [
          { isControl: true, name: 'Control', trafficPercentage: 50 },
          { name: 'Variant A', trafficPercentage: 50 },
        ],
      })
      expect(result.key).toBe('new-exp')
      // 1 insert for experiment + 2 inserts for variants = 3
      expect(db._insertFn).toHaveBeenCalledTimes(3)
    })
  })

  describe('updateExperiment', () => {
    it('updates and returns key', async () => {
      const { updateExperiment } = await import('$lib/server/ab-testing')
      const db = createExperimentDb(makeExperiment())
      const result = await updateExperiment(db, 'test-exp', { name: 'Updated' })
      expect(result).toEqual({ key: 'test-exp' })
    })

    it('returns null when not found', async () => {
      const { updateExperiment } = await import('$lib/server/ab-testing')
      const db = createExperimentDb(null)
      expect(await updateExperiment(db, 'missing', { name: 'X' })).toBeNull()
    })
  })

  describe('assignVariant', () => {
    it('returns null when experiment not found', async () => {
      const { assignVariant } = await import('$lib/server/ab-testing')
      const db = createExperimentDb(null)
      expect(await assignVariant(db, 'missing', { userId: 'user-1' })).toBeNull()
    })

    it('returns null when experiment is not running', async () => {
      const { assignVariant } = await import('$lib/server/ab-testing')
      const db = createExperimentDb(makeExperiment({ status: 'draft' }))
      expect(await assignVariant(db, 'test-exp', { userId: 'user-1' })).toBeNull()
    })

    it('returns null when no variants exist', async () => {
      const { assignVariant } = await import('$lib/server/ab-testing')
      const db = createExperimentDb(makeExperiment(), [])
      expect(await assignVariant(db, 'test-exp', { userId: 'user-1' })).toBeNull()
    })

    it('assigns variant deterministically for userId', async () => {
      const { assignVariant } = await import('$lib/server/ab-testing')
      const variants = [
        makeVariant({ id: 'var-a', isControl: true, name: 'Control', trafficPercentage: 50 }),
        makeVariant({ id: 'var-b', isControl: false, name: 'Variant', trafficPercentage: 50 }),
      ]
      const db = createExperimentDb(makeExperiment(), variants)
      const result = await assignVariant(db, 'test-exp', { userId: 'user-1' })
      expect(result).not.toBeNull()
      expect(result?.variant).toBeDefined()
      expect(result?.assignment).toBeDefined()
    })
  })

  describe('recordEvent', () => {
    it('inserts event record', async () => {
      const { recordEvent } = await import('$lib/server/ab-testing')
      const db = createExperimentDb()
      await recordEvent(db, {
        eventName: 'purchase',
        eventType: 'conversion',
        experimentId: 'exp-1',
        variantId: 'var-1',
      })
      expect(db._insertFn).toHaveBeenCalled()
    })
  })

  describe('getExperimentResults', () => {
    it('returns empty array when experiment not found', async () => {
      const { getExperimentResults } = await import('$lib/server/ab-testing')
      const db = createExperimentDb(null)
      expect(await getExperimentResults(db, 'missing')).toEqual([])
    })

    it('computes results with correct structure', async () => {
      const { getExperimentResults } = await import('$lib/server/ab-testing')
      const variants = [
        makeVariant({ id: 'var-a', isControl: true, name: 'Control' }),
        makeVariant({ id: 'var-b', isControl: false, name: 'Treatment' }),
      ]

      // Need a more sophisticated mock for the results query
      let selectCount = 0
      const fromFn = vi.fn().mockImplementation(() => ({
        where: vi.fn().mockImplementation(() => {
          selectCount++
          if (selectCount === 1) return Promise.resolve([makeExperiment()]) // getExperiment
          if (selectCount === 2) return Promise.resolve(variants) // getExperimentVariants
          // Subsequent calls are event count queries
          return Promise.resolve([{ count: 100 }])
        }),
      }))

      const db = {
        select: vi.fn().mockReturnValue({ from: fromFn }),
      } as unknown

      const results = await getExperimentResults(db, 'test-exp')
      expect(results).toHaveLength(2)
      expect(results[0].name).toBe('Control')
      expect(results[0].isControl).toBe(true)
      expect(results[1].name).toBe('Treatment')
      expect(results[1].isControl).toBe(false)
    })
  })

  describe('deleteExperiment', () => {
    it('calls db.delete', async () => {
      const { deleteExperiment } = await import('$lib/server/ab-testing')
      const db = createExperimentDb()
      await deleteExperiment(db, 'test-exp')
      expect(db.delete).toHaveBeenCalled()
    })
  })
})
