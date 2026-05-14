import {
  assignVariantSchema,
  createExperimentSchema,
  EXPERIMENT_STATUSES,
  listExperimentsSchema,
  recordEventSchema,
  updateExperimentSchema,
} from '$lib/validators/ab-testing'
import { describe, expect, it } from 'vitest'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const validVariant = (overrides = {}) => ({
  isControl: false,
  name: 'Variant A',
  payload: {},
  trafficPercentage: 50,
  ...overrides,
})

const validCreateInput = (overrides = {}) => ({
  key: 'cta-button-color',
  name: 'CTA Button Color Test',
  targetMetric: 'click-through-rate',
  variants: [validVariant({ isControl: true }), validVariant({ name: 'Variant B' })],
  ...overrides,
})

const assertFails = (result: { success: boolean }) => {
  expect(result.success).toBeFalsy()
}

const assertPasses = (result: { success: boolean }) => {
  expect(result.success).toBeTruthy()
}

// ---------------------------------------------------------------------------
// createExperimentSchema
// ---------------------------------------------------------------------------

describe('createExperimentSchema', () => {
  // -- Valid inputs ----------------------------------------------------------

  it('accepts a valid experiment with two variants', () => {
    const result = createExperimentSchema.safeParse(validCreateInput())
    assertPasses(result)
  })

  it('accepts a valid experiment with description', () => {
    const result = createExperimentSchema.safeParse(
      validCreateInput({ description: 'Testing different CTA button colors' })
    )
    assertPasses(result)
  })

  it('accepts the maximum of 10 variants', () => {
    const variants = Array.from({ length: 10 }, (_, i) =>
      validVariant({ name: `Variant ${String.fromCharCode(65 + i)}`, trafficPercentage: 10 })
    )
    const result = createExperimentSchema.safeParse(validCreateInput({ variants }))
    assertPasses(result)
  })

  it('accepts variant with all optional fields populated', () => {
    const variant = {
      description: 'The original control variant',
      isControl: true,
      name: 'Control',
      payload: { color: '#3b82f6', size: 'lg' },
      trafficPercentage: 50,
    }
    const result = createExperimentSchema.safeParse(
      validCreateInput({ variants: [variant, validVariant({ name: 'Treatment' })] })
    )
    assertPasses(result)
  })

  it('trims whitespace from key, name, targetMetric, and description', () => {
    const result = createExperimentSchema.safeParse({
      description: '  spaced description  ',
      key: '  my-key  ',
      name: '  My Experiment  ',
      targetMetric: '  clicks  ',
      variants: [validVariant(), validVariant({ name: 'B' })],
    })
    assertPasses(result)
    if (result.success) {
      expect(result.data.key).toBe('my-key')
      expect(result.data.name).toBe('My Experiment')
      expect(result.data.targetMetric).toBe('clicks')
      expect(result.data.description).toBe('spaced description')
    }
  })

  it('accepts variant payload with nested objects', () => {
    const variant = validVariant({
      payload: { theme: { primary: '#fff', secondary: '#000' }, flags: [true, false] },
    })
    const result = createExperimentSchema.safeParse(
      validCreateInput({ variants: [variant, validVariant({ name: 'B' })] })
    )
    assertPasses(result)
  })

  // -- Missing required fields -----------------------------------------------

  it('rejects missing key', () => {
    const result = createExperimentSchema.safeParse({ ...validCreateInput(), key: undefined })
    assertFails(result)
  })

  it('rejects missing name', () => {
    const result = createExperimentSchema.safeParse({ ...validCreateInput(), name: undefined })
    assertFails(result)
  })

  it('rejects missing targetMetric', () => {
    const result = createExperimentSchema.safeParse({
      ...validCreateInput(),
      targetMetric: undefined,
    })
    assertFails(result)
  })

  it('rejects missing variants', () => {
    const result = createExperimentSchema.safeParse({ ...validCreateInput(), variants: undefined })
    assertFails(result)
  })

  // -- Boundary: key ---------------------------------------------------------

  it('accepts key at minimum length (1 char)', () => {
    const result = createExperimentSchema.safeParse(validCreateInput({ key: 'k' }))
    assertPasses(result)
  })

  it('accepts key at maximum length (100 chars)', () => {
    const result = createExperimentSchema.safeParse(validCreateInput({ key: 'a'.repeat(100) }))
    assertPasses(result)
  })

  it('rejects empty key after trim', () => {
    const result = createExperimentSchema.safeParse(validCreateInput({ key: '   ' }))
    assertFails(result)
  })

  it('rejects key exceeding 100 chars', () => {
    const result = createExperimentSchema.safeParse(validCreateInput({ key: 'a'.repeat(101) }))
    assertFails(result)
  })

  // -- Boundary: name --------------------------------------------------------

  it('accepts name at minimum length (1 char)', () => {
    const result = createExperimentSchema.safeParse(validCreateInput({ name: 'N' }))
    assertPasses(result)
  })

  it('accepts name at maximum length (200 chars)', () => {
    const result = createExperimentSchema.safeParse(validCreateInput({ name: 'n'.repeat(200) }))
    assertPasses(result)
  })

  it('rejects empty name after trim', () => {
    const result = createExperimentSchema.safeParse(validCreateInput({ name: '   ' }))
    assertFails(result)
  })

  it('rejects name exceeding 200 chars', () => {
    const result = createExperimentSchema.safeParse(validCreateInput({ name: 'n'.repeat(201) }))
    assertFails(result)
  })

  // -- Boundary: targetMetric ------------------------------------------------

  it('accepts targetMetric at minimum length (1 char)', () => {
    const result = createExperimentSchema.safeParse(validCreateInput({ targetMetric: 'm' }))
    assertPasses(result)
  })

  it('accepts targetMetric at maximum length (200 chars)', () => {
    const result = createExperimentSchema.safeParse(
      validCreateInput({ targetMetric: 'm'.repeat(200) })
    )
    assertPasses(result)
  })

  it('rejects empty targetMetric after trim', () => {
    const result = createExperimentSchema.safeParse(validCreateInput({ targetMetric: '   ' }))
    assertFails(result)
  })

  it('rejects targetMetric exceeding 200 chars', () => {
    const result = createExperimentSchema.safeParse(
      validCreateInput({ targetMetric: 'm'.repeat(201) })
    )
    assertFails(result)
  })

  // -- Boundary: description -------------------------------------------------

  it('accepts description at minimum length (1 char)', () => {
    const result = createExperimentSchema.safeParse(validCreateInput({ description: 'd' }))
    assertPasses(result)
  })

  it('accepts description at maximum length (1000 chars)', () => {
    const result = createExperimentSchema.safeParse(
      validCreateInput({ description: 'd'.repeat(1000) })
    )
    assertPasses(result)
  })

  it('rejects description exceeding 1000 chars', () => {
    const result = createExperimentSchema.safeParse(
      validCreateInput({ description: 'd'.repeat(1001) })
    )
    assertFails(result)
  })

  // -- Boundary: variants array length ---------------------------------------

  it('rejects fewer than 2 variants', () => {
    const result = createExperimentSchema.safeParse(
      validCreateInput({ variants: [validVariant()] })
    )
    assertFails(result)
  })

  it('rejects more than 10 variants', () => {
    const variants = Array.from({ length: 11 }, (_, i) =>
      validVariant({ name: `Variant ${i}`, trafficPercentage: 10 })
    )
    const result = createExperimentSchema.safeParse(validCreateInput({ variants }))
    assertFails(result)
  })

  it('rejects empty variants array', () => {
    const result = createExperimentSchema.safeParse(validCreateInput({ variants: [] }))
    assertFails(result)
  })

  // -- Variant field validation ----------------------------------------------

  it('rejects variant with empty name', () => {
    const result = createExperimentSchema.safeParse(
      validCreateInput({ variants: [validVariant({ name: '' }), validVariant({ name: 'B' })] })
    )
    assertFails(result)
  })

  it('rejects variant with whitespace-only name', () => {
    const result = createExperimentSchema.safeParse(
      validCreateInput({
        variants: [validVariant({ name: '   ' }), validVariant({ name: 'B' })],
      })
    )
    assertFails(result)
  })

  it('rejects variant name exceeding 100 chars', () => {
    const result = createExperimentSchema.safeParse(
      validCreateInput({
        variants: [validVariant({ name: 'x'.repeat(101) }), validVariant({ name: 'B' })],
      })
    )
    assertFails(result)
  })

  it('accepts variant with minimum trafficPercentage (1)', () => {
    const result = createExperimentSchema.safeParse(
      validCreateInput({
        variants: [
          validVariant({ trafficPercentage: 1 }),
          validVariant({ name: 'B', trafficPercentage: 99 }),
        ],
      })
    )
    assertPasses(result)
  })

  it('accepts variant with maximum trafficPercentage (100)', () => {
    const result = createExperimentSchema.safeParse(
      validCreateInput({
        variants: [validVariant({ trafficPercentage: 100 }), validVariant({ name: 'B' })],
      })
    )
    assertPasses(result)
  })

  it('rejects variant with trafficPercentage of 0', () => {
    const result = createExperimentSchema.safeParse(
      validCreateInput({
        variants: [
          validVariant({ trafficPercentage: 0 }),
          validVariant({ name: 'B', trafficPercentage: 100 }),
        ],
      })
    )
    assertFails(result)
  })

  it('rejects variant with trafficPercentage above 100', () => {
    const result = createExperimentSchema.safeParse(
      validCreateInput({
        variants: [
          validVariant({ trafficPercentage: 101 }),
          validVariant({ name: 'B', trafficPercentage: 1 }),
        ],
      })
    )
    assertFails(result)
  })

  it('rejects non-integer trafficPercentage', () => {
    const result = createExperimentSchema.safeParse(
      validCreateInput({
        variants: [validVariant({ trafficPercentage: 50.5 }), validVariant({ name: 'B' })],
      })
    )
    assertFails(result)
  })

  it('rejects string trafficPercentage', () => {
    const result = createExperimentSchema.safeParse(
      validCreateInput({
        variants: [validVariant({ trafficPercentage: 'fifty' }), validVariant({ name: 'B' })],
      })
    )
    assertFails(result)
  })

  // -- Variant description boundary ------------------------------------------

  it('accepts variant description at maximum length (500 chars)', () => {
    const variant = validVariant({ description: 'd'.repeat(500) })
    const result = createExperimentSchema.safeParse(
      validCreateInput({ variants: [variant, validVariant({ name: 'B' })] })
    )
    assertPasses(result)
  })

  it('rejects variant description exceeding 500 chars', () => {
    const variant = validVariant({ description: 'd'.repeat(501) })
    const result = createExperimentSchema.safeParse(
      validCreateInput({ variants: [variant, validVariant({ name: 'B' })] })
    )
    assertFails(result)
  })

  // -- Variant isControl default ---------------------------------------------

  it('accepts variant without isControl (optional)', () => {
    const variant = { name: 'A', trafficPercentage: 50 }
    const result = createExperimentSchema.safeParse(
      validCreateInput({ variants: [variant, validVariant({ name: 'B' })] })
    )
    assertPasses(result)
  })

  // -- Variant payload -------------------------------------------------------

  it('accepts variant without payload (optional)', () => {
    const variant = { isControl: true, name: 'A', trafficPercentage: 50 }
    const result = createExperimentSchema.safeParse(
      validCreateInput({ variants: [variant, validVariant({ name: 'B' })] })
    )
    assertPasses(result)
  })

  it('accepts variant with empty payload object', () => {
    const variant = validVariant({ payload: {} })
    const result = createExperimentSchema.safeParse(
      validCreateInput({ variants: [variant, validVariant({ name: 'B' })] })
    )
    assertPasses(result)
  })

  // -- Type coercion ---------------------------------------------------------

  it('rejects non-string key', () => {
    const result = createExperimentSchema.safeParse({ ...validCreateInput(), key: 123 })
    assertFails(result)
  })

  it('rejects non-string name', () => {
    const result = createExperimentSchema.safeParse({ ...validCreateInput(), name: null })
    assertFails(result)
  })

  it('rejects variants that is not an array', () => {
    const result = createExperimentSchema.safeParse({ ...validCreateInput(), variants: 'bad' })
    assertFails(result)
  })
})

// ---------------------------------------------------------------------------
// updateExperimentSchema
// ---------------------------------------------------------------------------

describe('updateExperimentSchema', () => {
  it('accepts an empty object (all fields optional)', () => {
    const result = updateExperimentSchema.safeParse({})
    assertPasses(result)
  })

  // -- name ------------------------------------------------------------------

  it('accepts a valid name', () => {
    const result = updateExperimentSchema.safeParse({ name: 'Updated Name' })
    assertPasses(result)
  })

  it('rejects empty name after trim', () => {
    const result = updateExperimentSchema.safeParse({ name: '   ' })
    assertFails(result)
  })

  it('rejects name exceeding 200 chars', () => {
    const result = updateExperimentSchema.safeParse({ name: 'n'.repeat(201) })
    assertFails(result)
  })

  it('accepts name at maximum length (200 chars)', () => {
    const result = updateExperimentSchema.safeParse({ name: 'n'.repeat(200) })
    assertPasses(result)
  })

  // -- description -----------------------------------------------------------

  it('accepts a valid description', () => {
    const result = updateExperimentSchema.safeParse({ description: 'Some description' })
    assertPasses(result)
  })

  it('rejects empty description after trim', () => {
    const result = updateExperimentSchema.safeParse({ description: '   ' })
    assertFails(result)
  })

  it('rejects description exceeding 1000 chars', () => {
    const result = updateExperimentSchema.safeParse({ description: 'd'.repeat(1001) })
    assertFails(result)
  })

  it('accepts description at maximum length (1000 chars)', () => {
    const result = updateExperimentSchema.safeParse({ description: 'd'.repeat(1000) })
    assertPasses(result)
  })

  // -- status ----------------------------------------------------------------

  it('accepts every valid status value', () => {
    for (const status of EXPERIMENT_STATUSES) {
      const result = updateExperimentSchema.safeParse({ status })
      assertPasses(result)
    }
  })

  it('rejects invalid status string', () => {
    const result = updateExperimentSchema.safeParse({ status: 'invalid' })
    assertFails(result)
  })

  it('rejects numeric status', () => {
    const result = updateExperimentSchema.safeParse({ status: 42 })
    assertFails(result)
  })

  // -- startDate / endDate ---------------------------------------------------

  it('accepts valid ISO datetime strings', () => {
    const result = updateExperimentSchema.safeParse({
      endDate: '2026-06-01T00:00:00Z',
      startDate: '2026-05-01T00:00:00Z',
    })
    assertPasses(result)
  })

  it('accepts datetime with milliseconds', () => {
    const result = updateExperimentSchema.safeParse({
      startDate: '2026-05-01T09:00:00.000Z',
    })
    assertPasses(result)
  })

  it('rejects non-datetime startDate', () => {
    const result = updateExperimentSchema.safeParse({ startDate: 'not-a-date' })
    assertFails(result)
  })

  it('rejects non-datetime endDate', () => {
    const result = updateExperimentSchema.safeParse({ endDate: 'May 1st 2026' })
    assertFails(result)
  })

  it('rejects date-only string for startDate (no time component)', () => {
    const result = updateExperimentSchema.safeParse({ startDate: '2026-05-01' })
    assertFails(result)
  })

  it('rejects date-only string for endDate (no time component)', () => {
    const result = updateExperimentSchema.safeParse({ endDate: '2026-05-01' })
    assertFails(result)
  })

  // -- winningVariantId ------------------------------------------------------

  it('accepts null winningVariantId', () => {
    const result = updateExperimentSchema.safeParse({ winningVariantId: null })
    assertPasses(result)
  })

  it('accepts a string winningVariantId', () => {
    const result = updateExperimentSchema.safeParse({
      winningVariantId: '550e8400-e29b-41d4-a716-446655440000',
    })
    assertPasses(result)
  })

  it('rejects non-string non-null winningVariantId', () => {
    const result = updateExperimentSchema.safeParse({ winningVariantId: 123 })
    assertFails(result)
  })

  // -- Multiple fields together ----------------------------------------------

  it('accepts multiple fields set at once', () => {
    const result = updateExperimentSchema.safeParse({
      description: 'Updated description',
      endDate: '2026-07-01T00:00:00Z',
      name: 'Updated experiment name',
      startDate: '2026-05-01T00:00:00Z',
      status: 'running',
    })
    assertPasses(result)
  })

  it('strips unknown keys', () => {
    const result = updateExperimentSchema.safeParse({
      name: 'Test',
      unknownField: 'should be stripped',
    })
    assertPasses(result)
    if (result.success) {
      expect(result.data).not.toHaveProperty('unknownField')
    }
  })
})

// ---------------------------------------------------------------------------
// assignVariantSchema
// ---------------------------------------------------------------------------

describe('assignVariantSchema', () => {
  it('accepts an empty object (all fields optional)', () => {
    const result = assignVariantSchema.safeParse({})
    assertPasses(result)
  })

  it('accepts sessionId alone', () => {
    const result = assignVariantSchema.safeParse({ sessionId: 'sess-abc123' })
    assertPasses(result)
  })

  it('accepts userId alone', () => {
    const result = assignVariantSchema.safeParse({ userId: 'user-xyz' })
    assertPasses(result)
  })

  it('accepts both sessionId and userId', () => {
    const result = assignVariantSchema.safeParse({
      sessionId: 'sess-abc123',
      userId: 'user-xyz',
    })
    assertPasses(result)
  })

  it('trims whitespace from sessionId', () => {
    const result = assignVariantSchema.safeParse({ sessionId: '  sess-abc  ' })
    assertPasses(result)
    if (result.success) {
      expect(result.data.sessionId).toBe('sess-abc')
    }
  })

  it('trims whitespace from userId', () => {
    const result = assignVariantSchema.safeParse({ userId: '  user-xyz  ' })
    assertPasses(result)
    if (result.success) {
      expect(result.data.userId).toBe('user-xyz')
    }
  })

  it('rejects empty sessionId after trim', () => {
    const result = assignVariantSchema.safeParse({ sessionId: '   ' })
    assertFails(result)
  })

  it('rejects empty userId after trim', () => {
    const result = assignVariantSchema.safeParse({ userId: '   ' })
    assertFails(result)
  })

  it('rejects non-string sessionId', () => {
    const result = assignVariantSchema.safeParse({ sessionId: 123 })
    assertFails(result)
  })

  it('rejects non-string userId', () => {
    const result = assignVariantSchema.safeParse({ userId: null })
    assertFails(result)
  })
})

// ---------------------------------------------------------------------------
// recordEventSchema
// ---------------------------------------------------------------------------

describe('recordEventSchema', () => {
  const validEvent = (overrides = {}) => ({
    eventName: 'button_clicked',
    eventType: 'exposure',
    metadata: {},
    sessionId: 'sess-123',
    userId: 'user-456',
    ...overrides,
  })

  // -- Valid inputs ----------------------------------------------------------

  it('accepts a valid exposure event', () => {
    const result = recordEventSchema.safeParse(validEvent({ eventType: 'exposure' }))
    assertPasses(result)
  })

  it('accepts a valid conversion event', () => {
    const result = recordEventSchema.safeParse(validEvent({ eventType: 'conversion' }))
    assertPasses(result)
  })

  it('accepts a valid custom event', () => {
    const result = recordEventSchema.safeParse(validEvent({ eventType: 'custom' }))
    assertPasses(result)
  })

  it('accepts event with eventValue', () => {
    const result = recordEventSchema.safeParse(validEvent({ eventValue: 42.5 }))
    assertPasses(result)
  })

  it('accepts event with integer eventValue', () => {
    const result = recordEventSchema.safeParse(validEvent({ eventValue: 0 }))
    assertPasses(result)
  })

  it('accepts event with negative eventValue', () => {
    const result = recordEventSchema.safeParse(validEvent({ eventValue: -10 }))
    assertPasses(result)
  })

  it('accepts event with metadata containing various types', () => {
    const result = recordEventSchema.safeParse(
      validEvent({
        metadata: {
          count: 5,
          flags: { nested: true },
          items: ['a', 'b'],
          null_val: null,
        },
      })
    )
    assertPasses(result)
  })

  it('accepts event without optional metadata', () => {
    const result = recordEventSchema.safeParse({
      eventName: 'button_clicked',
      eventType: 'exposure',
      sessionId: 's1',
      userId: 'u1',
    })
    assertPasses(result)
  })

  it('accepts event without optional eventValue', () => {
    const result = recordEventSchema.safeParse({
      eventName: 'button_clicked',
      eventType: 'exposure',
      sessionId: 's1',
      userId: 'u1',
    })
    assertPasses(result)
  })

  it('accepts event without optional sessionId and userId', () => {
    const result = recordEventSchema.safeParse({
      eventName: 'page_view',
      eventType: 'custom',
    })
    assertPasses(result)
  })

  it('trims whitespace from eventName', () => {
    const result = recordEventSchema.safeParse(validEvent({ eventName: '  button_clicked  ' }))
    assertPasses(result)
    if (result.success) {
      expect(result.data.eventName).toBe('button_clicked')
    }
  })

  // -- Missing required fields -----------------------------------------------

  it('rejects missing eventName', () => {
    const result = recordEventSchema.safeParse({ ...validEvent(), eventName: undefined })
    assertFails(result)
  })

  it('rejects missing eventType', () => {
    const result = recordEventSchema.safeParse({ ...validEvent(), eventType: undefined })
    assertFails(result)
  })

  // -- eventName boundary ----------------------------------------------------

  it('accepts eventName at minimum length (1 char)', () => {
    const result = recordEventSchema.safeParse(validEvent({ eventName: 'e' }))
    assertPasses(result)
  })

  it('accepts eventName at maximum length (200 chars)', () => {
    const result = recordEventSchema.safeParse(validEvent({ eventName: 'e'.repeat(200) }))
    assertPasses(result)
  })

  it('rejects empty eventName after trim', () => {
    const result = recordEventSchema.safeParse(validEvent({ eventName: '   ' }))
    assertFails(result)
  })

  it('rejects eventName exceeding 200 chars', () => {
    const result = recordEventSchema.safeParse(validEvent({ eventName: 'e'.repeat(201) }))
    assertFails(result)
  })

  // -- eventType validation --------------------------------------------------

  it('rejects invalid eventType', () => {
    const result = recordEventSchema.safeParse(validEvent({ eventType: 'click' }))
    assertFails(result)
  })

  it('rejects empty string eventType', () => {
    const result = recordEventSchema.safeParse(validEvent({ eventType: '' }))
    assertFails(result)
  })

  it('rejects numeric eventType', () => {
    const result = recordEventSchema.safeParse({ ...validEvent(), eventType: 1 })
    assertFails(result)
  })

  // -- eventValue type check -------------------------------------------------

  it('rejects string eventValue', () => {
    const result = recordEventSchema.safeParse(validEvent({ eventValue: 'not-a-number' }))
    assertFails(result)
  })

  it('rejects NaN eventValue', () => {
    const result = recordEventSchema.safeParse(validEvent({ eventValue: NaN }))
    assertFails(result)
  })

  // -- metadata validation ---------------------------------------------------

  it('rejects non-object metadata', () => {
    const result = recordEventSchema.safeParse(validEvent({ metadata: 'string' }))
    assertFails(result)
  })

  it('rejects array metadata', () => {
    const result = recordEventSchema.safeParse(validEvent({ metadata: [1, 2, 3] }))
    assertFails(result)
  })

  it('rejects null metadata', () => {
    const result = recordEventSchema.safeParse(validEvent({ metadata: null }))
    assertFails(result)
  })

  // -- sessionId / userId type checks ----------------------------------------

  it('rejects non-string sessionId', () => {
    const result = recordEventSchema.safeParse(validEvent({ sessionId: 123 }))
    assertFails(result)
  })

  it('rejects non-string userId', () => {
    const result = recordEventSchema.safeParse(validEvent({ userId: true }))
    assertFails(result)
  })
})

// ---------------------------------------------------------------------------
// listExperimentsSchema
// ---------------------------------------------------------------------------

describe('listExperimentsSchema', () => {
  it('accepts an empty object (no filter)', () => {
    const result = listExperimentsSchema.safeParse({})
    assertPasses(result)
  })

  it('accepts every valid status as filter', () => {
    for (const status of EXPERIMENT_STATUSES) {
      const result = listExperimentsSchema.safeParse({ status })
      assertPasses(result)
    }
  })

  it('rejects invalid status string', () => {
    const result = listExperimentsSchema.safeParse({ status: 'active' })
    assertFails(result)
  })

  it('rejects numeric status', () => {
    const result = listExperimentsSchema.safeParse({ status: 1 })
    assertFails(result)
  })

  it('rejects null status', () => {
    const result = listExperimentsSchema.safeParse({ status: null })
    assertFails(result)
  })

  it('strips unknown keys', () => {
    const result = listExperimentsSchema.safeParse({
      status: 'draft',
      page: 1,
    })
    assertPasses(result)
    if (result.success) {
      expect(result.data).not.toHaveProperty('page')
    }
  })
})

// ---------------------------------------------------------------------------
// EXPERIMENT_STATUSES constant
// ---------------------------------------------------------------------------

describe('EXPERIMENT_STATUSES', () => {
  it('contains exactly 5 statuses', () => {
    expect(EXPERIMENT_STATUSES).toHaveLength(5)
  })

  it('contains the expected status values', () => {
    expect(EXPERIMENT_STATUSES).toContain('draft')
    expect(EXPERIMENT_STATUSES).toContain('running')
    expect(EXPERIMENT_STATUSES).toContain('paused')
    expect(EXPERIMENT_STATUSES).toContain('completed')
    expect(EXPERIMENT_STATUSES).toContain('archived')
  })

  it('is a readonly tuple', () => {
    expect(EXPERIMENT_STATUSES).toEqual([
      'draft',
      'running',
      'paused',
      'completed',
      'archived',
    ] as const)
  })
})
