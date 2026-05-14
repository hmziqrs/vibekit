import { recordReadingSchema, recordViewSchema } from '$lib/validators/analytics'
import { describe, expect, it } from 'vitest'

// ---------------------------------------------------------------------------
// recordViewSchema
// ---------------------------------------------------------------------------
describe('recordViewSchema', () => {
  const validInput = {
    postId: '01912345-6789-7abc-def0-123456789abc',
  }

  // -- Valid inputs ---------------------------------------------------------

  it('validates minimal required input', () => {
    const result = recordViewSchema.safeParse(validInput)
    expect(result.success).toBeTruthy()
  })

  it('validates input with optional referrer', () => {
    const result = recordViewSchema.safeParse({
      ...validInput,
      referrer: 'https://example.com/blog',
    })
    expect(result.success).toBeTruthy()
  })

  it('accepts a simple string postId', () => {
    const result = recordViewSchema.safeParse({ postId: 'my-post-id' })
    expect(result.success).toBeTruthy()
  })

  it('accepts a single-character postId (min length 1)', () => {
    const result = recordViewSchema.safeParse({ postId: 'a' })
    expect(result.success).toBeTruthy()
  })

  // -- Missing required fields -----------------------------------------------

  it('rejects missing postId', () => {
    const result = recordViewSchema.safeParse({})
    expect(result.success).toBeFalsy()
  })

  it('rejects null instead of postId', () => {
    const result = recordViewSchema.safeParse({ postId: null })
    expect(result.success).toBeFalsy()
  })

  it('rejects undefined instead of postId', () => {
    const result = recordViewSchema.safeParse({ postId: undefined })
    expect(result.success).toBeFalsy()
  })

  // -- Invalid types --------------------------------------------------------

  it('rejects postId that is a number', () => {
    const result = recordViewSchema.safeParse({ postId: 123 })
    expect(result.success).toBeFalsy()
  })

  it('rejects postId that is a boolean', () => {
    const result = recordViewSchema.safeParse({ postId: true })
    expect(result.success).toBeFalsy()
  })

  it('rejects postId that is an object', () => {
    const result = recordViewSchema.safeParse({ postId: { id: 'abc' } })
    expect(result.success).toBeFalsy()
  })

  it('rejects postId that is an array', () => {
    const result = recordViewSchema.safeParse({ postId: ['abc'] })
    expect(result.success).toBeFalsy()
  })

  it('rejects referrer that is a number', () => {
    const result = recordViewSchema.safeParse({ ...validInput, referrer: 42 })
    expect(result.success).toBeFalsy()
  })

  it('rejects referrer that is a boolean', () => {
    const result = recordViewSchema.safeParse({ ...validInput, referrer: true })
    expect(result.success).toBeFalsy()
  })

  // -- Boundary values ------------------------------------------------------

  it('rejects empty postId', () => {
    const result = recordViewSchema.safeParse({ postId: '' })
    expect(result.success).toBeFalsy()
  })

  it('accepts whitespace-only postId (no trim on postId)', () => {
    const result = recordViewSchema.safeParse({ postId: '   ' })
    expect(result.success).toBeTruthy()
    if (result.success) {
      expect(result.data.postId).toBe('   ')
    }
  })

  it('accepts referrer at exactly max length (500)', () => {
    const result = recordViewSchema.safeParse({
      ...validInput,
      referrer: 'a'.repeat(500),
    })
    expect(result.success).toBeTruthy()
  })

  it('rejects referrer exceeding max length (501)', () => {
    const result = recordViewSchema.safeParse({
      ...validInput,
      referrer: 'a'.repeat(501),
    })
    expect(result.success).toBeFalsy()
  })

  // -- Optional fields ------------------------------------------------------

  it('omits referrer when not provided', () => {
    const data = recordViewSchema.parse(validInput)
    expect(data).not.toHaveProperty('referrer')
  })

  it('accepts undefined as referrer value', () => {
    const result = recordViewSchema.safeParse({ ...validInput, referrer: undefined })
    expect(result.success).toBeTruthy()
  })

  it('strips unknown keys from input', () => {
    const data = recordViewSchema.parse({ ...validInput, extra: 'field' })
    expect(data).not.toHaveProperty('extra')
  })

  // -- Trimming --------------------------------------------------------------

  it('trims whitespace from referrer', () => {
    const data = recordViewSchema.parse({
      ...validInput,
      referrer: '  https://example.com/blog  ',
    })
    expect(data.referrer).toBe('https://example.com/blog')
  })

  it('does not trim whitespace from postId (no trim on postId)', () => {
    const data = recordViewSchema.parse({
      postId: '  my-post-id  ',
    })
    expect(data.postId).toBe('  my-post-id  ')
  })

  it('trims referrer with only whitespace to empty string', () => {
    const result = recordViewSchema.safeParse({
      ...validInput,
      referrer: '   ',
    })
    // Trimmed whitespace becomes empty string, which is still valid (optional string)
    expect(result.success).toBeTruthy()
    if (result.success) {
      expect(result.data.referrer).toBe('')
    }
  })
})

// ---------------------------------------------------------------------------
// recordReadingSchema
// ---------------------------------------------------------------------------
describe('recordReadingSchema', () => {
  const validInput = {
    postId: '01912345-6789-7abc-def0-123456789abc',
    progress: 50,
    readTime: 120,
  }

  // -- Valid inputs ---------------------------------------------------------

  it('validates valid input', () => {
    const result = recordReadingSchema.safeParse(validInput)
    expect(result.success).toBeTruthy()
  })

  it('accepts progress at minimum boundary (0)', () => {
    const result = recordReadingSchema.safeParse({ ...validInput, progress: 0 })
    expect(result.success).toBeTruthy()
  })

  it('accepts progress at maximum boundary (100)', () => {
    const result = recordReadingSchema.safeParse({ ...validInput, progress: 100 })
    expect(result.success).toBeTruthy()
  })

  it('accepts readTime at minimum boundary (0)', () => {
    const result = recordReadingSchema.safeParse({ ...validInput, readTime: 0 })
    expect(result.success).toBeTruthy()
  })

  it('accepts large readTime values', () => {
    const result = recordReadingSchema.safeParse({
      ...validInput,
      readTime: 999_999,
    })
    expect(result.success).toBeTruthy()
  })

  it('accepts a simple string postId', () => {
    const result = recordReadingSchema.safeParse({ ...validInput, postId: 'my-post' })
    expect(result.success).toBeTruthy()
  })

  it('accepts a single-character postId (min length 1)', () => {
    const result = recordReadingSchema.safeParse({ ...validInput, postId: 'a' })
    expect(result.success).toBeTruthy()
  })

  // -- Missing required fields -----------------------------------------------

  it('rejects missing postId', () => {
    const { postId, ...rest } = validInput
    const result = recordReadingSchema.safeParse(rest)
    expect(result.success).toBeFalsy()
  })

  it('rejects missing progress', () => {
    const { progress, ...rest } = validInput
    const result = recordReadingSchema.safeParse(rest)
    expect(result.success).toBeFalsy()
  })

  it('rejects missing readTime', () => {
    const { readTime, ...rest } = validInput
    const result = recordReadingSchema.safeParse(rest)
    expect(result.success).toBeFalsy()
  })

  it('rejects empty object', () => {
    const result = recordReadingSchema.safeParse({})
    expect(result.success).toBeFalsy()
  })

  it('rejects null instead of postId', () => {
    const result = recordReadingSchema.safeParse({ ...validInput, postId: null })
    expect(result.success).toBeFalsy()
  })

  it('rejects null instead of progress', () => {
    const result = recordReadingSchema.safeParse({ ...validInput, progress: null })
    expect(result.success).toBeFalsy()
  })

  it('rejects null instead of readTime', () => {
    const result = recordReadingSchema.safeParse({ ...validInput, readTime: null })
    expect(result.success).toBeFalsy()
  })

  // -- Invalid types --------------------------------------------------------

  it('rejects postId that is a number', () => {
    const result = recordReadingSchema.safeParse({ ...validInput, postId: 123 })
    expect(result.success).toBeFalsy()
  })

  it('rejects postId that is a boolean', () => {
    const result = recordReadingSchema.safeParse({ ...validInput, postId: true })
    expect(result.success).toBeFalsy()
  })

  it('rejects progress that is a string', () => {
    const result = recordReadingSchema.safeParse({ ...validInput, progress: '50' })
    expect(result.success).toBeFalsy()
  })

  it('rejects progress that is a boolean', () => {
    const result = recordReadingSchema.safeParse({ ...validInput, progress: true })
    expect(result.success).toBeFalsy()
  })

  it('rejects readTime that is a string', () => {
    const result = recordReadingSchema.safeParse({ ...validInput, readTime: '120' })
    expect(result.success).toBeFalsy()
  })

  it('rejects readTime that is a boolean', () => {
    const result = recordReadingSchema.safeParse({ ...validInput, readTime: false })
    expect(result.success).toBeFalsy()
  })

  it('rejects progress that is NaN', () => {
    const result = recordReadingSchema.safeParse({ ...validInput, progress: NaN })
    expect(result.success).toBeFalsy()
  })

  it('rejects readTime that is NaN', () => {
    const result = recordReadingSchema.safeParse({ ...validInput, readTime: NaN })
    expect(result.success).toBeFalsy()
  })

  // -- Boundary values ------------------------------------------------------

  it('rejects empty postId', () => {
    const result = recordReadingSchema.safeParse({ ...validInput, postId: '' })
    expect(result.success).toBeFalsy()
  })

  it('accepts whitespace-only postId (no trim on postId)', () => {
    const result = recordReadingSchema.safeParse({ ...validInput, postId: '   ' })
    expect(result.success).toBeTruthy()
    if (result.success) {
      expect(result.data.postId).toBe('   ')
    }
  })

  it('rejects progress below minimum (-1)', () => {
    const result = recordReadingSchema.safeParse({ ...validInput, progress: -1 })
    expect(result.success).toBeFalsy()
  })

  it('rejects progress above maximum (101)', () => {
    const result = recordReadingSchema.safeParse({ ...validInput, progress: 101 })
    expect(result.success).toBeFalsy()
  })

  it('rejects large progress value (1000)', () => {
    const result = recordReadingSchema.safeParse({ ...validInput, progress: 1000 })
    expect(result.success).toBeFalsy()
  })

  it('rejects negative readTime', () => {
    const result = recordReadingSchema.safeParse({ ...validInput, readTime: -1 })
    expect(result.success).toBeFalsy()
  })

  it('rejects float progress', () => {
    const result = recordReadingSchema.safeParse({ ...validInput, progress: 50.5 })
    expect(result.success).toBeFalsy()
  })

  it('rejects float readTime', () => {
    const result = recordReadingSchema.safeParse({ ...validInput, readTime: 120.7 })
    expect(result.success).toBeFalsy()
  })

  it('rejects Infinity as progress', () => {
    const result = recordReadingSchema.safeParse({ ...validInput, progress: Infinity })
    expect(result.success).toBeFalsy()
  })

  it('rejects Infinity as readTime', () => {
    const result = recordReadingSchema.safeParse({ ...validInput, readTime: Infinity })
    expect(result.success).toBeFalsy()
  })

  // -- Extra keys ------------------------------------------------------------

  it('strips unknown keys from input', () => {
    const data = recordReadingSchema.parse({ ...validInput, extra: 'field' })
    expect(data).not.toHaveProperty('extra')
  })
})
