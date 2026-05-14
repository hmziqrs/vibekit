import {
  bio,
  notificationPreferenceSchema,
  onboardingSchema,
  reactivateAccountSchema,
  timezone,
  updateProfileSchema,
} from '$lib/validators/profile'
import { describe, expect, it } from 'vitest'

describe('updateProfileSchema', () => {
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

describe('bio validator', () => {
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

describe('timezone validator', () => {
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

describe('onboardingSchema', () => {
  it('accepts step and completed', () => {
    const result = onboardingSchema.safeParse({ completed: true, step: 2 })
    expect(result.success).toBe(true)
  })

  it('accepts step only', () => {
    const result = onboardingSchema.safeParse({ step: 0 })
    expect(result.success).toBe(true)
  })

  it('accepts completed only', () => {
    const result = onboardingSchema.safeParse({ completed: false })
    expect(result.success).toBe(true)
  })

  it('accepts empty object', () => {
    const result = onboardingSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('clamps step below 0 to 0', () => {
    const result = onboardingSchema.safeParse({ step: -1 })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.step).toBe(0)
    }
  })

  it('clamps step above 3 to 3', () => {
    const result = onboardingSchema.safeParse({ step: 10 })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.step).toBe(3)
    }
  })

  it('rejects non-integer step', () => {
    const result = onboardingSchema.safeParse({ step: 1.5 })
    expect(result.success).toBe(false)
  })

  it('rejects non-boolean completed', () => {
    const result = onboardingSchema.safeParse({ completed: 'yes' })
    expect(result.success).toBe(false)
  })
})

describe('reactivateAccountSchema', () => {
  it('accepts valid email and password', () => {
    const result = reactivateAccountSchema.safeParse({
      email: 'user@test.com',
      password: 'secret123',
    })
    expect(result.success).toBe(true)
  })

  it('rejects missing email', () => {
    const result = reactivateAccountSchema.safeParse({ password: 'secret' })
    expect(result.success).toBe(false)
  })

  it('rejects missing password', () => {
    const result = reactivateAccountSchema.safeParse({ email: 'user@test.com' })
    expect(result.success).toBe(false)
  })

  it('rejects empty email', () => {
    const result = reactivateAccountSchema.safeParse({ email: '', password: 'secret' })
    expect(result.success).toBe(false)
  })

  it('rejects empty password', () => {
    const result = reactivateAccountSchema.safeParse({ email: 'user@test.com', password: '' })
    expect(result.success).toBe(false)
  })
})

describe('notificationPreferenceSchema', () => {
  it('accepts valid email preference', () => {
    const result = notificationPreferenceSchema.safeParse({
      channel: 'email',
      enabled: true,
      type: 'blog_post',
    })
    expect(result.success).toBe(true)
  })

  it('accepts valid in_app preference', () => {
    const result = notificationPreferenceSchema.safeParse({
      channel: 'in_app',
      enabled: false,
      type: 'newsletter',
    })
    expect(result.success).toBe(true)
  })

  it('rejects invalid channel', () => {
    const result = notificationPreferenceSchema.safeParse({
      channel: 'sms',
      enabled: true,
      type: 'test',
    })
    expect(result.success).toBe(false)
  })

  it('rejects missing channel', () => {
    const result = notificationPreferenceSchema.safeParse({ enabled: true, type: 'test' })
    expect(result.success).toBe(false)
  })

  it('rejects missing enabled', () => {
    const result = notificationPreferenceSchema.safeParse({ channel: 'email', type: 'test' })
    expect(result.success).toBe(false)
  })

  it('rejects missing type', () => {
    const result = notificationPreferenceSchema.safeParse({ channel: 'email', enabled: true })
    expect(result.success).toBe(false)
  })

  it('rejects empty type string', () => {
    const result = notificationPreferenceSchema.safeParse({
      channel: 'email',
      enabled: true,
      type: '',
    })
    expect(result.success).toBe(false)
  })
})
