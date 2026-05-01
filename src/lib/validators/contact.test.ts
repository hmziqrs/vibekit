import { contactSchema } from './contact'

describe(contactSchema, () => {
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
    const result = contactSchema.safeParse({
      ...validInput,
      message: '  A valid message here  ',
      name: '  John  ',
      subject: '  Question  ',
    })
    expect(result.success).toBeTruthy()
    if (result.success) {
      expect(result.data.name).toBe('John')
      expect(result.data.subject).toBe('Question')
      expect(result.data.message).toBe('A valid message here')
    }
  })
})
