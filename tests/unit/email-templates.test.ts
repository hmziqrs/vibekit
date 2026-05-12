import { escapeHtml, renderEmail, textStyles } from '$lib/server/email/templates/base'
import { renderContactNotification } from '$lib/server/email/templates/contact-notification'
import { renderEmailVerification } from '$lib/server/email/templates/email-verification'
import { renderNewsletterConfirm } from '$lib/server/email/templates/newsletter-confirm'
import { renderPasswordReset } from '$lib/server/email/templates/password-reset'
import { renderWelcome } from '$lib/server/email/templates/welcome'
import { describe, expect, it } from 'vitest'

describe('escapeHtml', () => {
  it('escapes ampersands', () => {
    expect(escapeHtml('a&b')).toBe('a&amp;b')
  })

  it('escapes angle brackets', () => {
    expect(escapeHtml('<script>')).toBe('&lt;script&gt;')
  })

  it('escapes double quotes', () => {
    expect(escapeHtml('"hello"')).toBe('&quot;hello&quot;')
  })

  it('returns plain text unchanged', () => {
    expect(escapeHtml('hello world')).toBe('hello world')
  })
})

describe('renderEmail', () => {
  it('wraps body in HTML template with title', () => {
    const html = renderEmail('Test Title', '<p>Body</p>')
    expect(html).toContain('<!DOCTYPE html>')
    expect(html).toContain('Test Title')
    expect(html).toContain('<p>Body</p>')
  })

  it('includes preview text as title when provided', () => {
    const html = renderEmail('Title', '<p>X</p>', 'Preview text')
    expect(html).toContain('<title>Preview text</title>')
  })

  it('omits title tag when no preview text', () => {
    const html = renderEmail('Title', '<p>X</p>')
    expect(html).not.toContain('<title>')
  })

  it('includes brand footer', () => {
    const html = renderEmail('Title', '<p>X</p>')
    expect(html).toContain('Vibekit')
  })
})

describe('textStyles', () => {
  it('has heading, muted, and paragraph styles', () => {
    expect(textStyles.heading).toBeDefined()
    expect(textStyles.muted).toBeDefined()
    expect(textStyles.paragraph).toBeDefined()
  })

  it('styles contain color values', () => {
    expect(textStyles.heading).toContain('color:')
    expect(textStyles.muted).toContain('color:')
    expect(textStyles.paragraph).toContain('color:')
  })
})

describe('renderPasswordReset', () => {
  it('returns html and text properties', () => {
    const result = renderPasswordReset('https://app.com/reset?token=abc')
    expect(result.html).toBeDefined()
    expect(result.text).toBeDefined()
  })

  it('includes reset URL in html', () => {
    const result = renderPasswordReset('https://app.com/reset?token=abc')
    expect(result.html).toContain('https://app.com/reset?token=abc')
    expect(result.html).toContain('Reset Password')
  })

  it('includes reset URL in text version', () => {
    const result = renderPasswordReset('https://app.com/reset?token=abc')
    expect(result.text).toContain('https://app.com/reset?token=abc')
  })

  it('uses userName when provided', () => {
    const result = renderPasswordReset('https://reset', 'Alice')
    expect(result.html).toContain('Alice')
    expect(result.text).toContain('Alice')
  })

  it('defaults to "there" when no userName', () => {
    const result = renderPasswordReset('https://reset')
    expect(result.html).toContain('there')
    expect(result.text).toContain('there')
  })

  it('escapes userName in html', () => {
    const result = renderPasswordReset('https://reset', '<script>alert(1)</script>')
    expect(result.html).not.toContain('<script>')
    expect(result.html).toContain('&lt;script&gt;')
  })

  it('escapes URL in html to prevent injection', () => {
    const result = renderPasswordReset('https://app.com/reset?a=1&b=2')
    expect(result.html).toContain('https://app.com/reset?a=1&amp;b=2')
  })
})

describe('renderEmailVerification', () => {
  it('returns html and text properties', () => {
    const result = renderEmailVerification('https://app.com/verify?token=x')
    expect(result.html).toBeDefined()
    expect(result.text).toBeDefined()
  })

  it('includes verify URL in both formats', () => {
    const result = renderEmailVerification('https://app.com/verify?token=x')
    expect(result.html).toContain('https://app.com/verify?token=x')
    expect(result.text).toContain('https://app.com/verify?token=x')
  })

  it('includes Verify Email button text', () => {
    const result = renderEmailVerification('https://verify')
    expect(result.html).toContain('Verify Email')
  })

  it('uses userName when provided', () => {
    const result = renderEmailVerification('https://verify', 'Bob')
    expect(result.html).toContain('Bob')
    expect(result.text).toContain('Bob')
  })

  it('defaults to "there" when no userName', () => {
    const result = renderEmailVerification('https://verify')
    expect(result.html).toContain('there')
  })

  it('escapes userName in html', () => {
    const result = renderEmailVerification('https://verify', '"><img src=x>')
    expect(result.html).not.toContain('"><img')
  })
})

describe('renderNewsletterConfirm', () => {
  it('returns html and text properties', () => {
    const result = renderNewsletterConfirm('https://app.com/confirm?token=abc')
    expect(result.html).toBeDefined()
    expect(result.text).toBeDefined()
  })

  it('includes confirm URL in html', () => {
    const result = renderNewsletterConfirm('https://app.com/confirm?token=abc')
    expect(result.html).toContain('https://app.com/confirm?token=abc')
    expect(result.html).toContain('Confirm Subscription')
  })

  it('includes confirm URL in text version', () => {
    const result = renderNewsletterConfirm('https://app.com/confirm?token=abc')
    expect(result.text).toContain('https://app.com/confirm?token=abc')
  })

  it('escapes URL in html', () => {
    const result = renderNewsletterConfirm('https://app.com/confirm?a=1&b=2')
    expect(result.html).toContain('https://app.com/confirm?a=1&amp;b=2')
  })
})

describe('renderContactNotification', () => {
  it('returns html and text properties', () => {
    const result = renderContactNotification({
      email: 'user@test.com',
      message: 'Hello',
      name: 'John',
      subject: 'Inquiry',
    })
    expect(result.html).toBeDefined()
    expect(result.text).toBeDefined()
  })

  it('includes all contact data in html', () => {
    const result = renderContactNotification({
      email: 'user@test.com',
      message: 'I have a question',
      name: 'John Doe',
      subject: 'General inquiry',
    })
    expect(result.html).toContain('John Doe')
    expect(result.html).toContain('user@test.com')
    expect(result.html).toContain('General inquiry')
    expect(result.html).toContain('I have a question')
  })

  it('includes all contact data in text', () => {
    const result = renderContactNotification({
      email: 'user@test.com',
      message: 'Help needed',
      name: 'Jane',
      subject: 'Support',
    })
    expect(result.text).toContain('Jane')
    expect(result.text).toContain('user@test.com')
    expect(result.text).toContain('Support')
    expect(result.text).toContain('Help needed')
  })

  it('escapes html in user inputs', () => {
    const result = renderContactNotification({
      email: 'x@x.com',
      message: '<script>alert(1)</script>',
      name: '<b>John</b>',
      subject: '"test"',
    })
    expect(result.html).not.toContain('<script>')
    expect(result.html).toContain('&lt;script&gt;')
    expect(result.html).not.toContain('<b>John</b>')
  })
})

describe('renderWelcome', () => {
  it('returns html and text properties', () => {
    const result = renderWelcome('Alice')
    expect(result.html).toBeDefined()
    expect(result.text).toBeDefined()
  })

  it('includes user name in html', () => {
    const result = renderWelcome('Alice')
    expect(result.html).toContain('Alice')
  })

  it('includes user name in text', () => {
    const result = renderWelcome('Bob')
    expect(result.text).toContain('Bob')
  })

  it('includes getting started items', () => {
    const result = renderWelcome('Alice')
    expect(result.html).toContain('Complete your profile')
    expect(result.html).toContain('Explore the dashboard')
    expect(result.html).toContain('Check out the blog')
  })

  it('includes dashboard link', () => {
    const result = renderWelcome('Alice')
    expect(result.html).toContain('/app/dashboard')
  })

  it('escapes user name in html', () => {
    const result = renderWelcome('<img src=x onerror=alert(1)>')
    expect(result.html).not.toContain('<img src=x')
    expect(result.html).toContain('&lt;img')
  })
})
