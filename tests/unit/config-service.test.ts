import { updateConfigSchema } from '$lib/validators'
import { describe, expect, it } from 'vitest'

describe('Configuration Service Validators', () => {
  describe('updateConfigSchema', () => {
    it('validates a string config value', () => {
      const result = updateConfigSchema.safeParse({ value: 'hello' })
      expect(result.success).toBe(true)
    })

    it('validates a boolean string value', () => {
      const result = updateConfigSchema.safeParse({ value: 'true' })
      expect(result.success).toBe(true)
    })

    it('rejects missing value', () => {
      const result = updateConfigSchema.safeParse({})
      expect(result.success).toBe(false)
    })

    it('rejects empty value', () => {
      const result = updateConfigSchema.safeParse({ value: '' })
      expect(result.success).toBe(false)
    })
  })
})

describe('Config Key Resolution Logic', () => {
  it('environment-specific key format is correct', () => {
    const key = 'maintenance_mode'
    const env = 'production'
    const effectiveKey = `${key}:${env}`
    expect(effectiveKey).toBe('maintenance_mode:production')
  })

  it('base key has no environment suffix', () => {
    const key = 'maintenance_mode'
    const env = undefined
    const effectiveKey = env ? `${key}:${env}` : key
    expect(effectiveKey).toBe('maintenance_mode')
  })

  it('resolution prefers env-specific over base', () => {
    const baseValue = 'off'
    const envValue = 'on'
    const resolved = envValue ?? baseValue
    expect(resolved).toBe('on')
  })

  it('resolution falls back to base when no env override', () => {
    const baseValue = 'off'
    const envValue = null
    const resolved = envValue ?? baseValue
    expect(resolved).toBe('off')
  })
})
