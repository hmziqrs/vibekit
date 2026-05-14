import { appealSchema, contactSchema } from '$lib/validators/contact'
import { describe, expect, it } from 'vitest'

describe('contactSchema', () => {
  const validInput = {
    email: 'john@example.com',
    message: 'I would like to know more about your product and pricing options.',
    name: 'John Doe',
    subject: 'Question about Vibekit',
  }

  it('validates valid contact input', () => {
    const result = contactSchema.safeParse(validInput)
    expect(result.success).toBeTruthy()
  })

  it('rejects empty name', () => {
    const result = contactSchema.safeParse({ ...validInput, name: '' })
    expect(result.success).toBeFalsy()
  })

  it('rejects invalid email', () => {
    const result = contactSchema.safeParse({ ...validInput, email: 'not-email' })
    expect(result.success).toBeFalsy()
  })

  it('rejects empty subject', () => {
    const result = contactSchema.safeParse({ ...validInput, subject: '' })
    expect(result.success).toBeFalsy()
  })

  it('rejects short message', () => {
    const result = contactSchema.safeParse({ ...validInput, message: 'Too short' })
    expect(result.success).toBeFalsy()
  })

  it('rejects overly long message', () => {
    const result = contactSchema.safeParse({ ...validInput, message: 'a'.repeat(5001) })
    expect(result.success).toBeFalsy()
  })

  it('trims whitespace from fields', () => {
    const data = contactSchema.parse({
      ...validInput,
      message: '  A valid message here  ',
      name: '  John  ',
      subject: '  Question  ',
    })
    expect(data.name).toBe('John')
    expect(data.subject).toBe('Question')
    expect(data.message).toBe('A valid message here')
  })
})

describe('appealSchema', () => {
  it('accepts valid appeal', () => {
    const result = appealSchema.safeParse({
      email: 'banned@example.com',
      message: 'I believe my ban was a mistake',
      name: 'John Doe',
    })
    expect(result.success).toBe(true)
  })

  it('trims whitespace from all fields', () => {
    const result = appealSchema.safeParse({
      email: '  test@example.com  ',
      message: '  Please review  ',
      name: '  Jane  ',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.email).toBe('test@example.com')
      expect(result.data.name).toBe('Jane')
      expect(result.data.message).toBe('Please review')
    }
  })

  it('rejects missing email', () => {
    const result = appealSchema.safeParse({ message: 'Hello', name: 'Jane' })
    expect(result.success).toBe(false)
  })

  it('rejects missing message', () => {
    const result = appealSchema.safeParse({ email: 'a@b.com', name: 'Jane' })
    expect(result.success).toBe(false)
  })

  it('rejects missing name', () => {
    const result = appealSchema.safeParse({ email: 'a@b.com', message: 'Hello' })
    expect(result.success).toBe(false)
  })

  it('rejects whitespace-only fields', () => {
    const result = appealSchema.safeParse({ email: '   ', message: '   ', name: '   ' })
    expect(result.success).toBe(false)
  })
})
