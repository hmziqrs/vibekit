import { describe, it, expect } from 'vitest'

import { contactSchema } from './contact'

describe('contactSchema', () => {
  const validInput = {
    name: 'John Doe',
    email: 'john@example.com',
    subject: 'Question about Vibekit',
    message: 'I would like to know more about your product and pricing options.',
  }

  it('validates valid contact input', () => {
    const result = contactSchema.safeParse(validInput)
    expect(result.success).toBe(true)
  })

  it('rejects empty name', () => {
    const result = contactSchema.safeParse({ ...validInput, name: '' })
    expect(result.success).toBe(false)
  })

  it('rejects invalid email', () => {
    const result = contactSchema.safeParse({ ...validInput, email: 'not-email' })
    expect(result.success).toBe(false)
  })

  it('rejects empty subject', () => {
    const result = contactSchema.safeParse({ ...validInput, subject: '' })
    expect(result.success).toBe(false)
  })

  it('rejects short message', () => {
    const result = contactSchema.safeParse({ ...validInput, message: 'Too short' })
    expect(result.success).toBe(false)
  })

  it('rejects overly long message', () => {
    const result = contactSchema.safeParse({ ...validInput, message: 'a'.repeat(5001) })
    expect(result.success).toBe(false)
  })

  it('trims whitespace from fields', () => {
    const result = contactSchema.safeParse({
      ...validInput,
      name: '  John  ',
      subject: '  Question  ',
      message: '  A valid message here  ',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.name).toBe('John')
      expect(result.data.subject).toBe('Question')
      expect(result.data.message).toBe('A valid message here')
    }
  })
})
