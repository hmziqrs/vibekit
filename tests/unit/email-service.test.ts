import { describe, expect, it, vi } from 'vitest'

// Mock email templates
vi.mock('$lib/server/email/templates/newsletter-confirm', () => ({
  renderNewsletterConfirm: vi.fn().mockReturnValue({ html: '<p>Confirm</p>', text: 'Confirm' }),
}))

vi.mock('$lib/server/email/templates/password-reset', () => ({
  renderPasswordReset: vi.fn().mockReturnValue({ html: '<p>Reset</p>', text: 'Reset' }),
}))

vi.mock('$lib/server/email/templates/email-verification', () => ({
  renderEmailVerification: vi.fn().mockReturnValue({ html: '<p>Verify</p>', text: 'Verify' }),
}))

vi.mock('$lib/server/email/templates/contact-notification', () => ({
  renderContactNotification: vi.fn().mockReturnValue({ html: '<p>Contact</p>', text: 'Contact' }),
}))

// Mock EmailQueue
const mockEnqueue = vi.fn()
const mockSendImmediate = vi.fn().mockResolvedValue({ ok: true })

vi.mock('$lib/server/email/queue', () => ({
  EmailQueue: vi.fn().mockImplementation(function () {
    return {
      enqueue: mockEnqueue,
      sendImmediate: mockSendImmediate,
    }
  }),
}))

describe('EmailService', () => {
  it('exports EmailService class', async () => {
    const mod = await import('$lib/server/email/index')
    expect(typeof mod.EmailService).toBe('function')
  })

  it('exports createEmailService factory', async () => {
    const mod = await import('$lib/server/email/index')
    expect(typeof mod.createEmailService).toBe('function')
  })

  it('createEmailService returns an EmailService instance', async () => {
    const { createEmailService } = await import('$lib/server/email/index')
    const mockClient = { send: vi.fn().mockResolvedValue({ ok: true }) }
    const service = createEmailService(mockClient)
    expect(service).toBeInstanceOf(Object)
  })
})

beforeEach(() => {
  mockEnqueue.mockClear()
  mockSendImmediate.mockClear()
  mockSendImmediate.mockResolvedValue({ ok: true })
})

describe('sendNewsletterConfirmation', () => {
  it('enqueues newsletter confirmation email', async () => {
    const { EmailService } = await import('$lib/server/email/index')
    const service = new EmailService({ send: vi.fn().mockResolvedValue({ ok: true }) })

    await service.sendNewsletterConfirmation('user@test.com', 'https://app.com/confirm?token=abc')

    expect(mockEnqueue).toHaveBeenCalledTimes(1)
    const [message, options] = mockEnqueue.mock.calls[0]
    expect(message.to).toBe('user@test.com')
    expect(message.subject).toBe('Confirm your subscription to Vibekit Blog')
    expect(message.html).toContain('Confirm')
  })

  it('passes onBounce callback as onFinalFailure', async () => {
    const { EmailService } = await import('$lib/server/email/index')
    const service = new EmailService({ send: vi.fn().mockResolvedValue({ ok: true }) })
    const onBounce = vi.fn().mockResolvedValue(undefined)

    await service.sendNewsletterConfirmation('user@test.com', 'https://confirm', onBounce)

    const [, options] = mockEnqueue.mock.calls[0]
    expect(options.onFinalFailure).toBe(onBounce)
  })
})

describe('sendPasswordReset', () => {
  it('sends password reset email immediately', async () => {
    const { EmailService } = await import('$lib/server/email/index')
    const service = new EmailService({ send: vi.fn().mockResolvedValue({ ok: true }) })

    const result = await service.sendPasswordReset('user@test.com', 'https://app.com/reset?token=x')

    expect(result.ok).toBe(true)
    expect(mockSendImmediate).toHaveBeenCalledTimes(1)
    const message = mockSendImmediate.mock.calls[0][0]
    expect(message.to).toBe('user@test.com')
    expect(message.subject).toBe('Reset your Vibekit password')
    expect(message.html).toContain('Reset')
  })

  it('passes userName to template', async () => {
    const { EmailService } = await import('$lib/server/email/index')
    const { renderPasswordReset } = await import('$lib/server/email/templates/password-reset')
    const service = new EmailService({ send: vi.fn().mockResolvedValue({ ok: true }) })

    await service.sendPasswordReset('user@test.com', 'https://reset', 'John')

    expect(renderPasswordReset).toHaveBeenCalledWith('https://reset', 'John')
  })
})

describe('sendEmailVerification', () => {
  it('sends verification email immediately', async () => {
    const { EmailService } = await import('$lib/server/email/index')
    const service = new EmailService({ send: vi.fn().mockResolvedValue({ ok: true }) })

    const result = await service.sendEmailVerification(
      'user@test.com',
      'https://app.com/verify?token=y'
    )

    expect(result.ok).toBe(true)
    expect(mockSendImmediate).toHaveBeenCalledTimes(1)
    const message = mockSendImmediate.mock.calls[0][0]
    expect(message.to).toBe('user@test.com')
    expect(message.subject).toBe('Verify your email address')
  })

  it('passes userName to template', async () => {
    const { EmailService } = await import('$lib/server/email/index')
    const { renderEmailVerification } =
      await import('$lib/server/email/templates/email-verification')
    const service = new EmailService({ send: vi.fn().mockResolvedValue({ ok: true }) })

    await service.sendEmailVerification('user@test.com', 'https://verify', 'Jane')

    expect(renderEmailVerification).toHaveBeenCalledWith('https://verify', 'Jane')
  })
})

describe('sendContactNotification', () => {
  it('sends contact notification email', async () => {
    const { EmailService } = await import('$lib/server/email/index')
    const service = new EmailService({ send: vi.fn().mockResolvedValue({ ok: true }) })

    const result = await service.sendContactNotification({
      email: 'admin@vibekit.com',
      message: 'Hello, I have a question.',
      name: 'John Doe',
      subject: 'General inquiry',
    })

    expect(result.ok).toBe(true)
    expect(mockSendImmediate).toHaveBeenCalledTimes(1)
    const message = mockSendImmediate.mock.calls[0][0]
    expect(message.to).toBe('admin@vibekit.com')
    expect(message.subject).toBe('Contact: General inquiry')
  })

  it('renders template with contact data', async () => {
    const { EmailService } = await import('$lib/server/email/index')
    const { renderContactNotification } =
      await import('$lib/server/email/templates/contact-notification')
    const service = new EmailService({ send: vi.fn().mockResolvedValue({ ok: true }) })

    const contactData = {
      email: 'user@test.com',
      message: 'Help needed',
      name: 'Jane',
      subject: 'Support',
    }

    await service.sendContactNotification(contactData)

    expect(renderContactNotification).toHaveBeenCalledWith(contactData)
  })
})
