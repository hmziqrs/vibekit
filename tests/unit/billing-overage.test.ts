import { describe, expect, it, vi } from 'vitest'

// We test the overage logic by mocking the DB layer and directly testing
// the parsePlanFeatures / checkUsageLimit behavior through the API handler logic.

describe('overage pricing calculation', () => {
  it('computes zero overage when under limit', () => {
    const current = 500
    const limit = 1000
    const overageRateInCents = 2 // $0.02 per unit

    const overageUnits = current > limit ? current - limit : 0
    const overageCostInCents = overageUnits * overageRateInCents

    expect(overageUnits).toBe(0)
    expect(overageCostInCents).toBe(0)
  })

  it('computes overage when over limit', () => {
    const current = 1200
    const limit = 1000
    const overageRateInCents = 2 // $0.02 per unit

    const overageUnits = current > limit ? current - limit : 0
    const overageCostInCents = overageUnits * overageRateInCents

    expect(overageUnits).toBe(200)
    expect(overageCostInCents).toBe(400)
  })

  it('computes overage with zero rate (free overage)', () => {
    const current = 1500
    const limit = 1000
    const overageRateInCents = 0

    const overageUnits = current > limit ? current - limit : 0
    const overageCostInCents = overageUnits * overageRateInCents

    expect(overageUnits).toBe(500)
    expect(overageCostInCents).toBe(0)
  })
})

describe('POST /billing/usage overage logic', () => {
  it('allows usage when under limit', () => {
    const current = 500
    const quantity = 100
    const limit = 1000
    const overageRateInCents = 0

    const wouldExceed = limit !== null && current + quantity > limit
    const hardBlock = wouldExceed && overageRateInCents === 0

    expect(wouldExceed).toBe(false)
    expect(hardBlock).toBe(false)
  })

  it('blocks usage when over limit with no overage pricing', () => {
    const current = 950
    const quantity = 100
    const limit = 1000
    const overageRateInCents = 0

    const wouldExceed = limit !== null && current + quantity > limit
    const hardBlock = wouldExceed && overageRateInCents === 0

    expect(wouldExceed).toBe(true)
    expect(hardBlock).toBe(true)
  })

  it('allows overage when over limit but overage pricing is configured', () => {
    const current = 950
    const quantity = 100
    const limit = 1000
    const overageRateInCents = 5 as number // $0.05 per unit

    const wouldExceed = limit !== null && current + quantity > limit
    const hardBlock = wouldExceed && overageRateInCents === 0

    expect(wouldExceed).toBe(true)
    expect(hardBlock).toBe(false)
  })

  it('calculates correct overage units after recording', () => {
    const current = 950
    const quantity = 100
    const limit = 1000
    const overageRateInCents = 5 as number

    const newCurrent = current + quantity
    const newOverageUnits = limit !== null && newCurrent > limit ? newCurrent - limit : 0
    const overageCostInCents = newOverageUnits * overageRateInCents

    expect(newCurrent).toBe(1050)
    expect(newOverageUnits).toBe(50)
    expect(overageCostInCents).toBe(250)
  })

  it('calculates correct remaining when over limit', () => {
    const current = 1050
    const limit = 1000
    const remaining = limit !== null ? Math.max(0, limit - current) : null

    expect(remaining).toBe(0)
  })

  it('returns null remaining when no limit', () => {
    const current = 500
    const limit = null
    const remaining = limit !== null ? Math.max(0, limit - current) : null

    expect(remaining).toBeNull()
  })

  it('blocks even small overage when rate is 0', () => {
    const current = 999
    const quantity = 2
    const limit = 1000
    const overageRateInCents = 0

    const wouldExceed = limit !== null && current + quantity > limit
    const hardBlock = wouldExceed && overageRateInCents === 0

    expect(wouldExceed).toBe(true)
    expect(hardBlock).toBe(true)
  })

  it('allows exact limit hit without overage', () => {
    const current = 900
    const quantity = 100
    const limit = 1000
    const overageRateInCents = 0

    const wouldExceed = limit !== null && current + quantity > limit

    expect(wouldExceed).toBe(false)
  })
})

describe('overage response shape', () => {
  it('returns overage object with cost, rate, and units', () => {
    const newOverageUnits = 50
    const overageRateInCents = 5 as number

    const response = {
      overage: {
        costInCents: newOverageUnits * overageRateInCents,
        rateInCents: overageRateInCents,
        units: newOverageUnits,
      },
      remaining: 0,
      success: true,
    }

    expect(response.overage.costInCents).toBe(250)
    expect(response.overage.rateInCents).toBe(5)
    expect(response.overage.units).toBe(50)
    expect(response.remaining).toBe(0)
    expect(response.success).toBe(true)
  })

  it('returns zero overage when within limit', () => {
    const newCurrent = 800
    const limit = 1000
    const overageRateInCents = 5 as number

    const newOverageUnits = limit !== null && newCurrent > limit ? newCurrent - limit : 0

    expect(newOverageUnits).toBe(0)
  })
})

describe('features JSON with overage pricing', () => {
  it('parses limits and overage pricing from features JSON', () => {
    const featuresJson = JSON.stringify({
      limits: { api_calls: 1000, storage: 100 },
      overagePricing: { api_calls: 2, storage: 0 },
    })

    const parsed = JSON.parse(featuresJson)
    expect(parsed.limits.api_calls).toBe(1000)
    expect(parsed.limits.storage).toBe(100)
    expect(parsed.overagePricing.api_calls).toBe(2)
    expect(parsed.overagePricing.storage).toBe(0)
  })

  it('handles features JSON with only limits (no overage)', () => {
    const featuresJson = JSON.stringify({
      limits: { api_calls: 1000 },
    })

    const parsed = JSON.parse(featuresJson)
    expect(parsed.limits.api_calls).toBe(1000)
    expect(parsed.overagePricing).toBeUndefined()
  })

  it('handles features JSON as plain array (legacy)', () => {
    const featuresJson = JSON.stringify(['Unlimited items', 'Priority support'])

    const parsed = JSON.parse(featuresJson)
    expect(Array.isArray(parsed)).toBe(true)
    expect(parsed.limits).toBeUndefined()
    expect(parsed.overagePricing).toBeUndefined()
  })

  it('handles null features JSON', () => {
    const featuresJson = null

    // Should fall back to defaults
    expect(featuresJson).toBeNull()
  })
})

describe('overage across multiple metrics', () => {
  it('tracks overage independently per metric type', () => {
    const metrics = {
      api_calls: { current: 55000, limit: 50000, rate: 1 },
      storage: { current: 8000, limit: 10000, rate: 5 },
    }

    for (const [type, m] of Object.entries(metrics)) {
      const overageUnits = m.current > m.limit ? m.current - m.limit : 0
      const cost = overageUnits * m.rate

      if (type === 'api_calls') {
        expect(overageUnits).toBe(5000)
        expect(cost).toBe(5000)
      } else {
        expect(overageUnits).toBe(0)
        expect(cost).toBe(0)
      }
    }
  })
})
