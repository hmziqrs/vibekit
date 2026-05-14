import { subscribeSchema, unsubscribeSchema } from '$lib/validators/newsletter'
import { describe, expect, it } from 'vitest'

// ---------------------------------------------------------------------------
// subscribeSchema
// ---------------------------------------------------------------------------
describe('subscribeSchema', () => {
  const validInput = {
    email: 'user@example.com',
  }

  // -- Valid inputs ----------------------------------------------------------

  it('validates minimal input with only email', () => {
    const result = subscribeSchema.safeParse(validInput)
    expect(result.success).toBeTruthy()
  })

  it('applies default value "blog" to source when omitted', () => {
    const result = subscribeSchema.safeParse(validInput)
    expect(result.success).toBeTruthy()
    if (result.success) {
      expect(result.data.source).toBe('blog')
    }
  })

  it('validates full input with name and source', () => {
    const result = subscribeSchema.safeParse({
      email: 'test@example.com',
      name: 'Jane Doe',
      source: 'footer',
    })
    expect(result.success).toBeTruthy()
    if (result.success) {
      expect(result.data.name).toBe('Jane Doe')
      expect(result.data.source).toBe('footer')
    }
  })

  it('accepts "post" as a valid source', () => {
    const result = subscribeSchema.safeParse({
      email: 'user@example.com',
      source: 'post',
    })
    expect(result.success).toBeTruthy()
    if (result.success) {
      expect(result.data.source).toBe('post')
    }
  })

  it('accepts "footer" as a valid source', () => {
    const result = subscribeSchema.safeParse({
      email: 'user@example.com',
      source: 'footer',
    })
    expect(result.success).toBeTruthy()
    if (result.success) {
      expect(result.data.source).toBe('footer')
    }
  })

  it('accepts "blog" explicitly as a valid source', () => {
    const result = subscribeSchema.safeParse({
      email: 'user@example.com',
      source: 'blog',
    })
    expect(result.success).toBeTruthy()
    if (result.success) {
      expect(result.data.source).toBe('blog')
    }
  })

  it('accepts name with exactly 200 characters', () => {
    const result = subscribeSchema.safeParse({
      email: 'user@example.com',
      name: 'a'.repeat(200),
    })
    expect(result.success).toBeTruthy()
  })

  it('trims whitespace from name', () => {
    const result = subscribeSchema.safeParse({
      email: 'user@example.com',
      name: '  Jane Doe  ',
    })
    expect(result.success).toBeTruthy()
    if (result.success) {
      expect(result.data.name).toBe('Jane Doe')
    }
  })

  it('accepts empty string name', () => {
    const result = subscribeSchema.safeParse({
      email: 'user@example.com',
      name: '',
    })
    expect(result.success).toBeTruthy()
  })

  it('strips all whitespace from a whitespace-only name', () => {
    const result = subscribeSchema.safeParse({
      email: 'user@example.com',
      name: '   ',
    })
    expect(result.success).toBeTruthy()
    if (result.success) {
      expect(result.data.name).toBe('')
    }
  })

  // -- Invalid inputs --------------------------------------------------------

  it('rejects missing email', () => {
    const result = subscribeSchema.safeParse({})
    expect(result.success).toBeFalsy()
  })

  it('rejects empty email', () => {
    const result = subscribeSchema.safeParse({ email: '' })
    expect(result.success).toBeFalsy()
  })

  it('rejects invalid email format', () => {
    const result = subscribeSchema.safeParse({ email: 'not-an-email' })
    expect(result.success).toBeFalsy()
  })

  it('rejects email without @ sign', () => {
    const result = subscribeSchema.safeParse({ email: 'userexample.com' })
    expect(result.success).toBeFalsy()
  })

  it('rejects email without domain', () => {
    const result = subscribeSchema.safeParse({ email: 'user@' })
    expect(result.success).toBeFalsy()
  })

  it('rejects email with only spaces', () => {
    const result = subscribeSchema.safeParse({ email: '   ' })
    expect(result.success).toBeFalsy()
  })

  it('rejects email with custom error message for invalid format', () => {
    const result = subscribeSchema.safeParse({ email: 'bad' })
    expect(result.success).toBeFalsy()
    if (!result.success) {
      const message = result.error.issues[0].message
      expect(message).toBe('Please enter a valid email address')
    }
  })

  it('rejects name exceeding 200 characters', () => {
    const result = subscribeSchema.safeParse({
      email: 'user@example.com',
      name: 'a'.repeat(201),
    })
    expect(result.success).toBeFalsy()
  })

  it('rejects invalid source value', () => {
    const result = subscribeSchema.safeParse({
      email: 'user@example.com',
      source: 'sidebar',
    })
    expect(result.success).toBeFalsy()
  })

  it('rejects numeric source value', () => {
    const result = subscribeSchema.safeParse({
      email: 'user@example.com',
      source: 123,
    })
    expect(result.success).toBeFalsy()
  })

  it('rejects null source value', () => {
    const result = subscribeSchema.safeParse({
      email: 'user@example.com',
      source: null,
    })
    expect(result.success).toBeFalsy()
  })

  it('rejects undefined email explicitly passed as undefined', () => {
    const result = subscribeSchema.safeParse({ email: undefined })
    expect(result.success).toBeFalsy()
  })

  it('rejects non-string email', () => {
    const result = subscribeSchema.safeParse({ email: 42 })
    expect(result.success).toBeFalsy()
  })

  // -- Edge cases ------------------------------------------------------------

  it('accepts email with subdomain', () => {
    const result = subscribeSchema.safeParse({ email: 'user@mail.example.com' })
    expect(result.success).toBeTruthy()
  })

  it('accepts email with plus addressing', () => {
    const result = subscribeSchema.safeParse({ email: 'user+tag@example.com' })
    expect(result.success).toBeTruthy()
  })

  it('accepts name with unicode characters', () => {
    const result = subscribeSchema.safeParse({
      email: 'user@example.com',
      name: 'François Müller',
    })
    expect(result.success).toBeTruthy()
  })

  it('strips leading and trailing newlines from name', () => {
    const result = subscribeSchema.safeParse({
      email: 'user@example.com',
      name: '\nJane Doe\n',
    })
    expect(result.success).toBeTruthy()
    if (result.success) {
      expect(result.data.name).toBe('Jane Doe')
    }
  })
})

describe('unsubscribeSchema', () => {
  it('accepts token string', () => {
    const result = unsubscribeSchema.safeParse({ token: 'abc123' })
    expect(result.success).toBe(true)
  })

  it('accepts empty object (token optional)', () => {
    const result = unsubscribeSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('accepts undefined token', () => {
    const result = unsubscribeSchema.safeParse({ token: undefined })
    expect(result.success).toBe(true)
  })

  it('rejects non-string token', () => {
    const result = unsubscribeSchema.safeParse({ token: 123 })
    expect(result.success).toBe(false)
  })
})
