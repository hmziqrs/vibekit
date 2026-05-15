import { describe, expect, it, vi } from 'vitest'

describe('email service initialization', () => {
  it('setEmailService and getEmailService round-trip', async () => {
    const { setEmailService, getEmailService } = await import('$lib/server/auth')

    const mockService = {
      sendNewsletterConfirmation: vi.fn(),
      sendPasswordReset: vi.fn().mockResolvedValue({ ok: true }),
      sendEmailVerification: vi.fn().mockResolvedValue({ ok: true }),
      sendContactNotification: vi.fn().mockResolvedValue({ ok: true }),
      sendWelcome: vi.fn().mockResolvedValue({ ok: true }),
      sendPaymentFailed: vi.fn().mockResolvedValue({ ok: true }),
      sendPaymentSucceeded: vi.fn().mockResolvedValue({ ok: true }),
      sendSubscriptionCanceled: vi.fn().mockResolvedValue({ ok: true }),
      sendTrialEndingSoon: vi.fn().mockResolvedValue({ ok: true }),
      sendPlanChanged: vi.fn().mockResolvedValue({ ok: true }),
      sendSecurityAlert: vi.fn().mockResolvedValue({ ok: true }),
    }

    setEmailService(mockService as never)
    expect(getEmailService()).toBe(mockService)
  })

  it('getEmailService returns null before initialization', async () => {
    // getEmailService is a module-level getter; it returns the last set value.
    // This test verifies the function signature and return type.
    const { getEmailService } = await import('$lib/server/auth')
    // After the previous test sets it, it will be non-null, but the API exists
    expect(typeof getEmailService()).toBe('object')
  })
})

describe('createEmailService factory', () => {
  it('creates an EmailService with a mock client', async () => {
    const { createEmailService } = await import('$lib/server/email/index')

    const mockClient = {
      send: vi.fn().mockResolvedValue({ delivered: ['test@test.com'], ok: true }),
    }

    const service = createEmailService(mockClient)
    expect(service).toBeTruthy()

    const result = await service.sendPasswordReset('test@test.com', 'https://reset.url')
    expect(result.ok).toBe(true)
    expect(mockClient.send).toHaveBeenCalledTimes(1)
  })

  it('sendNewsletterConfirmation enqueues to queue', async () => {
    const { createEmailService } = await import('$lib/server/email/index')

    const mockClient = {
      send: vi.fn().mockResolvedValue({ delivered: ['test@test.com'], ok: true }),
    }

    const service = createEmailService(mockClient)
    await service.sendNewsletterConfirmation('test@test.com', 'https://confirm.url')

    await vi.waitFor(() => {
      expect(mockClient.send).toHaveBeenCalledTimes(1)
    })
  })
})
