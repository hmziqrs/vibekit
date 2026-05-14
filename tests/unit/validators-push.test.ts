import { pushSubscribeSchema, pushUnsubscribeSchema } from '$lib/validators/push'
import { describe, expect, it } from 'vitest'

describe('pushSubscribeSchema', () => {
  const validInput = {
    auth: 'dGhpcyBpcyBhIGJhc2U2NCBzdHJpbmc=',
    endpoint: 'https://fcm.googleapis.com/fcm/send/abc123',
    p256dh: 'BC_4e8V8c5HKlJq1n4q1R8z7kN0yP6i5hL2dW3cE9mV1nB7sF0gT+UjXoYrA8bQ6w=',
  }

  it('accepts valid push subscription', () => {
    const result = pushSubscribeSchema.safeParse(validInput)
    expect(result.success).toBe(true)
  })

  it('rejects missing auth', () => {
    const result = pushSubscribeSchema.safeParse({ ...validInput, auth: '' })
    expect(result.success).toBe(false)
  })

  it('rejects missing endpoint', () => {
    const result = pushSubscribeSchema.safeParse({ ...validInput, endpoint: '' })
    expect(result.success).toBe(false)
  })

  it('rejects invalid endpoint URL', () => {
    const result = pushSubscribeSchema.safeParse({ ...validInput, endpoint: 'not-a-url' })
    expect(result.success).toBe(false)
  })

  it('rejects missing p256dh', () => {
    const result = pushSubscribeSchema.safeParse({ ...validInput, p256dh: '' })
    expect(result.success).toBe(false)
  })

  it('trims whitespace from endpoint', () => {
    const result = pushSubscribeSchema.parse({
      ...validInput,
      endpoint: '  https://fcm.googleapis.com/test  ',
    })
    expect(result.endpoint).toBe('https://fcm.googleapis.com/test')
  })

  it('rejects non-string fields', () => {
    const result = pushSubscribeSchema.safeParse({
      auth: 123,
      endpoint: 'https://example.com',
      p256dh: 456,
    })
    expect(result.success).toBe(false)
  })

  it('rejects missing all fields', () => {
    const result = pushSubscribeSchema.safeParse({})
    expect(result.success).toBe(false)
  })
})

describe('pushUnsubscribeSchema', () => {
  it('accepts valid endpoint', () => {
    const result = pushUnsubscribeSchema.safeParse({
      endpoint: 'https://fcm.googleapis.com/fcm/send/abc123',
    })
    expect(result.success).toBe(true)
  })

  it('trims whitespace from endpoint', () => {
    const result = pushUnsubscribeSchema.parse({ endpoint: '  https://example.com  ' })
    expect(result.endpoint).toBe('https://example.com')
  })

  it('rejects empty endpoint', () => {
    const result = pushUnsubscribeSchema.safeParse({ endpoint: '' })
    expect(result.success).toBe(false)
  })

  it('rejects missing endpoint', () => {
    const result = pushUnsubscribeSchema.safeParse({})
    expect(result.success).toBe(false)
  })

  it('rejects whitespace-only endpoint', () => {
    const result = pushUnsubscribeSchema.safeParse({ endpoint: '   ' })
    expect(result.success).toBe(false)
  })

  it('rejects non-string endpoint', () => {
    const result = pushUnsubscribeSchema.safeParse({ endpoint: 123 })
    expect(result.success).toBe(false)
  })
})
