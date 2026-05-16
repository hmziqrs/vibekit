import {
  createPlanSchema,
  updatePlanSchema,
  checkoutSessionSchema,
  changePlanSchema,
  recordUsageSchema,
  refundSchema,
  createCouponSchema,
  updateCouponSchema,
  redeemCouponSchema,
  portalSessionSchema,
  paymentMethodIdSchema,
} from '$lib/validators/billing'
import { describe, expect, it } from 'vitest'

describe('createPlanSchema', () => {
  const validPlan = {
    interval: 'month',
    name: 'Pro Plan',
    priceInCents: 2900,
    slug: 'pro',
  }

  it('accepts valid plan with required fields', () => {
    const result = createPlanSchema.safeParse(validPlan)
    expect(result.success).toBe(true)
    expect(result.success && result.data.slug).toBe('pro')
  })

  it('accepts plan with all optional fields', () => {
    const result = createPlanSchema.safeParse({
      ...validPlan,
      currency: 'usd',
      description: 'Professional plan',
      features: ['Unlimited projects', 'Priority support'],
      isActive: true,
      sortOrder: 1,
      stripePriceId: 'price_123',
      taxInclusive: false,
      taxRate: 800,
      trialDays: 14,
    })
    expect(result.success).toBe(true)
  })

  it('trims whitespace from name', () => {
    const result = createPlanSchema.safeParse({ ...validPlan, name: '  Pro  ' })
    expect(result.success).toBe(true)
    expect(result.success && result.data.name).toBe('Pro')
  })

  it('rejects missing name', () => {
    const result = createPlanSchema.safeParse({
      interval: 'month',
      priceInCents: 2900,
      slug: 'pro',
    })
    expect(result.success).toBe(false)
  })

  it('rejects empty name', () => {
    const result = createPlanSchema.safeParse({ ...validPlan, name: '' })
    expect(result.success).toBe(false)
  })

  it('rejects name exceeding 100 chars', () => {
    const result = createPlanSchema.safeParse({ ...validPlan, name: 'a'.repeat(101) })
    expect(result.success).toBe(false)
  })

  it('rejects invalid slug with uppercase', () => {
    const result = createPlanSchema.safeParse({ ...validPlan, slug: 'Pro' })
    expect(result.success).toBe(false)
  })

  it('rejects invalid slug with spaces', () => {
    const result = createPlanSchema.safeParse({ ...validPlan, slug: 'pro plan' })
    expect(result.success).toBe(false)
  })

  it('accepts slug with hyphens', () => {
    const result = createPlanSchema.safeParse({ ...validPlan, slug: 'pro-plan' })
    expect(result.success).toBe(true)
  })

  it('accepts slug with numbers', () => {
    const result = createPlanSchema.safeParse({ ...validPlan, slug: 'plan-v2' })
    expect(result.success).toBe(true)
  })

  it('rejects slug exceeding 50 chars', () => {
    const result = createPlanSchema.safeParse({
      ...validPlan,
      slug: 'a'.repeat(51),
    })
    expect(result.success).toBe(false)
  })

  it('accepts yearly interval', () => {
    const result = createPlanSchema.safeParse({ ...validPlan, interval: 'year' })
    expect(result.success).toBe(true)
  })

  it('rejects invalid interval', () => {
    const result = createPlanSchema.safeParse({ ...validPlan, interval: 'weekly' })
    expect(result.success).toBe(false)
  })

  it('rejects negative priceInCents', () => {
    const result = createPlanSchema.safeParse({ ...validPlan, priceInCents: -1 })
    expect(result.success).toBe(false)
  })

  it('accepts zero priceInCents (free plan)', () => {
    const result = createPlanSchema.safeParse({ ...validPlan, priceInCents: 0 })
    expect(result.success).toBe(true)
  })

  it('rejects non-integer priceInCents', () => {
    const result = createPlanSchema.safeParse({ ...validPlan, priceInCents: 29.99 })
    expect(result.success).toBe(false)
  })

  it('accepts currency with exactly 3 chars', () => {
    const result = createPlanSchema.safeParse({ ...validPlan, currency: 'eur' })
    expect(result.success).toBe(true)
  })

  it('rejects currency with 2 chars', () => {
    const result = createPlanSchema.safeParse({ ...validPlan, currency: 'eu' })
    expect(result.success).toBe(false)
  })

  it('rejects currency with 4 chars', () => {
    const result = createPlanSchema.safeParse({ ...validPlan, currency: 'euro' })
    expect(result.success).toBe(false)
  })

  it('rejects features array exceeding 20 items', () => {
    const result = createPlanSchema.safeParse({
      ...validPlan,
      features: Array.from({ length: 21 }, (_, i) => `Feature ${i}`),
    })
    expect(result.success).toBe(false)
  })

  it('rejects feature string exceeding 100 chars', () => {
    const result = createPlanSchema.safeParse({
      ...validPlan,
      features: ['a'.repeat(101)],
    })
    expect(result.success).toBe(false)
  })

  it('accepts features at exactly 20 items', () => {
    const result = createPlanSchema.safeParse({
      ...validPlan,
      features: Array.from({ length: 20 }, (_, i) => `Feature ${i}`),
    })
    expect(result.success).toBe(true)
  })

  it('rejects taxRate exceeding 10000', () => {
    const result = createPlanSchema.safeParse({ ...validPlan, taxRate: 10001 })
    expect(result.success).toBe(false)
  })

  it('accepts taxRate of 10000 (100%)', () => {
    const result = createPlanSchema.safeParse({ ...validPlan, taxRate: 10000 })
    expect(result.success).toBe(true)
  })

  it('rejects negative taxRate', () => {
    const result = createPlanSchema.safeParse({ ...validPlan, taxRate: -1 })
    expect(result.success).toBe(false)
  })

  it('rejects negative trialDays', () => {
    const result = createPlanSchema.safeParse({ ...validPlan, trialDays: -1 })
    expect(result.success).toBe(false)
  })

  it('accepts trialDays of 0', () => {
    const result = createPlanSchema.safeParse({ ...validPlan, trialDays: 0 })
    expect(result.success).toBe(true)
  })
})

describe('updatePlanSchema', () => {
  it('accepts empty update object', () => {
    const result = updatePlanSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('accepts partial update with name only', () => {
    const result = updatePlanSchema.safeParse({ name: 'Updated Plan' })
    expect(result.success).toBe(true)
  })

  it('accepts nullable description', () => {
    const result = updatePlanSchema.safeParse({ description: null })
    expect(result.success).toBe(true)
    expect(result.success && result.data.description).toBeNull()
  })

  it('accepts nullable stripePriceId', () => {
    const result = updatePlanSchema.safeParse({ stripePriceId: null })
    expect(result.success).toBe(true)
  })

  it('accepts nullable taxRate', () => {
    const result = updatePlanSchema.safeParse({ taxRate: null })
    expect(result.success).toBe(true)
  })
})

describe('checkoutSessionSchema', () => {
  it('accepts valid checkout session', () => {
    const result = checkoutSessionSchema.safeParse({
      cancelUrl: 'https://example.com/cancel',
      planId: 'plan_123',
      successUrl: 'https://example.com/success',
    })
    expect(result.success).toBe(true)
  })

  it('accepts checkout with organizationId', () => {
    const result = checkoutSessionSchema.safeParse({
      cancelUrl: 'https://example.com/cancel',
      organizationId: 'org_123',
      planId: 'plan_123',
      successUrl: 'https://example.com/success',
    })
    expect(result.success).toBe(true)
  })

  it('rejects missing planId', () => {
    const result = checkoutSessionSchema.safeParse({
      cancelUrl: 'https://example.com/cancel',
      successUrl: 'https://example.com/success',
    })
    expect(result.success).toBe(false)
  })

  it('rejects empty planId', () => {
    const result = checkoutSessionSchema.safeParse({
      cancelUrl: 'https://example.com/cancel',
      planId: '',
      successUrl: 'https://example.com/success',
    })
    expect(result.success).toBe(false)
  })

  it('rejects missing successUrl', () => {
    const result = checkoutSessionSchema.safeParse({
      cancelUrl: 'https://example.com/cancel',
      planId: 'plan_123',
    })
    expect(result.success).toBe(false)
  })

  it('rejects missing cancelUrl', () => {
    const result = checkoutSessionSchema.safeParse({
      planId: 'plan_123',
      successUrl: 'https://example.com/success',
    })
    expect(result.success).toBe(false)
  })
})

describe('changePlanSchema', () => {
  it('accepts valid plan change', () => {
    const result = changePlanSchema.safeParse({ newPlanId: 'plan_pro' })
    expect(result.success).toBe(true)
  })

  it('accepts plan change with organizationId', () => {
    const result = changePlanSchema.safeParse({
      newPlanId: 'plan_pro',
      organizationId: 'org_123',
    })
    expect(result.success).toBe(true)
  })

  it('rejects missing newPlanId', () => {
    const result = changePlanSchema.safeParse({})
    expect(result.success).toBe(false)
  })

  it('rejects empty newPlanId', () => {
    const result = changePlanSchema.safeParse({ newPlanId: '' })
    expect(result.success).toBe(false)
  })
})

describe('recordUsageSchema', () => {
  it('accepts valid usage record for api_calls', () => {
    const result = recordUsageSchema.safeParse({
      metricType: 'api_calls',
      quantity: 100,
    })
    expect(result.success).toBe(true)
  })

  it('accepts all metric types', () => {
    for (const metricType of ['api_calls', 'requests', 'seats', 'storage'] as const) {
      const result = recordUsageSchema.safeParse({ metricType, quantity: 1 })
      expect(result.success).toBe(true)
    }
  })

  it('rejects invalid metric type', () => {
    const result = recordUsageSchema.safeParse({
      metricType: 'bandwidth',
      quantity: 100,
    })
    expect(result.success).toBe(false)
  })

  it('rejects zero quantity', () => {
    const result = recordUsageSchema.safeParse({
      metricType: 'api_calls',
      quantity: 0,
    })
    expect(result.success).toBe(false)
  })

  it('rejects negative quantity', () => {
    const result = recordUsageSchema.safeParse({
      metricType: 'api_calls',
      quantity: -1,
    })
    expect(result.success).toBe(false)
  })

  it('rejects non-integer quantity', () => {
    const result = recordUsageSchema.safeParse({
      metricType: 'api_calls',
      quantity: 1.5,
    })
    expect(result.success).toBe(false)
  })

  it('rejects missing metricType', () => {
    const result = recordUsageSchema.safeParse({ quantity: 100 })
    expect(result.success).toBe(false)
  })

  it('rejects missing quantity', () => {
    const result = recordUsageSchema.safeParse({ metricType: 'api_calls' })
    expect(result.success).toBe(false)
  })
})

describe('refundSchema', () => {
  it('accepts refund with invoiceId only', () => {
    const result = refundSchema.safeParse({ invoiceId: 'inv_123' })
    expect(result.success).toBe(true)
  })

  it('accepts refund with all fields', () => {
    const result = refundSchema.safeParse({
      amountInCents: 500,
      invoiceId: 'inv_123',
      reason: 'requested_by_customer',
    })
    expect(result.success).toBe(true)
  })

  it('accepts all valid reasons', () => {
    for (const reason of ['duplicate', 'fraudulent', 'requested_by_customer'] as const) {
      const result = refundSchema.safeParse({ invoiceId: 'inv_123', reason })
      expect(result.success).toBe(true)
    }
  })

  it('rejects missing invoiceId', () => {
    const result = refundSchema.safeParse({})
    expect(result.success).toBe(false)
  })

  it('rejects empty invoiceId', () => {
    const result = refundSchema.safeParse({ invoiceId: '' })
    expect(result.success).toBe(false)
  })

  it('rejects invalid reason', () => {
    const result = refundSchema.safeParse({
      invoiceId: 'inv_123',
      reason: 'other',
    })
    expect(result.success).toBe(false)
  })

  it('rejects zero amountInCents', () => {
    const result = refundSchema.safeParse({
      amountInCents: 0,
      invoiceId: 'inv_123',
    })
    expect(result.success).toBe(false)
  })

  it('rejects negative amountInCents', () => {
    const result = refundSchema.safeParse({
      amountInCents: -100,
      invoiceId: 'inv_123',
    })
    expect(result.success).toBe(false)
  })

  it('rejects amountInCents exceeding 1 billion', () => {
    const result = refundSchema.safeParse({
      amountInCents: 1_000_000_001,
      invoiceId: 'inv_123',
    })
    expect(result.success).toBe(false)
  })

  it('accepts amountInCents at exactly 1 billion', () => {
    const result = refundSchema.safeParse({
      amountInCents: 1_000_000_000,
      invoiceId: 'inv_123',
    })
    expect(result.success).toBe(true)
  })

  it('rejects non-integer amountInCents', () => {
    const result = refundSchema.safeParse({
      amountInCents: 50.5,
      invoiceId: 'inv_123',
    })
    expect(result.success).toBe(false)
  })
})

describe('createCouponSchema', () => {
  const validCoupon = {
    code: 'SAVE20',
    name: '20% Off',
    percentOff: 20,
  }

  it('accepts valid coupon with required fields', () => {
    const result = createCouponSchema.safeParse(validCoupon)
    expect(result.success).toBe(true)
  })

  it('accepts coupon with all optional fields', () => {
    const result = createCouponSchema.safeParse({
      ...validCoupon,
      active: true,
      currency: 'usd',
      duration: 'once',
      durationInMonths: 3,
      maxRedemptions: 100,
      redeemBy: 1735689600,
    })
    expect(result.success).toBe(true)
  })

  it('rejects code with lowercase', () => {
    const result = createCouponSchema.safeParse({ ...validCoupon, code: 'save20' })
    expect(result.success).toBe(false)
  })

  it('rejects code with spaces', () => {
    const result = createCouponSchema.safeParse({ ...validCoupon, code: 'SAVE 20' })
    expect(result.success).toBe(false)
  })

  it('accepts code with hyphens and numbers', () => {
    const result = createCouponSchema.safeParse({ ...validCoupon, code: 'SAVE-20-2024' })
    expect(result.success).toBe(true)
  })

  it('rejects code shorter than 3 chars', () => {
    const result = createCouponSchema.safeParse({ ...validCoupon, code: 'AB' })
    expect(result.success).toBe(false)
  })

  it('rejects code longer than 50 chars', () => {
    const result = createCouponSchema.safeParse({
      ...validCoupon,
      code: 'A'.repeat(51),
    })
    expect(result.success).toBe(false)
  })

  it('rejects percentOff of 0', () => {
    const result = createCouponSchema.safeParse({ ...validCoupon, percentOff: 0 })
    expect(result.success).toBe(false)
  })

  it('rejects percentOff exceeding 100', () => {
    const result = createCouponSchema.safeParse({ ...validCoupon, percentOff: 101 })
    expect(result.success).toBe(false)
  })

  it('accepts percentOff at exactly 100', () => {
    const result = createCouponSchema.safeParse({ ...validCoupon, percentOff: 100 })
    expect(result.success).toBe(true)
  })

  it('rejects negative percentOff', () => {
    const result = createCouponSchema.safeParse({ ...validCoupon, percentOff: -1 })
    expect(result.success).toBe(false)
  })

  it('accepts all valid durations', () => {
    for (const duration of ['forever', 'once', 'repeating'] as const) {
      const result = createCouponSchema.safeParse({ ...validCoupon, duration })
      expect(result.success).toBe(true)
    }
  })

  it('rejects invalid duration', () => {
    const result = createCouponSchema.safeParse({ ...validCoupon, duration: 'monthly' })
    expect(result.success).toBe(false)
  })

  it('rejects durationInMonths of 0', () => {
    const result = createCouponSchema.safeParse({ ...validCoupon, durationInMonths: 0 })
    expect(result.success).toBe(false)
  })

  it('rejects negative durationInMonths', () => {
    const result = createCouponSchema.safeParse({ ...validCoupon, durationInMonths: -1 })
    expect(result.success).toBe(false)
  })

  it('rejects maxRedemptions of 0', () => {
    const result = createCouponSchema.safeParse({ ...validCoupon, maxRedemptions: 0 })
    expect(result.success).toBe(false)
  })

  it('rejects negative maxRedemptions', () => {
    const result = createCouponSchema.safeParse({ ...validCoupon, maxRedemptions: -1 })
    expect(result.success).toBe(false)
  })

  it('rejects non-positive redeemBy', () => {
    const result = createCouponSchema.safeParse({ ...validCoupon, redeemBy: 0 })
    expect(result.success).toBe(false)
  })

  it('rejects negative redeemBy', () => {
    const result = createCouponSchema.safeParse({ ...validCoupon, redeemBy: -100 })
    expect(result.success).toBe(false)
  })
})

describe('updateCouponSchema', () => {
  it('accepts empty update', () => {
    const result = updateCouponSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('accepts name update only', () => {
    const result = updateCouponSchema.safeParse({ name: 'Updated Name' })
    expect(result.success).toBe(true)
  })

  it('accepts active toggle only', () => {
    const result = updateCouponSchema.safeParse({ active: false })
    expect(result.success).toBe(true)
  })

  it('rejects empty name', () => {
    const result = updateCouponSchema.safeParse({ name: '' })
    expect(result.success).toBe(false)
  })
})

describe('redeemCouponSchema', () => {
  it('accepts valid coupon code', () => {
    const result = redeemCouponSchema.safeParse({ code: 'SAVE20' })
    expect(result.success).toBe(true)
  })

  it('rejects empty code', () => {
    const result = redeemCouponSchema.safeParse({ code: '' })
    expect(result.success).toBe(false)
  })

  it('rejects missing code', () => {
    const result = redeemCouponSchema.safeParse({})
    expect(result.success).toBe(false)
  })

  it('trims whitespace from code', () => {
    const result = redeemCouponSchema.safeParse({ code: '  SAVE20  ' })
    expect(result.success).toBe(true)
    expect(result.success && result.data.code).toBe('SAVE20')
  })
})

describe('portalSessionSchema', () => {
  it('accepts valid return URL', () => {
    const result = portalSessionSchema.safeParse({
      returnUrl: 'https://example.com/settings/billing',
    })
    expect(result.success).toBe(true)
  })

  it('rejects empty returnUrl', () => {
    const result = portalSessionSchema.safeParse({ returnUrl: '' })
    expect(result.success).toBe(false)
  })

  it('rejects missing returnUrl', () => {
    const result = portalSessionSchema.safeParse({})
    expect(result.success).toBe(false)
  })
})

describe('paymentMethodIdSchema', () => {
  it('accepts valid payment method ID', () => {
    const result = paymentMethodIdSchema.safeParse({
      paymentMethodId: 'pm_1234567890',
    })
    expect(result.success).toBe(true)
  })

  it('rejects empty payment method ID', () => {
    const result = paymentMethodIdSchema.safeParse({ paymentMethodId: '' })
    expect(result.success).toBe(false)
  })

  it('rejects missing payment method ID', () => {
    const result = paymentMethodIdSchema.safeParse({})
    expect(result.success).toBe(false)
  })

  it('trims whitespace from payment method ID', () => {
    const result = paymentMethodIdSchema.safeParse({
      paymentMethodId: '  pm_123  ',
    })
    expect(result.success).toBe(true)
    expect(result.success && result.data.paymentMethodId).toBe('pm_123')
  })
})
