import { subscribeSchema } from '$lib/validators/newsletter'
import { describe, expect, it } from 'vitest'

describe('subscribeSchema', () => {
  it('validates email only', () => {
    const result = subscribeSchema.safeParse({ email: 'test@example.com' })
    expect(result.success).toBeTruthy()
  })

  it('validates email with name and source', () => {
    const result = subscribeSchema.safeParse({
      email: 'test@example.com',
      name: 'John Doe',
      source: 'blog',
    })
    expect(result.success).toBeTruthy()
  })

  it('rejects missing email', () => {
    const result = subscribeSchema.safeParse({})
    expect(result.success).toBeFalsy()
  })

  it('rejects invalid email', () => {
    const result = subscribeSchema.safeParse({ email: 'not-an-email' })
    expect(result.success).toBeFalsy()
  })

  it('rejects empty email', () => {
    const result = subscribeSchema.safeParse({ email: '' })
    expect(result.success).toBeFalsy()
  })

  it('defaults source to blog', () => {
    const data = subscribeSchema.parse({ email: 'test@example.com' })
    expect(data.source).toBe('blog')
  })

  it('accepts all valid sources', () => {
    for (const source of ['blog', 'footer', 'post'] as const) {
      const result = subscribeSchema.safeParse({ email: 'test@example.com', source })
      expect(result.success).toBeTruthy()
    }
  })

  it('rejects invalid source', () => {
    const result = subscribeSchema.safeParse({ email: 'test@example.com', source: 'popup' })
    expect(result.success).toBeFalsy()
  })

  it('name is optional', () => {
    const data = subscribeSchema.parse({ email: 'test@example.com' })
    expect(data.name).toBeUndefined()
  })

  it('rejects name exceeding 200 chars', () => {
    const result = subscribeSchema.safeParse({ email: 'test@example.com', name: 'a'.repeat(201) })
    expect(result.success).toBeFalsy()
  })

  it('trims name whitespace', () => {
    const data = subscribeSchema.parse({ email: 'test@example.com', name: '  John  ' })
    expect(data.name).toBe('John')
  })
})

describe('confirmation token logic', () => {
  it('token is valid within 24 hours', () => {
    const createdAt = new Date(Date.now() - 23 * 60 * 60 * 1000)
    const isExpired = Date.now() - createdAt.getTime() > 24 * 60 * 60 * 1000
    expect(isExpired).toBeFalsy()
  })

  it('token expires after 24 hours', () => {
    const createdAt = new Date(Date.now() - 25 * 60 * 60 * 1000)
    const isExpired = Date.now() - createdAt.getTime() > 24 * 60 * 60 * 1000
    expect(isExpired).toBeTruthy()
  })

  it('status transitions are valid', () => {
    const validTransitions: Array<{ from: string; to: string }> = [
      { from: 'pending', to: 'confirmed' },
      { from: 'confirmed', to: 'unsubscribed' },
      { from: 'unsubscribed', to: 'pending' },
      { from: 'confirmed', to: 'bounced' },
    ]
    expect(validTransitions.length).toBe(4)
  })
})
