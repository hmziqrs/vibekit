import {
  changePlanSchema,
  checkoutSessionSchema,
  createPlanSchema,
  recordUsageSchema,
  updatePlanSchema,
} from '$lib/validators/billing'
import { describe, expect, it } from 'vitest'

// ---------------------------------------------------------------------------
// createPlanSchema
// ---------------------------------------------------------------------------
describe('createPlanSchema', () => {
  const validInput = {
    interval: 'month',
    name: 'Pro Plan',
    priceInCents: 1999,
    slug: 'pro-plan',
  }

  // -- Valid inputs ---------------------------------------------------------

  it('validates minimal required input', () => {
    const result = createPlanSchema.safeParse(validInput)
    expect(result.success).toBeTruthy()
  })

  it('validates full input with all optional fields', () => {
    const result = createPlanSchema.safeParse({
      currency: 'USD',
      description: 'Everything you need to grow.',
      features: ['Unlimited seats', 'Priority support', 'API access'],
      interval: 'year',
      isActive: true,
      name: 'Enterprise',
      priceInCents: 9999,
      slug: 'enterprise',
      sortOrder: 10,
      stripePriceId: 'price_1abc',
      trialDays: 14,
    })
    expect(result.success).toBeTruthy()
  })

  it('accepts year interval', () => {
    const result = createPlanSchema.safeParse({ ...validInput, interval: 'year' })
    expect(result.success).toBeTruthy()
  })

  it('accepts zero priceInCents (free plan)', () => {
    const result = createPlanSchema.safeParse({ ...validInput, priceInCents: 0 })
    expect(result.success).toBeTruthy()
  })

  it('accepts zero trialDays', () => {
    const result = createPlanSchema.safeParse({ ...validInput, trialDays: 0 })
    expect(result.success).toBeTruthy()
  })

  it('accepts zero sortOrder', () => {
    const result = createPlanSchema.safeParse({ ...validInput, sortOrder: 0 })
    expect(result.success).toBeTruthy()
  })

  // -- Missing required fields -----------------------------------------------

  it('rejects missing name', () => {
    const { name, ...rest } = validInput
    const result = createPlanSchema.safeParse(rest)
    expect(result.success).toBeFalsy()
  })

  it('rejects missing slug', () => {
    const { slug, ...rest } = validInput
    const result = createPlanSchema.safeParse(rest)
    expect(result.success).toBeFalsy()
  })

  it('rejects missing interval', () => {
    const { interval, ...rest } = validInput
    const result = createPlanSchema.safeParse(rest)
    expect(result.success).toBeFalsy()
  })

  it('rejects missing priceInCents', () => {
    const { priceInCents, ...rest } = validInput
    const result = createPlanSchema.safeParse(rest)
    expect(result.success).toBeFalsy()
  })

  // -- Invalid types --------------------------------------------------------

  it('rejects name that is not a string', () => {
    const result = createPlanSchema.safeParse({ ...validInput, name: 123 })
    expect(result.success).toBeFalsy()
  })

  it('rejects priceInCents that is a string', () => {
    const result = createPlanSchema.safeParse({ ...validInput, priceInCents: '1999' })
    expect(result.success).toBeFalsy()
  })

  it('rejects interval that is not a valid enum value', () => {
    const result = createPlanSchema.safeParse({ ...validInput, interval: 'weekly' })
    expect(result.success).toBeFalsy()
  })

  it('rejects isActive that is not a boolean', () => {
    const result = createPlanSchema.safeParse({ ...validInput, isActive: 'true' })
    expect(result.success).toBeFalsy()
  })

  it('rejects features that is not an array', () => {
    const result = createPlanSchema.safeParse({ ...validInput, features: 'not-array' })
    expect(result.success).toBeFalsy()
  })

  // -- Boundary values ------------------------------------------------------

  it('rejects empty name', () => {
    const result = createPlanSchema.safeParse({ ...validInput, name: '' })
    expect(result.success).toBeFalsy()
  })

  it('accepts name at max length (100)', () => {
    const result = createPlanSchema.safeParse({
      ...validInput,
      name: 'a'.repeat(100),
    })
    expect(result.success).toBeTruthy()
  })

  it('rejects name exceeding max length (101)', () => {
    const result = createPlanSchema.safeParse({
      ...validInput,
      name: 'a'.repeat(101),
    })
    expect(result.success).toBeFalsy()
  })

  it('rejects empty slug', () => {
    const result = createPlanSchema.safeParse({ ...validInput, slug: '' })
    expect(result.success).toBeFalsy()
  })

  it('accepts slug at max length (50)', () => {
    const result = createPlanSchema.safeParse({
      ...validInput,
      slug: 'a'.repeat(50),
    })
    expect(result.success).toBeTruthy()
  })

  it('rejects slug exceeding max length (51)', () => {
    const result = createPlanSchema.safeParse({
      ...validInput,
      slug: 'a'.repeat(51),
    })
    expect(result.success).toBeFalsy()
  })

  it('rejects negative priceInCents', () => {
    const result = createPlanSchema.safeParse({ ...validInput, priceInCents: -1 })
    expect(result.success).toBeFalsy()
  })

  it('rejects float priceInCents', () => {
    const result = createPlanSchema.safeParse({ ...validInput, priceInCents: 10.5 })
    expect(result.success).toBeFalsy()
  })

  it('rejects negative trialDays', () => {
    const result = createPlanSchema.safeParse({ ...validInput, trialDays: -1 })
    expect(result.success).toBeFalsy()
  })

  it('rejects negative sortOrder', () => {
    const result = createPlanSchema.safeParse({ ...validInput, sortOrder: -1 })
    expect(result.success).toBeFalsy()
  })

  // -- Slug regex ------------------------------------------------------------

  it('rejects slug with uppercase letters', () => {
    const result = createPlanSchema.safeParse({ ...validInput, slug: 'Pro-Plan' })
    expect(result.success).toBeFalsy()
  })

  it('rejects slug with spaces', () => {
    const result = createPlanSchema.safeParse({ ...validInput, slug: 'pro plan' })
    expect(result.success).toBeFalsy()
  })

  it('rejects slug with special characters', () => {
    const result = createPlanSchema.safeParse({ ...validInput, slug: 'pro_plan!' })
    expect(result.success).toBeFalsy()
  })

  it('accepts slug with only numbers', () => {
    const result = createPlanSchema.safeParse({ ...validInput, slug: '123-456' })
    expect(result.success).toBeTruthy()
  })

  // -- Optional fields ------------------------------------------------------

  it('accepts valid currency code (3 chars)', () => {
    const result = createPlanSchema.safeParse({ ...validInput, currency: 'EUR' })
    expect(result.success).toBeTruthy()
  })

  it('rejects currency with length other than 3', () => {
    const result = createPlanSchema.safeParse({ ...validInput, currency: 'US' })
    expect(result.success).toBeFalsy()
  })

  it('rejects empty currency', () => {
    const result = createPlanSchema.safeParse({ ...validInput, currency: '' })
    expect(result.success).toBeFalsy()
  })

  it('accepts description at max length (500)', () => {
    const result = createPlanSchema.safeParse({
      ...validInput,
      description: 'a'.repeat(500),
    })
    expect(result.success).toBeTruthy()
  })

  it('rejects description exceeding max length (501)', () => {
    const result = createPlanSchema.safeParse({
      ...validInput,
      description: 'a'.repeat(501),
    })
    expect(result.success).toBeFalsy()
  })

  it('accepts features array at max size (20)', () => {
    const features = Array.from({ length: 20 }, (_, i) => `feature-${i}`)
    const result = createPlanSchema.safeParse({ ...validInput, features })
    expect(result.success).toBeTruthy()
  })

  it('rejects features array exceeding max size (21)', () => {
    const features = Array.from({ length: 21 }, (_, i) => `feature-${i}`)
    const result = createPlanSchema.safeParse({ ...validInput, features })
    expect(result.success).toBeFalsy()
  })

  it('rejects feature string exceeding max length (101)', () => {
    const result = createPlanSchema.safeParse({
      ...validInput,
      features: ['a'.repeat(101)],
    })
    expect(result.success).toBeFalsy()
  })

  // -- Trimming --------------------------------------------------------------

  it('trims whitespace from string fields', () => {
    const data = createPlanSchema.parse({
      ...validInput,
      name: '  Pro Plan  ',
      slug: '  pro-plan  ',
    })
    expect(data.name).toBe('Pro Plan')
    expect(data.slug).toBe('pro-plan')
  })
})

// ---------------------------------------------------------------------------
// updatePlanSchema
// ---------------------------------------------------------------------------
describe('updatePlanSchema', () => {
  // -- Valid inputs ---------------------------------------------------------

  it('allows empty object (no fields to update)', () => {
    const result = updatePlanSchema.safeParse({})
    expect(result.success).toBeTruthy()
  })

  it('allows partial update with single field', () => {
    const result = updatePlanSchema.safeParse({ name: 'Updated Name' })
    expect(result.success).toBeTruthy()
  })

  it('allows partial update with multiple fields', () => {
    const result = updatePlanSchema.safeParse({
      description: 'New description',
      isActive: false,
      priceInCents: 2999,
    })
    expect(result.success).toBeTruthy()
  })

  it('accepts valid interval values', () => {
    const result = updatePlanSchema.safeParse({ interval: 'year' })
    expect(result.success).toBeTruthy()
  })

  it('accepts null for nullable fields', () => {
    const result = updatePlanSchema.safeParse({
      description: null,
      stripePriceId: null,
    })
    expect(result.success).toBeTruthy()
  })

  // -- Invalid types --------------------------------------------------------

  it('rejects invalid name type', () => {
    const result = updatePlanSchema.safeParse({ name: 123 })
    expect(result.success).toBeFalsy()
  })

  it('rejects invalid priceInCents type', () => {
    const result = updatePlanSchema.safeParse({ priceInCents: 'free' })
    expect(result.success).toBeFalsy()
  })

  it('rejects invalid interval value', () => {
    const result = updatePlanSchema.safeParse({ interval: 'weekly' })
    expect(result.success).toBeFalsy()
  })

  it('rejects invalid isActive type', () => {
    const result = updatePlanSchema.safeParse({ isActive: 'yes' })
    expect(result.success).toBeFalsy()
  })

  // -- Boundary values ------------------------------------------------------

  it('rejects name exceeding max length', () => {
    const result = updatePlanSchema.safeParse({ name: 'a'.repeat(101) })
    expect(result.success).toBeFalsy()
  })

  it('rejects empty name', () => {
    const result = updatePlanSchema.safeParse({ name: '' })
    expect(result.success).toBeFalsy()
  })

  it('rejects description exceeding max length', () => {
    const result = updatePlanSchema.safeParse({ description: 'a'.repeat(501) })
    expect(result.success).toBeFalsy()
  })

  it('rejects negative priceInCents', () => {
    const result = updatePlanSchema.safeParse({ priceInCents: -5 })
    expect(result.success).toBeFalsy()
  })

  it('rejects float priceInCents', () => {
    const result = updatePlanSchema.safeParse({ priceInCents: 10.5 })
    expect(result.success).toBeFalsy()
  })

  it('rejects currency with length other than 3', () => {
    const result = updatePlanSchema.safeParse({ currency: 'USDD' })
    expect(result.success).toBeFalsy()
  })

  it('rejects negative trialDays', () => {
    const result = updatePlanSchema.safeParse({ trialDays: -1 })
    expect(result.success).toBeFalsy()
  })

  it('rejects negative sortOrder', () => {
    const result = updatePlanSchema.safeParse({ sortOrder: -1 })
    expect(result.success).toBeFalsy()
  })

  it('rejects features array exceeding max size', () => {
    const features = Array.from({ length: 21 }, (_, i) => `f${i}`)
    const result = updatePlanSchema.safeParse({ features })
    expect(result.success).toBeFalsy()
  })

  it('rejects feature string exceeding max length', () => {
    const result = updatePlanSchema.safeParse({ features: ['a'.repeat(101)] })
    expect(result.success).toBeFalsy()
  })

  // -- Nullable fields ------------------------------------------------------

  it('does not accept null for non-nullable fields', () => {
    const result = updatePlanSchema.safeParse({ name: null })
    expect(result.success).toBeFalsy()
  })

  it('does not accept null for interval', () => {
    const result = updatePlanSchema.safeParse({ interval: null })
    expect(result.success).toBeFalsy()
  })
})

// ---------------------------------------------------------------------------
// checkoutSessionSchema
// ---------------------------------------------------------------------------
describe('checkoutSessionSchema', () => {
  const validInput = {
    cancelUrl: 'https://example.com/cancel',
    planId: 'plan-abc-123',
    successUrl: 'https://example.com/success',
  }

  // -- Valid inputs ---------------------------------------------------------

  it('validates minimal required input', () => {
    const result = checkoutSessionSchema.safeParse(validInput)
    expect(result.success).toBeTruthy()
  })

  it('validates input with optional organizationId', () => {
    const result = checkoutSessionSchema.safeParse({
      ...validInput,
      organizationId: 'org-xyz-789',
    })
    expect(result.success).toBeTruthy()
  })

  // -- Missing required fields -----------------------------------------------

  it('rejects missing planId', () => {
    const { planId, ...rest } = validInput
    const result = checkoutSessionSchema.safeParse(rest)
    expect(result.success).toBeFalsy()
  })

  it('rejects missing successUrl', () => {
    const { successUrl, ...rest } = validInput
    const result = checkoutSessionSchema.safeParse(rest)
    expect(result.success).toBeFalsy()
  })

  it('rejects missing cancelUrl', () => {
    const { cancelUrl, ...rest } = validInput
    const result = checkoutSessionSchema.safeParse(rest)
    expect(result.success).toBeFalsy()
  })

  // -- Invalid types --------------------------------------------------------

  it('rejects planId that is not a string', () => {
    const result = checkoutSessionSchema.safeParse({ ...validInput, planId: 123 })
    expect(result.success).toBeFalsy()
  })

  it('rejects successUrl that is not a string', () => {
    const result = checkoutSessionSchema.safeParse({ ...validInput, successUrl: true })
    expect(result.success).toBeFalsy()
  })

  it('rejects cancelUrl that is not a string', () => {
    const result = checkoutSessionSchema.safeParse({ ...validInput, cancelUrl: {} })
    expect(result.success).toBeFalsy()
  })

  // -- Boundary values ------------------------------------------------------

  it('rejects empty planId', () => {
    const result = checkoutSessionSchema.safeParse({ ...validInput, planId: '' })
    expect(result.success).toBeFalsy()
  })

  it('rejects empty successUrl', () => {
    const result = checkoutSessionSchema.safeParse({ ...validInput, successUrl: '' })
    expect(result.success).toBeFalsy()
  })

  it('rejects empty cancelUrl', () => {
    const result = checkoutSessionSchema.safeParse({ ...validInput, cancelUrl: '' })
    expect(result.success).toBeFalsy()
  })

  it('rejects whitespace-only planId', () => {
    const result = checkoutSessionSchema.safeParse({ ...validInput, planId: '   ' })
    expect(result.success).toBeFalsy()
  })

  it('rejects whitespace-only successUrl', () => {
    const result = checkoutSessionSchema.safeParse({ ...validInput, successUrl: '   ' })
    expect(result.success).toBeFalsy()
  })

  it('rejects whitespace-only cancelUrl', () => {
    const result = checkoutSessionSchema.safeParse({ ...validInput, cancelUrl: '   ' })
    expect(result.success).toBeFalsy()
  })

  // -- Trimming --------------------------------------------------------------

  it('trims whitespace from string fields', () => {
    const data = checkoutSessionSchema.parse({
      cancelUrl: '  https://example.com/cancel  ',
      planId: '  plan-abc-123  ',
      successUrl: '  https://example.com/success  ',
    })
    expect(data.planId).toBe('plan-abc-123')
    expect(data.successUrl).toBe('https://example.com/success')
    expect(data.cancelUrl).toBe('https://example.com/cancel')
  })
})

// ---------------------------------------------------------------------------
// changePlanSchema
// ---------------------------------------------------------------------------
describe('changePlanSchema', () => {
  const validInput = {
    newPlanId: 'plan-upgraded-456',
  }

  // -- Valid inputs ---------------------------------------------------------

  it('validates minimal required input', () => {
    const result = changePlanSchema.safeParse(validInput)
    expect(result.success).toBeTruthy()
  })

  it('validates input with optional organizationId', () => {
    const result = changePlanSchema.safeParse({
      ...validInput,
      organizationId: 'org-xyz-789',
    })
    expect(result.success).toBeTruthy()
  })

  // -- Missing required fields -----------------------------------------------

  it('rejects missing newPlanId', () => {
    const result = changePlanSchema.safeParse({})
    expect(result.success).toBeFalsy()
  })

  // -- Invalid types --------------------------------------------------------

  it('rejects newPlanId that is not a string', () => {
    const result = changePlanSchema.safeParse({ newPlanId: 42 })
    expect(result.success).toBeFalsy()
  })

  it('rejects organizationId that is not a string', () => {
    const result = changePlanSchema.safeParse({
      ...validInput,
      organizationId: 42,
    })
    expect(result.success).toBeFalsy()
  })

  // -- Boundary values ------------------------------------------------------

  it('rejects empty newPlanId', () => {
    const result = changePlanSchema.safeParse({ newPlanId: '' })
    expect(result.success).toBeFalsy()
  })

  it('rejects whitespace-only newPlanId', () => {
    const result = changePlanSchema.safeParse({ newPlanId: '   ' })
    expect(result.success).toBeFalsy()
  })

  it('rejects empty organizationId', () => {
    const result = changePlanSchema.safeParse({
      ...validInput,
      organizationId: '',
    })
    expect(result.success).toBeFalsy()
  })

  // -- Trimming --------------------------------------------------------------

  it('trims whitespace from newPlanId', () => {
    const data = changePlanSchema.parse({ newPlanId: '  plan-id  ' })
    expect(data.newPlanId).toBe('plan-id')
  })
})

// ---------------------------------------------------------------------------
// recordUsageSchema
// ---------------------------------------------------------------------------
describe('recordUsageSchema', () => {
  const validInput = {
    metricType: 'api_calls',
    quantity: 100,
  }

  // -- Valid inputs ---------------------------------------------------------

  it('validates valid input for each metric type', () => {
    for (const type of ['api_calls', 'requests', 'seats', 'storage'] as const) {
      const result = recordUsageSchema.safeParse({ metricType: type, quantity: 1 })
      expect(result.success).toBeTruthy()
    }
  })

  it('accepts quantity of 1 (minimum)', () => {
    const result = recordUsageSchema.safeParse({ ...validInput, quantity: 1 })
    expect(result.success).toBeTruthy()
  })

  it('accepts large quantity values', () => {
    const result = recordUsageSchema.safeParse({
      ...validInput,
      quantity: 999_999_999,
    })
    expect(result.success).toBeTruthy()
  })

  // -- Missing required fields -----------------------------------------------

  it('rejects missing metricType', () => {
    const { metricType, ...rest } = validInput
    const result = recordUsageSchema.safeParse(rest)
    expect(result.success).toBeFalsy()
  })

  it('rejects missing quantity', () => {
    const { quantity, ...rest } = validInput
    const result = recordUsageSchema.safeParse(rest)
    expect(result.success).toBeFalsy()
  })

  // -- Invalid types --------------------------------------------------------

  it('rejects metricType not in the enum', () => {
    const result = recordUsageSchema.safeParse({ ...validInput, metricType: 'bandwidth' })
    expect(result.success).toBeFalsy()
  })

  it('rejects metricType that is not a string', () => {
    const result = recordUsageSchema.safeParse({ ...validInput, metricType: 123 })
    expect(result.success).toBeFalsy()
  })

  it('rejects quantity that is a string', () => {
    const result = recordUsageSchema.safeParse({ ...validInput, quantity: '100' })
    expect(result.success).toBeFalsy()
  })

  it('rejects quantity that is a boolean', () => {
    const result = recordUsageSchema.safeParse({ ...validInput, quantity: true })
    expect(result.success).toBeFalsy()
  })

  // -- Boundary values ------------------------------------------------------

  it('rejects quantity of 0 (below minimum)', () => {
    const result = recordUsageSchema.safeParse({ ...validInput, quantity: 0 })
    expect(result.success).toBeFalsy()
  })

  it('rejects negative quantity', () => {
    const result = recordUsageSchema.safeParse({ ...validInput, quantity: -1 })
    expect(result.success).toBeFalsy()
  })

  it('rejects float quantity', () => {
    const result = recordUsageSchema.safeParse({ ...validInput, quantity: 10.5 })
    expect(result.success).toBeFalsy()
  })

  it('rejects empty object', () => {
    const result = recordUsageSchema.safeParse({})
    expect(result.success).toBeFalsy()
  })
})
