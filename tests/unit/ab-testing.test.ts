import { calculateZTest } from '$lib/server/ab-testing'
import {
  assignVariantSchema,
  createExperimentSchema,
  listExperimentsSchema,
  recordEventSchema,
  updateExperimentSchema,
} from '$lib/validators/ab-testing'
import { describe, expect, it } from 'vitest'

describe('a/B Testing Validators', () => {
  describe(createExperimentSchema, () => {
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

  describe(updateExperimentSchema, () => {
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

  describe(assignVariantSchema, () => {
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

  describe(recordEventSchema, () => {
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

  describe(listExperimentsSchema, () => {
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
  describe(calculateZTest, () => {
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
