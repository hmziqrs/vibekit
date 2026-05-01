import { describe, expect, it } from '@jest/globals'
import { expect, describe, it } from 'vitest'

import { forgotPasswordSchema, loginSchema, registerSchema, resetPasswordSchema } from './auth'

describe(loginSchema, () => {
  it('validates a valid login', () => {
    const result = loginSchema.safeParse({ email: 'user@example.com', password: 'secret123' })
    expect(result.success).toBe(true)
  })

  it('rejects empty password', () => {
    const result = loginSchema.safeParse({ email: 'user@example.com', password: '' })
    expect(result.success).toBe(false)
  })

  it('rejects invalid email', () => {
    const result = loginSchema.safeParse({ email: 'not-an-email', password: 'secret123' })
    expect(result.success).toBe(false)
  })
})

describe(registerSchema, () => {
  const validInput = {
    confirmPassword: 'securepassword',
    email: 'john@example.com',
    name: 'John',
    password: 'securepassword',
  }

  it('validates a valid registration', () => {
    const result = registerSchema.safeParse(validInput)
    expect(result.success).toBe(true)
  })

  it('rejects mismatched passwords', () => {
    const result = registerSchema.safeParse({ ...validInput, confirmPassword: 'different' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Passwords do not match')
    }
  })

  it('rejects short password', () => {
    const result = registerSchema.safeParse({
      ...validInput,
      confirmPassword: 'short',
      password: 'short',
    })
    expect(result.success).toBe(false)
  })

  it('rejects empty name', () => {
    const result = registerSchema.safeParse({ ...validInput, name: '' })
    expect(result.success).toBe(false)
  })
})

describe(forgotPasswordSchema, () => {
  it('validates a valid email', () => {
    const result = forgotPasswordSchema.safeParse({ email: 'user@example.com' })
    expect(result.success).toBe(true)
  })

  it('rejects invalid email', () => {
    const result = forgotPasswordSchema.safeParse({ email: 'bad' })
    expect(result.success).toBe(false)
  })
})

describe(resetPasswordSchema, () => {
  const validInput = {
    confirmPassword: 'newpassword123',
    password: 'newpassword123',
    token: 'reset-token-abc',
  }

  it('validates a valid reset', () => {
    const result = resetPasswordSchema.safeParse(validInput)
    expect(result.success).toBe(true)
  })

  it('rejects mismatched passwords', () => {
    const result = resetPasswordSchema.safeParse({ ...validInput, confirmPassword: 'different' })
    expect(result.success).toBe(false)
  })

  it('rejects empty token', () => {
    const result = resetPasswordSchema.safeParse({ ...validInput, token: '' })
    expect(result.success).toBe(false)
  })
})
