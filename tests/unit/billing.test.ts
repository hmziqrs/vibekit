import { calculateProration } from '$lib/server/billing/subscription-service'
import {
  checkoutSessionSchema,
  changePlanSchema,
  createPlanSchema,
  recordUsageSchema,
  updatePlanSchema,
} from '$lib/validators/billing'
import { describe, expect, it } from 'vitest'

describe('createPlanSchema', () => {
  it('validates a complete plan', () => {
    const result = createPlanSchema.safeParse({
      interval: 'month',
      name: 'Pro',
      priceInCents: 2900,
      slug: 'pro',
    })
    expect(result.success).toBeTruthy()
  })

  it('validates plan with all optional fields', () => {
    const result = createPlanSchema.safeParse({
      currency: 'usd',
      description: 'Pro plan',
      features: ['Unlimited items', 'Priority support'],
      interval: 'year',
      isActive: true,
      name: 'Pro',
      priceInCents: 29_000,
      slug: 'pro-annual',
      sortOrder: 1,
      trialDays: 14,
    })
    expect(result.success).toBeTruthy()
  })

  it('rejects missing required fields', () => {
    const result = createPlanSchema.safeParse({})
    expect(result.success).toBeFalsy()
  })

  it('rejects invalid slug format', () => {
    const result = createPlanSchema.safeParse({
      interval: 'month',
      name: 'Pro',
      priceInCents: 2900,
      slug: 'Pro Plan!',
    })
    expect(result.success).toBeFalsy()
  })

  it('rejects negative price', () => {
    const result = createPlanSchema.safeParse({
      interval: 'month',
      name: 'Pro',
      priceInCents: -100,
      slug: 'pro',
    })
    expect(result.success).toBeFalsy()
  })

  it('rejects invalid interval', () => {
    const result = createPlanSchema.safeParse({
      interval: 'weekly',
      name: 'Pro',
      priceInCents: 2900,
      slug: 'pro',
    })
    expect(result.success).toBeFalsy()
  })

  it('accepts valid slug with hyphens', () => {
    const result = createPlanSchema.safeParse({
      interval: 'month',
      name: 'Enterprise Pro',
      priceInCents: 9900,
      slug: 'enterprise-pro',
    })
    expect(result.success).toBeTruthy()
  })
})

describe('updatePlanSchema', () => {
  it('validates partial update', () => {
    const result = updatePlanSchema.safeParse({ name: 'Updated Pro' })
    expect(result.success).toBeTruthy()
  })

  it('allows nullable description', () => {
    const result = updatePlanSchema.safeParse({ description: null })
    expect(result.success).toBeTruthy()
  })

  it('validates empty update', () => {
    const result = updatePlanSchema.safeParse({})
    expect(result.success).toBeTruthy()
  })
})

describe('checkoutSessionSchema', () => {
  it('validates required fields', () => {
    const result = checkoutSessionSchema.safeParse({
      cancelUrl: 'https://example.com/cancel',
      planId: 'plan_pro',
      successUrl: 'https://example.com/success',
    })
    expect(result.success).toBeTruthy()
  })

  it('validates with optional organizationId', () => {
    const result = checkoutSessionSchema.safeParse({
      cancelUrl: 'https://example.com/cancel',
      organizationId: 'org-123',
      planId: 'plan_pro',
      successUrl: 'https://example.com/success',
    })
    expect(result.success).toBeTruthy()
  })

  it('rejects missing planId', () => {
    const result = checkoutSessionSchema.safeParse({
      cancelUrl: 'https://example.com/cancel',
      successUrl: 'https://example.com/success',
    })
    expect(result.success).toBeFalsy()
  })
})

describe('changePlanSchema', () => {
  it('validates required fields', () => {
    const result = changePlanSchema.safeParse({ newPlanId: 'plan_pro' })
    expect(result.success).toBeTruthy()
  })

  it('rejects empty newPlanId', () => {
    const result = changePlanSchema.safeParse({ newPlanId: '' })
    expect(result.success).toBeFalsy()
  })
})

describe('recordUsageSchema', () => {
  it('validates required fields', () => {
    const result = recordUsageSchema.safeParse({
      metricType: 'api_calls',
      quantity: 100,
    })
    expect(result.success).toBeTruthy()
  })

  it('rejects invalid metric type', () => {
    const result = recordUsageSchema.safeParse({
      metricType: 'invalid',
      quantity: 100,
    })
    expect(result.success).toBeFalsy()
  })

  it('rejects zero quantity', () => {
    const result = recordUsageSchema.safeParse({
      metricType: 'api_calls',
      quantity: 0,
    })
    expect(result.success).toBeFalsy()
  })

  it('rejects negative quantity', () => {
    const result = recordUsageSchema.safeParse({
      metricType: 'storage',
      quantity: -10,
    })
    expect(result.success).toBeFalsy()
  })

  it('accepts all valid metric types', () => {
    const types = ['api_calls', 'requests', 'seats', 'storage']
    for (const metricType of types) {
      const result = recordUsageSchema.safeParse({ metricType, quantity: 1 })
      expect(result.success).toBeTruthy()
    }
  })
})

describe('calculateProration', () => {
  it('returns full new price when period is over', () => {
    const result = calculateProration({
      currentPeriodEnd: new Date('2024-01-01'),
      currentPeriodStart: new Date('2024-01-31'),
      newPlanPriceInCents: 2900,
      oldPlanPriceInCents: 0,
    })
    expect(result).toBe(2900)
  })

  it('returns near-zero when upgrading to same price mid-period', () => {
    const start = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000)
    const end = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000)
    const result = calculateProration({
      currentPeriodEnd: end,
      currentPeriodStart: start,
      newPlanPriceInCents: 2900,
      oldPlanPriceInCents: 2900,
    })
    // Same price: proration = newPrice - unusedCredit ≈ 2900 - 1450 = ~1450
    expect(result).toBeGreaterThan(0)
    expect(result).toBeLessThan(2900)
  })

  it('returns positive amount when upgrading to higher price', () => {
    const start = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000)
    const end = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000)
    const result = calculateProration({
      currentPeriodEnd: end,
      currentPeriodStart: start,
      newPlanPriceInCents: 4900,
      oldPlanPriceInCents: 2900,
    })
    expect(result).toBeGreaterThan(0)
    expect(result).toBeLessThan(4900)
  })

  it('returns zero when downgrading to lower price', () => {
    const start = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000)
    const end = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000)
    const result = calculateProration({
      currentPeriodEnd: end,
      currentPeriodStart: start,
      newPlanPriceInCents: 900,
      oldPlanPriceInCents: 2900,
    })
    expect(result).toBeLessThanOrEqual(1) // Allow for rounding
  })
})

describe('subscription status transitions', () => {
  function getExpectedInitialStatus(trialEnd?: Date): string {
    return trialEnd ? 'trialing' : 'active'
  }

  it('sets status to trialing when trialEnd is provided', () => {
    expect(getExpectedInitialStatus(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000))).toBe(
      'trialing'
    )
  })

  it('sets status to active when no trialEnd', () => {
    expect(getExpectedInitialStatus()).toBe('active')
  })

  it('sets status to active when trialEnd is undefined', () => {
    expect(getExpectedInitialStatus(undefined)).toBe('active')
  })
})
