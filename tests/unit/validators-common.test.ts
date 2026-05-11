import { email, name, password, slug } from '$lib/validators/common'
import { describe, expect, it } from 'vitest'

describe(email, () => {
  it('accepts valid emails', () => {
    expect(email.safeParse('user@example.com').success).toBeTruthy()
    expect(email.safeParse('user+tag@example.com').success).toBeTruthy()
  })

  it('rejects invalid emails', () => {
    expect(email.safeParse('not-email').success).toBeFalsy()
    expect(email.safeParse('@missing.com').success).toBeFalsy()
  })
})

describe(password, () => {
  it('accepts valid passwords', () => {
    expect(password.safeParse('Password1').success).toBeTruthy()
    expect(password.safeParse(`Aa1${'b'.repeat(125)}`).success).toBeTruthy()
  })

  it('rejects short passwords', () => {
    expect(password.safeParse('Pass1').success).toBeFalsy()
  })

  it('rejects overly long passwords', () => {
    expect(password.safeParse('a'.repeat(129)).success).toBeFalsy()
  })
})

describe(name, () => {
  it('accepts valid names', () => {
    expect(name.safeParse('John').success).toBeTruthy()
  })

  it('rejects empty name', () => {
    expect(name.safeParse('').success).toBeFalsy()
  })

  it('trims whitespace', () => {
    const data = name.parse('  John  ')
    expect(data).toBe('John')
  })
})

describe(slug, () => {
  it('accepts valid slugs', () => {
    expect(slug.safeParse('hello-world').success).toBeTruthy()
    expect(slug.safeParse('a').success).toBeTruthy()
    expect(slug.safeParse('my-post-2024').success).toBeTruthy()
  })

  it('rejects uppercase', () => {
    expect(slug.safeParse('Hello-World').success).toBeFalsy()
  })

  it('rejects spaces', () => {
    expect(slug.safeParse('hello world').success).toBeFalsy()
  })

  it('rejects trailing hyphens', () => {
    expect(slug.safeParse('hello-').success).toBeFalsy()
  })
})
