import { describe, expect, it } from '@jest/globals'
import { expect, describe, it } from 'vitest'

import { email, name, password, slug } from './common'

describe(email, () => {
  it('accepts valid emails', () => {
    expect(email.safeParse('user@example.com').success).toBe(true)
    expect(email.safeParse('user+tag@example.com').success).toBe(true)
  })

  it('rejects invalid emails', () => {
    expect(email.safeParse('not-email').success).toBe(false)
    expect(email.safeParse('@missing.com').success).toBe(false)
  })
})

describe(password, () => {
  it('accepts valid passwords', () => {
    expect(password.safeParse('12345678').success).toBe(true)
    expect(password.safeParse('a'.repeat(128)).success).toBe(true)
  })

  it('rejects short passwords', () => {
    expect(password.safeParse('1234567').success).toBe(false)
  })

  it('rejects overly long passwords', () => {
    expect(password.safeParse('a'.repeat(129)).success).toBe(false)
  })
})

describe(name, () => {
  it('accepts valid names', () => {
    expect(name.safeParse('John').success).toBe(true)
  })

  it('rejects empty name', () => {
    expect(name.safeParse('').success).toBe(false)
  })

  it('trims whitespace', () => {
    const result = name.safeParse('  John  ')
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toBe('John')
    }
  })
})

describe(slug, () => {
  it('accepts valid slugs', () => {
    expect(slug.safeParse('hello-world').success).toBe(true)
    expect(slug.safeParse('a').success).toBe(true)
    expect(slug.safeParse('my-post-2024').success).toBe(true)
  })

  it('rejects uppercase', () => {
    expect(slug.safeParse('Hello-World').success).toBe(false)
  })

  it('rejects spaces', () => {
    expect(slug.safeParse('hello world').success).toBe(false)
  })

  it('rejects trailing hyphens', () => {
    expect(slug.safeParse('hello-').success).toBe(false)
  })
})
