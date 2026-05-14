import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockSend = vi.fn().mockResolvedValue({ id: 'msg-123', success: true })

vi.mock('../services/types', () => ({}))

describe('EmailService', () => {
  beforeEach(() => {
    vi.resetModules()
    mockSend.mockClear()
    mockSend.mockResolvedValue({ id: 'msg-123', success: true })
  })

  it('creates an instance via createEmailService', async () => {
    const { createEmailService } = await import('$lib/server/email')
    const service = createEmailService({ send: mockSend } as never)
    expect(service).toBeDefined()
  })

  it('sendPasswordReset calls sendImmediate with correct fields', async () => {
    const { createEmailService } = await import('$lib/server/email')
    const service = createEmailService({ send: mockSend } as never)

    const result = await service.sendPasswordReset(
      'user@test.com',
      'https://app.com/reset?token=abc',
      'John'
    )

    expect(mockSend).toHaveBeenCalledTimes(1)
    const msg = mockSend.mock.calls[0][0]
    expect(msg.to).toBe('user@test.com')
    expect(msg.subject).toBe('Reset your Vibekit password')
    expect(msg.from).toBe('Vibekit <noreply@vibekit.com>')
    expect(msg.html).toContain('https://app.com/reset?token=abc')
    expect(msg.text).toContain('https://app.com/reset?token=abc')
    expect(msg.html).toContain('John')
    expect((result as unknown as { success: boolean }).success).toBe(true)
  })

  it('sendPasswordReset works without userName', async () => {
    const { createEmailService } = await import('$lib/server/email')
    const service = createEmailService({ send: mockSend } as never)

    await service.sendPasswordReset('user@test.com', 'https://app.com/reset?token=xyz')

    const msg = mockSend.mock.calls[0][0]
    expect(msg.html).toBeDefined()
    expect(msg.text).toBeDefined()
  })

  it('sendEmailVerification calls sendImmediate with correct fields', async () => {
    const { createEmailService } = await import('$lib/server/email')
    const service = createEmailService({ send: mockSend } as never)

    const result = await service.sendEmailVerification(
      'verify@test.com',
      'https://app.com/verify?token=abc',
      'Jane'
    )

    expect(mockSend).toHaveBeenCalledTimes(1)
    const msg = mockSend.mock.calls[0][0]
    expect(msg.to).toBe('verify@test.com')
    expect(msg.subject).toBe('Verify your email address')
    expect(msg.from).toBe('Vibekit <noreply@vibekit.com>')
    expect(msg.html).toContain('https://app.com/verify?token=abc')
    expect(msg.text).toContain('https://app.com/verify?token=abc')
    expect((result as unknown as { success: boolean }).success).toBe(true)
  })

  it('sendEmailVerification works without userName', async () => {
    const { createEmailService } = await import('$lib/server/email')
    const service = createEmailService({ send: mockSend } as never)

    await service.sendEmailVerification('verify@test.com', 'https://app.com/verify?token=xyz')

    const msg = mockSend.mock.calls[0][0]
    expect(msg.html).toBeDefined()
  })

  it('sendContactNotification renders and sends with correct subject', async () => {
    const { createEmailService } = await import('$lib/server/email')
    const service = createEmailService({ send: mockSend } as never)

    const result = await service.sendContactNotification({
      email: 'sender@test.com',
      message: 'Hello, I have a question.',
      name: 'Sender Name',
      subject: 'Question about pricing',
    })

    expect(mockSend).toHaveBeenCalledTimes(1)
    const msg = mockSend.mock.calls[0][0]
    expect(msg.to).toBe('sender@test.com')
    expect(msg.subject).toBe('Contact: Question about pricing')
    expect(msg.html).toContain('Sender Name')
    expect(msg.html).toContain('Hello, I have a question')
    expect(msg.text).toContain('Sender Name')
    expect(msg.text).toContain('Hello, I have a question')
    expect((result as unknown as { success: boolean }).success).toBe(true)
  })

  it('sendNewsletterConfirmation enqueues email with bounce callback', async () => {
    const { createEmailService } = await import('$lib/server/email')
    const service = createEmailService({ send: mockSend } as never)

    const onBounce = vi.fn().mockResolvedValue(undefined)
    await service.sendNewsletterConfirmation(
      'new@test.com',
      'https://app.com/confirm?token=abc',
      onBounce
    )

    // Newsletter uses enqueue which triggers immediate processing in test
    // The mock send will be called during queue processing
    expect(mockSend).toHaveBeenCalledTimes(1)
    const msg = mockSend.mock.calls[0][0]
    expect(msg.to).toBe('new@test.com')
    expect(msg.subject).toBe('Confirm your subscription to Vibekit Blog')
    expect(msg.from).toBe('Vibekit Blog <noreply@vibekit.com>')
    expect(msg.html).toContain('https://app.com/confirm?token=abc')
    expect(msg.text).toContain('https://app.com/confirm?token=abc')
  })

  it('sendNewsletterConfirmation works without bounce callback', async () => {
    const { createEmailService } = await import('$lib/server/email')
    const service = createEmailService({ send: mockSend } as never)

    await service.sendNewsletterConfirmation('new@test.com', 'https://app.com/confirm?token=xyz')

    expect(mockSend).toHaveBeenCalledTimes(1)
  })

  it('sendWelcome calls sendImmediate with correct fields', async () => {
    const { createEmailService } = await import('$lib/server/email')
    const service = createEmailService({ send: mockSend } as never)

    const result = await service.sendWelcome('new@test.com', 'Alice')

    expect(mockSend).toHaveBeenCalledTimes(1)
    const msg = mockSend.mock.calls[0][0]
    expect(msg.to).toBe('new@test.com')
    expect(msg.subject).toBe('Welcome to Vibekit!')
    expect(msg.from).toBe('Vibekit <noreply@vibekit.com>')
    expect(msg.html).toContain('Alice')
    expect(msg.text).toContain('Alice')
    expect((result as unknown as { success: boolean }).success).toBe(true)
  })
})
