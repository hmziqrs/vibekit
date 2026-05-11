import { bio, timezone, updateProfileSchema } from '$lib/validators/profile'
import { describe, expect, it } from 'vitest'

describe(updateProfileSchema, () => {
  const validInput = {
    bio: 'Hello, I am a developer.',
    displayName: 'Dev User',
    name: 'Dev',
    timezone: 'America/New_York',
  }

  it('validates a valid profile', () => {
    const result = updateProfileSchema.safeParse(validInput)
    expect(result.success).toBeTruthy()
  })

  it('validates with optional fields set to null', () => {
    const result = updateProfileSchema.safeParse({
      bio: null,
      displayName: null,
      name: 'Dev',
      timezone: null,
    })
    expect(result.success).toBeTruthy()
  })

  it('validates with optional fields omitted', () => {
    const result = updateProfileSchema.safeParse({ name: 'Dev' })
    expect(result.success).toBeTruthy()
  })

  it('rejects empty name', () => {
    const result = updateProfileSchema.safeParse({ ...validInput, name: '' })
    expect(result.success).toBeFalsy()
  })

  it('rejects name over 100 characters', () => {
    const result = updateProfileSchema.safeParse({ ...validInput, name: 'a'.repeat(101) })
    expect(result.success).toBeFalsy()
  })

  it('rejects displayName over 100 characters', () => {
    const result = updateProfileSchema.safeParse({ ...validInput, displayName: 'a'.repeat(101) })
    expect(result.success).toBeFalsy()
  })

  it('rejects bio over 500 characters', () => {
    const result = updateProfileSchema.safeParse({ ...validInput, bio: 'a'.repeat(501) })
    expect(result.success).toBeFalsy()
  })

  it('rejects timezone over 50 characters', () => {
    const result = updateProfileSchema.safeParse({ ...validInput, timezone: 'a'.repeat(51) })
    expect(result.success).toBeFalsy()
  })

  it('trims whitespace from name', () => {
    const result = updateProfileSchema.safeParse({ ...validInput, name: '  Dev  ' })
    expect(result.success).toBeTruthy()
    expect(result.data!.name).toBe('Dev')
  })

  it('rejects empty displayName string (min 1 required)', () => {
    const result = updateProfileSchema.safeParse({ ...validInput, displayName: '' })
    expect(result.success).toBeFalsy()
  })

  it('accepts bio as empty string (optional/nullable)', () => {
    const result = updateProfileSchema.safeParse({ ...validInput, bio: '' })
    expect(result.success).toBeTruthy()
  })
})

describe(bio, () => {
  it('accepts null', () => {
    const result = bio.safeParse(null)
    expect(result.success).toBeTruthy()
  })

  it('accepts undefined', () => {
    const result = bio.safeParse(undefined)
    expect(result.success).toBeTruthy()
  })

  it('accepts a string under 500 chars', () => {
    const result = bio.safeParse('A short bio')
    expect(result.success).toBeTruthy()
  })

  it('rejects a string over 500 chars', () => {
    const result = bio.safeParse('a'.repeat(501))
    expect(result.success).toBeFalsy()
  })
})

describe(timezone, () => {
  it('accepts null', () => {
    const result = timezone.safeParse(null)
    expect(result.success).toBeTruthy()
  })

  it('accepts undefined', () => {
    const result = timezone.safeParse(undefined)
    expect(result.success).toBeTruthy()
  })

  it('accepts a valid timezone string', () => {
    const result = timezone.safeParse('Europe/London')
    expect(result.success).toBeTruthy()
  })

  it('rejects a string over 50 chars', () => {
    const result = timezone.safeParse('a'.repeat(51))
    expect(result.success).toBeFalsy()
  })
})
