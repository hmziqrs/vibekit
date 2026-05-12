import { renderEmail } from '$lib/server/email/templates/base'
import { renderContactNotification } from '$lib/server/email/templates/contact-notification'
import { renderEmailVerification } from '$lib/server/email/templates/email-verification'
import { renderNewsletterConfirm } from '$lib/server/email/templates/newsletter-confirm'
import { renderPasswordReset } from '$lib/server/email/templates/password-reset'
import { renderWelcome } from '$lib/server/email/templates/welcome'
import { describe, expect, it } from 'vitest'

describe('renderEmail base template', () => {
  it('includes DOCTYPE', () => {
    const html = renderEmail('Test', '<p>Hello</p>')
    expect(html).toContain('<!DOCTYPE html>')
  })

  it('includes title', () => {
    const html = renderEmail('My Email Title', '<p>Body</p>')
    expect(html).toContain('My Email Title')
  })

  it('includes body html', () => {
    const html = renderEmail('Title', '<p>Custom body content</p>')
    expect(html).toContain('<p>Custom body content</p>')
  })
})

describe(renderNewsletterConfirm, () => {
  it('returns html and text', () => {
    const result = renderNewsletterConfirm('https://example.com/confirm?token=abc')
    expect(result.html).toContain('https://example.com/confirm?token=abc')
    expect(result.text).toContain('https://example.com/confirm?token=abc')
  })

  it('html has confirm button', () => {
    const result = renderNewsletterConfirm('https://example.com/confirm?token=abc')
    expect(result.html).toContain('Confirm Subscription')
  })

  it('html escapes special characters in url', () => {
    const result = renderNewsletterConfirm('https://example.com/confirm?token=abc&ref=test')
    expect(result.html).not.toContain('href="https://example.com/confirm?token=abc&ref=test"')
    expect(result.html).toContain('&amp;ref=test')
  })

  it('text mentions ignoring if not subscribed', () => {
    const result = renderNewsletterConfirm('https://example.com/confirm')
    expect(result.text).toContain('ignore this email')
  })
})

describe(renderPasswordReset, () => {
  it('includes reset url in html', () => {
    const result = renderPasswordReset('https://example.com/reset?token=xyz')
    expect(result.html).toContain('https://example.com/reset?token=xyz')
  })

  it('includes reset url in text', () => {
    const result = renderPasswordReset('https://example.com/reset?token=xyz')
    expect(result.text).toContain('https://example.com/reset?token=xyz')
  })

  it('shows user name when provided', () => {
    const result = renderPasswordReset('https://example.com/reset', 'John')
    expect(result.html).toContain('Hi John')
    expect(result.text).toContain('Hi John')
  })

  it('shows generic greeting when no name', () => {
    const result = renderPasswordReset('https://example.com/reset')
    expect(result.html).toContain('Hi there')
    expect(result.text).toContain('Hi there')
  })

  it('mentions expiry time', () => {
    const result = renderPasswordReset('https://example.com/reset')
    expect(result.html).toContain('1 hour')
    expect(result.text).toContain('1 hour')
  })
})

describe(renderEmailVerification, () => {
  it('includes verify url in html', () => {
    const result = renderEmailVerification('https://example.com/verify?token=123')
    expect(result.html).toContain('https://example.com/verify?token=123')
  })

  it('includes verify url in text', () => {
    const result = renderEmailVerification('https://example.com/verify?token=123')
    expect(result.text).toContain('https://example.com/verify?token=123')
  })

  it('shows user name when provided', () => {
    const result = renderEmailVerification('https://example.com/verify', 'Jane')
    expect(result.html).toContain('Hi Jane')
  })

  it('has Verify Email button', () => {
    const result = renderEmailVerification('https://example.com/verify')
    expect(result.html).toContain('Verify Email')
  })
})

describe(renderContactNotification, () => {
  const data = {
    email: 'user@example.com',
    message: 'Hello, I have a question.',
    name: 'John Doe',
    subject: 'Inquiry',
  }

  it('includes name in html', () => {
    const result = renderContactNotification(data)
    expect(result.html).toContain('John Doe')
  })

  it('includes email in html', () => {
    const result = renderContactNotification(data)
    expect(result.html).toContain('user@example.com')
  })

  it('includes subject in html', () => {
    const result = renderContactNotification(data)
    expect(result.html).toContain('Inquiry')
  })

  it('includes message in html', () => {
    const result = renderContactNotification(data)
    expect(result.html).toContain('Hello, I have a question.')
  })

  it('text format includes all fields', () => {
    const result = renderContactNotification(data)
    expect(result.text).toContain('John Doe')
    expect(result.text).toContain('user@example.com')
    expect(result.text).toContain('Inquiry')
    expect(result.text).toContain('Hello, I have a question.')
  })

  it('escapes html in message', () => {
    const xssData = { ...data, message: '<script>alert("xss")</script>' }
    const result = renderContactNotification(xssData)
    expect(result.html).not.toContain('<script>')
    expect(result.html).toContain('&lt;script&gt;')
  })
})

describe(renderWelcome, () => {
  it('includes user name', () => {
    const result = renderWelcome('Alice')
    expect(result.html).toContain('Alice')
    expect(result.text).toContain('Alice')
  })

  it('has welcome message', () => {
    const result = renderWelcome('Alice')
    expect(result.html).toContain('Welcome to Vibekit')
    expect(result.text).toContain('Welcome to Vibekit')
  })

  it('has dashboard link', () => {
    const result = renderWelcome('Alice')
    expect(result.html).toContain('Go to Dashboard')
  })
})
