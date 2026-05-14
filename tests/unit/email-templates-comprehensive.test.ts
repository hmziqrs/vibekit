import { escapeHtml, renderEmail, textStyles } from '$lib/server/email/templates/base'
import { renderContactNotification } from '$lib/server/email/templates/contact-notification'
import { renderEmailVerification } from '$lib/server/email/templates/email-verification'
import { renderNewsletterConfirm } from '$lib/server/email/templates/newsletter-confirm'
import { renderPasswordReset } from '$lib/server/email/templates/password-reset'
import { renderWelcome } from '$lib/server/email/templates/welcome'
import { describe, expect, it } from 'vitest'

// ---------------------------------------------------------------------------
// escapeHtml
// ---------------------------------------------------------------------------
describe('escapeHtml', () => {
  it('escapes ampersands', () => {
    expect(escapeHtml('a&b')).toBe('a&amp;b')
  })

  it('escapes opening angle brackets', () => {
    expect(escapeHtml('<div>')).toBe('&lt;div&gt;')
  })

  it('escapes closing angle brackets', () => {
    expect(escapeHtml('x>y')).toBe('x&gt;y')
  })

  it('escapes double quotes', () => {
    expect(escapeHtml('"hello"')).toBe('&quot;hello&quot;')
  })

  it('escapes all special characters in combination', () => {
    expect(escapeHtml('<a href="x&y">z</a>')).toBe('&lt;a href=&quot;x&amp;y&quot;&gt;z&lt;/a&gt;')
  })

  it('returns plain text unchanged', () => {
    expect(escapeHtml('hello world')).toBe('hello world')
  })

  it('returns empty string unchanged', () => {
    expect(escapeHtml('')).toBe('')
  })

  it('handles strings with only special characters', () => {
    expect(escapeHtml('&<>"')).toBe('&amp;&lt;&gt;&quot;')
  })

  it('does not escape single quotes', () => {
    expect(escapeHtml("it's")).toBe("it's")
  })
})

// ---------------------------------------------------------------------------
// renderEmail (base template)
// ---------------------------------------------------------------------------
describe('renderEmail', () => {
  it('returns a full HTML document with DOCTYPE', () => {
    const html = renderEmail('Title', '<p>Body</p>')
    expect(html).toContain('<!DOCTYPE html>')
    expect(html).toContain('</html>')
  })

  it('contains the title in an h1 element', () => {
    const html = renderEmail('My Title', '<p>Body</p>')
    expect(html).toContain('<h1')
    expect(html).toContain('My Title')
  })

  it('contains the body HTML inside the content area', () => {
    const html = renderEmail('Title', '<p>Custom body content</p>')
    expect(html).toContain('<p>Custom body content</p>')
  })

  it('includes preview text as title when provided', () => {
    const html = renderEmail('Title', '<p>X</p>', 'Preview text here')
    expect(html).toContain('<title>Preview text here</title>')
  })

  it('escapes preview text in the title tag', () => {
    const html = renderEmail('Title', '<p>X</p>', '<script>alert(1)</script>')
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
  })

  it('omits title tag when no preview text', () => {
    const html = renderEmail('Title', '<p>X</p>')
    expect(html).not.toContain('<title>')
  })

  it('includes the Vibekit brand footer', () => {
    const html = renderEmail('Title', '<p>X</p>')
    expect(html).toContain('Vibekit')
    expect(html).toContain('SvelteKit SaaS Boilerplate')
  })

  it('includes responsive viewport meta tag', () => {
    const html = renderEmail('Title', '<p>X</p>')
    expect(html).toContain('viewport')
  })

  it('includes X-UA-Compatible meta tag', () => {
    const html = renderEmail('Title', '<p>X</p>')
    expect(html).toContain('X-UA-Compatible')
  })

  it('includes the button CSS class styles', () => {
    const html = renderEmail('Title', '<p>X</p>')
    expect(html).toContain('.button')
  })

  it('uses table-based layout for email client compatibility', () => {
    const html = renderEmail('Title', '<p>X</p>')
    expect(html).toContain('<table')
    expect(html).toContain('role="presentation"')
  })

  it('escapes the title in the h1 element', () => {
    const html = renderEmail('<b>Bold Title</b>', '<p>Body</p>')
    expect(html).not.toContain('<b>Bold Title</b>')
    expect(html).toContain('&lt;b&gt;Bold Title&lt;/b&gt;')
  })

  it('uses default dark background color', () => {
    const html = renderEmail('Title', '<p>X</p>')
    expect(html).toContain('#0a0a0b')
  })
})

// ---------------------------------------------------------------------------
// textStyles
// ---------------------------------------------------------------------------
describe('textStyles', () => {
  it('has heading, muted, and paragraph styles', () => {
    expect(textStyles.heading).toBeDefined()
    expect(textStyles.muted).toBeDefined()
    expect(textStyles.paragraph).toBeDefined()
  })

  it('heading style contains font-weight for emphasis', () => {
    expect(textStyles.heading).toContain('font-weight')
  })

  it('paragraph style contains line-height for readability', () => {
    expect(textStyles.paragraph).toContain('line-height')
  })

  it('muted style has smaller font size', () => {
    expect(textStyles.muted).toContain('font-size:13px')
  })
})

// ---------------------------------------------------------------------------
// renderContactNotification
// ---------------------------------------------------------------------------
describe('renderContactNotification', () => {
  const validData = {
    email: 'user@example.com',
    message: 'I have a question about your product.',
    name: 'Jane Doe',
    subject: 'Product Inquiry',
  }

  it('returns both html and text properties', () => {
    const result = renderContactNotification(validData)
    expect(result).toHaveProperty('html')
    expect(result).toHaveProperty('text')
  })

  it('html is a string', () => {
    const result = renderContactNotification(validData)
    expect(typeof result.html).toBe('string')
  })

  it('text is a string', () => {
    const result = renderContactNotification(validData)
    expect(typeof result.text).toBe('string')
  })

  it('html contains the "New Contact Submission" heading', () => {
    const result = renderContactNotification(validData)
    expect(result.html).toContain('New Contact Submission')
  })

  it('html contains the name label and value', () => {
    const result = renderContactNotification(validData)
    expect(result.html).toContain('Name')
    expect(result.html).toContain('Jane Doe')
  })

  it('html contains the email label and value', () => {
    const result = renderContactNotification(validData)
    expect(result.html).toContain('Email')
    expect(result.html).toContain('user@example.com')
  })

  it('html renders email as a mailto link', () => {
    const result = renderContactNotification(validData)
    expect(result.html).toContain('mailto:user@example.com')
  })

  it('html contains the subject label and value', () => {
    const result = renderContactNotification(validData)
    expect(result.html).toContain('Subject')
    expect(result.html).toContain('Product Inquiry')
  })

  it('html contains the message body', () => {
    const result = renderContactNotification(validData)
    expect(result.html).toContain('I have a question about your product.')
  })

  it('html uses pre-wrap for message to preserve formatting', () => {
    const result = renderContactNotification(validData)
    expect(result.html).toContain('pre-wrap')
  })

  it('text version contains all fields', () => {
    const result = renderContactNotification(validData)
    expect(result.text).toContain('Jane Doe')
    expect(result.text).toContain('user@example.com')
    expect(result.text).toContain('Product Inquiry')
    expect(result.text).toContain('I have a question about your product.')
  })

  it('text version has structured format with labels', () => {
    const result = renderContactNotification(validData)
    expect(result.text).toContain('Name: Jane Doe')
    expect(result.text).toContain('Email: user@example.com')
    expect(result.text).toContain('Subject: Product Inquiry')
  })

  it('text version does not contain HTML tags', () => {
    const result = renderContactNotification(validData)
    expect(result.text).not.toContain('<')
    expect(result.text).not.toContain('>')
    expect(result.text).not.toContain('&lt;')
    expect(result.text).not.toContain('&gt;')
  })

  it('escapes HTML in name for XSS prevention', () => {
    const result = renderContactNotification({
      ...validData,
      name: '<script>alert("xss")</script>',
    })
    expect(result.html).not.toContain('<script>')
    expect(result.html).toContain('&lt;script&gt;')
  })

  it('escapes HTML in email for XSS prevention', () => {
    const result = renderContactNotification({
      ...validData,
      email: '<img src=x onerror=alert(1)>@test.com',
    })
    expect(result.html).not.toContain('<img')
    expect(result.html).toContain('&lt;img')
  })

  it('escapes HTML in subject for XSS prevention', () => {
    const result = renderContactNotification({
      ...validData,
      subject: '"><img src=x>',
    })
    expect(result.html).not.toContain('"><img')
    expect(result.html).toContain('&quot;&gt;&lt;img')
  })

  it('escapes HTML in message for XSS prevention', () => {
    const result = renderContactNotification({
      ...validData,
      message: '<script>alert(1)</script><b>bold</b>',
    })
    expect(result.html).not.toContain('<script>')
    expect(result.html).not.toContain('<b>bold</b>')
    expect(result.html).toContain('&lt;script&gt;')
    expect(result.html).toContain('&lt;b&gt;bold&lt;/b&gt;')
  })

  it('escapes double quotes in email for mailto safety', () => {
    const result = renderContactNotification({
      ...validData,
      email: '"injected"@test.com',
    })
    expect(result.html).toContain('&quot;injected&quot;')
  })

  it('handles multiline messages', () => {
    const result = renderContactNotification({
      ...validData,
      message: 'Line 1\nLine 2\nLine 3',
    })
    expect(result.html).toContain('Line 1')
    expect(result.html).toContain('Line 2')
    expect(result.text).toContain('Line 1')
    expect(result.text).toContain('Line 2')
  })

  it('html includes the email title with subject', () => {
    const result = renderContactNotification(validData)
    expect(result.html).toContain('Contact Form Submission')
  })

  it('preview text includes the subject', () => {
    const result = renderContactNotification(validData)
    expect(result.html).toContain('New contact: Product Inquiry')
  })

  it('handles ampersands in user input', () => {
    const result = renderContactNotification({
      ...validData,
      name: 'Tom & Jerry',
      subject: 'Q&A',
    })
    expect(result.html).toContain('Tom &amp; Jerry')
    expect(result.html).toContain('Q&amp;A')
  })

  it('handles empty string values', () => {
    const result = renderContactNotification({
      email: '',
      message: '',
      name: '',
      subject: '',
    })
    expect(result.html).toBeDefined()
    expect(result.text).toBeDefined()
    expect(typeof result.html).toBe('string')
    expect(typeof result.text).toBe('string')
  })
})

// ---------------------------------------------------------------------------
// renderEmailVerification
// ---------------------------------------------------------------------------
describe('renderEmailVerification', () => {
  const verifyUrl = 'https://app.vibekit.com/verify-email?token=abc123&uid=xyz'

  it('returns both html and text properties', () => {
    const result = renderEmailVerification(verifyUrl)
    expect(result).toHaveProperty('html')
    expect(result).toHaveProperty('text')
  })

  it('html and text are non-empty strings', () => {
    const result = renderEmailVerification(verifyUrl)
    expect(typeof result.html).toBe('string')
    expect(result.html.length).toBeGreaterThan(0)
    expect(typeof result.text).toBe('string')
    expect(result.text.length).toBeGreaterThan(0)
  })

  it('html contains the verify URL in the button href', () => {
    const result = renderEmailVerification(verifyUrl)
    expect(result.html).toContain(
      'href="https://app.vibekit.com/verify-email?token=abc123&amp;uid=xyz"'
    )
  })

  it('html contains "Verify Email" button text', () => {
    const result = renderEmailVerification(verifyUrl)
    expect(result.html).toContain('Verify Email')
  })

  it('html contains a fallback link with the URL', () => {
    const result = renderEmailVerification(verifyUrl)
    const escapedUrl = 'https://app.vibekit.com/verify-email?token=abc123&amp;uid=xyz'
    expect(result.html).toContain(escapedUrl)
    const urlOccurrences = (
      result.html.match(
        new RegExp(escapedUrl.replace(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`), 'g')
      ) || []
    ).length
    expect(urlOccurrences).toBeGreaterThanOrEqual(2)
  })

  it('html includes the email title', () => {
    const result = renderEmailVerification(verifyUrl)
    expect(result.html).toContain('Verify Your Email')
  })

  it('html includes preview text', () => {
    const result = renderEmailVerification(verifyUrl)
    expect(result.html).toContain('Verify your Vibekit email address')
  })

  it('html includes "ignore this email" safety message', () => {
    const result = renderEmailVerification(verifyUrl)
    expect(result.html).toContain("didn't create an account")
  })

  it('text version contains the verify URL', () => {
    const result = renderEmailVerification(verifyUrl)
    expect(result.text).toContain(verifyUrl)
  })

  it('text version does not contain HTML tags', () => {
    const result = renderEmailVerification(verifyUrl)
    expect(result.text).not.toContain('<a')
    expect(result.text).not.toContain('<p')
    expect(result.text).not.toContain('<table')
  })

  it('text version contains "ignore this email" message', () => {
    const result = renderEmailVerification(verifyUrl)
    expect(result.text).toContain("didn't create an account")
  })

  it('uses userName when provided', () => {
    const result = renderEmailVerification(verifyUrl, 'Alice')
    expect(result.html).toContain('Alice')
    expect(result.text).toContain('Alice')
    expect(result.html).toContain('Hi Alice')
    expect(result.text).toContain('Hi Alice')
  })

  it('defaults to "there" when userName is omitted', () => {
    const result = renderEmailVerification(verifyUrl)
    expect(result.html).toContain('Hi there')
    expect(result.text).toContain('Hi there')
  })

  it('defaults to "there" when userName is undefined', () => {
    const result = renderEmailVerification(verifyUrl, undefined)
    expect(result.html).toContain('Hi there')
  })

  it('escapes userName in html for XSS prevention', () => {
    const result = renderEmailVerification(verifyUrl, '<script>alert(1)</script>')
    expect(result.html).not.toContain('<script>')
    expect(result.html).toContain('&lt;script&gt;')
  })

  it('escapes userName with double quotes in html', () => {
    const result = renderEmailVerification(verifyUrl, 'Alice "The Great"')
    expect(result.html).toContain('Alice &quot;The Great&quot;')
  })

  it('escapes ampersands in userName', () => {
    const result = renderEmailVerification(verifyUrl, 'Tom & Jerry')
    expect(result.html).toContain('Tom &amp; Jerry')
  })

  it('escapes URL with query parameters in html', () => {
    const result = renderEmailVerification('https://app.com/verify?a=1&b=2')
    expect(result.html).toContain('https://app.com/verify?a=1&amp;b=2')
  })

  it('text version uses the same escaped greeting as html', () => {
    const result = renderEmailVerification(verifyUrl, 'Alice & Bob')
    expect(result.text).toContain('Alice &amp; Bob')
  })

  it('text version does not escape URL ampersands', () => {
    const result = renderEmailVerification('https://app.com/verify?a=1&b=2')
    expect(result.text).toContain('https://app.com/verify?a=1&b=2')
    expect(result.text).not.toContain('&amp;')
  })

  it('handles URL with special characters', () => {
    const url = 'https://app.com/verify?token=abc<>&"xyz'
    const result = renderEmailVerification(url)
    expect(result.html).toContain('abc&lt;&gt;&amp;&quot;xyz')
  })
})

// ---------------------------------------------------------------------------
// renderNewsletterConfirm
// ---------------------------------------------------------------------------
describe('renderNewsletterConfirm', () => {
  const confirmUrl = 'https://app.vibekit.com/newsletter/confirm?token=news456'

  it('returns both html and text properties', () => {
    const result = renderNewsletterConfirm(confirmUrl)
    expect(result).toHaveProperty('html')
    expect(result).toHaveProperty('text')
  })

  it('html and text are non-empty strings', () => {
    const result = renderNewsletterConfirm(confirmUrl)
    expect(typeof result.html).toBe('string')
    expect(result.html.length).toBeGreaterThan(0)
    expect(typeof result.text).toBe('string')
    expect(result.text.length).toBeGreaterThan(0)
  })

  it('html contains "Confirm Subscription" button text', () => {
    const result = renderNewsletterConfirm(confirmUrl)
    expect(result.html).toContain('Confirm Subscription')
  })

  it('html contains the confirm URL in href', () => {
    const result = renderNewsletterConfirm(confirmUrl)
    expect(result.html).toContain(`href="${confirmUrl}"`)
  })

  it('html includes fallback link with the URL', () => {
    const result = renderNewsletterConfirm(confirmUrl)
    const urlPattern = confirmUrl.replace(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`)
    const urlOccurrences = (result.html.match(new RegExp(urlPattern, 'g')) || []).length
    expect(urlOccurrences).toBeGreaterThanOrEqual(2)
  })

  it('html includes the email title', () => {
    const result = renderNewsletterConfirm(confirmUrl)
    expect(result.html).toContain('Confirm Your Subscription')
  })

  it('html includes preview text', () => {
    const result = renderNewsletterConfirm(confirmUrl)
    expect(result.html).toContain('Confirm your Vibekit newsletter subscription')
  })

  it('html mentions Vibekit newsletter', () => {
    const result = renderNewsletterConfirm(confirmUrl)
    expect(result.html).toContain('Vibekit newsletter')
  })

  it('html includes "ignore this email" safety message', () => {
    const result = renderNewsletterConfirm(confirmUrl)
    expect(result.html).toContain("didn't subscribe")
  })

  it('text version contains the confirm URL', () => {
    const result = renderNewsletterConfirm(confirmUrl)
    expect(result.text).toContain(confirmUrl)
  })

  it('text version does not contain HTML tags', () => {
    const result = renderNewsletterConfirm(confirmUrl)
    expect(result.text).not.toContain('<a')
    expect(result.text).not.toContain('<p')
    expect(result.text).not.toContain('<table')
  })

  it('text version contains "ignore this email" message', () => {
    const result = renderNewsletterConfirm(confirmUrl)
    expect(result.text).toContain("didn't subscribe")
  })

  it('text version mentions Vibekit newsletter', () => {
    const result = renderNewsletterConfirm(confirmUrl)
    expect(result.text).toContain('Vibekit newsletter')
  })

  it('escapes ampersands in URL for html', () => {
    const result = renderNewsletterConfirm('https://app.com/confirm?token=a&list=b')
    expect(result.html).toContain('token=a&amp;list=b')
  })

  it('text version preserves ampersands in URL', () => {
    const result = renderNewsletterConfirm('https://app.com/confirm?token=a&list=b')
    expect(result.text).toContain('token=a&list=b')
    expect(result.text).not.toContain('&amp;')
  })

  it('escapes URL with angle brackets in html', () => {
    const result = renderNewsletterConfirm('https://app.com/confirm?x=<y>')
    expect(result.html).toContain('&lt;y&gt;')
  })

  it('handles very long URLs', () => {
    const longUrl = 'https://app.com/confirm?' + 'a'.repeat(500)
    const result = renderNewsletterConfirm(longUrl)
    expect(result.html).toContain(longUrl)
    expect(result.text).toContain(longUrl)
  })
})

// ---------------------------------------------------------------------------
// renderPasswordReset
// ---------------------------------------------------------------------------
describe('renderPasswordReset', () => {
  const resetUrl = 'https://app.vibekit.com/reset-password?token=rst789&exp=1h'

  it('returns both html and text properties', () => {
    const result = renderPasswordReset(resetUrl)
    expect(result).toHaveProperty('html')
    expect(result).toHaveProperty('text')
  })

  it('html and text are non-empty strings', () => {
    const result = renderPasswordReset(resetUrl)
    expect(typeof result.html).toBe('string')
    expect(result.html.length).toBeGreaterThan(0)
    expect(typeof result.text).toBe('string')
    expect(result.text.length).toBeGreaterThan(0)
  })

  it('html contains "Reset Password" button text', () => {
    const result = renderPasswordReset(resetUrl)
    expect(result.html).toContain('Reset Password')
  })

  it('html contains the reset URL in href', () => {
    const result = renderPasswordReset(resetUrl)
    expect(result.html).toContain(
      'href="https://app.vibekit.com/reset-password?token=rst789&amp;exp=1h"'
    )
  })

  it('html includes fallback link with the URL', () => {
    const result = renderPasswordReset(resetUrl)
    const escapedUrl = 'https://app.vibekit.com/reset-password?token=rst789&amp;exp=1h'
    expect(result.html).toContain(escapedUrl)
    const urlOccurrences = (
      result.html.match(
        new RegExp(escapedUrl.replace(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`), 'g')
      ) || []
    ).length
    expect(urlOccurrences).toBeGreaterThanOrEqual(2)
  })

  it('html includes the email title', () => {
    const result = renderPasswordReset(resetUrl)
    expect(result.html).toContain('Reset Your Password')
  })

  it('html includes preview text', () => {
    const result = renderPasswordReset(resetUrl)
    expect(result.html).toContain('Reset your Vibekit password')
  })

  it('html mentions 1-hour expiry', () => {
    const result = renderPasswordReset(resetUrl)
    expect(result.html).toContain('1 hour')
  })

  it('html includes "ignore this email" safety message', () => {
    const result = renderPasswordReset(resetUrl)
    expect(result.html).toContain("didn't request a password reset")
  })

  it('text version contains the reset URL', () => {
    const result = renderPasswordReset(resetUrl)
    expect(result.text).toContain(resetUrl)
  })

  it('text version does not contain HTML tags', () => {
    const result = renderPasswordReset(resetUrl)
    expect(result.text).not.toContain('<a')
    expect(result.text).not.toContain('<p')
    expect(result.text).not.toContain('<table')
  })

  it('text version mentions 1-hour expiry', () => {
    const result = renderPasswordReset(resetUrl)
    expect(result.text).toContain('1 hour')
  })

  it('text version includes "ignore this email" message', () => {
    const result = renderPasswordReset(resetUrl)
    expect(result.text).toContain("didn't request")
  })

  it('uses userName when provided', () => {
    const result = renderPasswordReset(resetUrl, 'Bob')
    expect(result.html).toContain('Bob')
    expect(result.text).toContain('Bob')
    expect(result.html).toContain('Hi Bob')
  })

  it('defaults to "there" when userName is omitted', () => {
    const result = renderPasswordReset(resetUrl)
    expect(result.html).toContain('Hi there')
    expect(result.text).toContain('Hi there')
  })

  it('defaults to "there" when userName is undefined', () => {
    const result = renderPasswordReset(resetUrl, undefined)
    expect(result.html).toContain('Hi there')
  })

  it('escapes userName in html for XSS prevention', () => {
    const result = renderPasswordReset(resetUrl, '<script>alert(1)</script>')
    expect(result.html).not.toContain('<script>')
    expect(result.html).toContain('&lt;script&gt;')
  })

  it('escapes userName with double quotes in html', () => {
    const result = renderPasswordReset(resetUrl, 'Eve "Hacker"')
    expect(result.html).toContain('Eve &quot;Hacker&quot;')
  })

  it('escapes ampersands in userName', () => {
    const result = renderPasswordReset(resetUrl, 'Alice & Bob')
    expect(result.html).toContain('Alice &amp; Bob')
  })

  it('escapes URL ampersands in html', () => {
    const result = renderPasswordReset('https://app.com/reset?token=x&expires=y')
    expect(result.html).toContain('token=x&amp;expires=y')
  })

  it('text version uses the same escaped greeting as html', () => {
    const result = renderPasswordReset(resetUrl, 'Alice & Bob')
    expect(result.text).toContain('Alice &amp; Bob')
  })

  it('text version does not escape URL ampersands', () => {
    const result = renderPasswordReset('https://app.com/reset?a=1&b=2')
    expect(result.text).toContain('a=1&b=2')
    expect(result.text).not.toContain('&amp;')
  })

  it('handles URL with XSS attempt', () => {
    const result = renderPasswordReset('https://app.com/reset"><script>alert(1)</script>')
    expect(result.html).toContain('&quot;&gt;&lt;script&gt;')
    expect(result.html).not.toContain('"><script>')
  })
})

// ---------------------------------------------------------------------------
// renderWelcome
// ---------------------------------------------------------------------------
describe('renderWelcome', () => {
  it('returns both html and text properties', () => {
    const result = renderWelcome('Alice')
    expect(result).toHaveProperty('html')
    expect(result).toHaveProperty('text')
  })

  it('html and text are non-empty strings', () => {
    const result = renderWelcome('Alice')
    expect(typeof result.html).toBe('string')
    expect(result.html.length).toBeGreaterThan(0)
    expect(typeof result.text).toBe('string')
    expect(result.text.length).toBeGreaterThan(0)
  })

  it('html includes the email title', () => {
    const result = renderWelcome('Alice')
    expect(result.html).toContain('Welcome to Vibekit')
  })

  it('html includes preview text with user name', () => {
    const result = renderWelcome('Alice')
    expect(result.html).toContain('Welcome aboard, Alice')
  })

  it('html contains the user name', () => {
    const result = renderWelcome('Alice')
    expect(result.html).toContain('Alice')
  })

  it('html contains "Welcome to Vibekit" greeting', () => {
    const result = renderWelcome('Alice')
    expect(result.html).toContain('Welcome to Vibekit, Alice')
  })

  it('html includes all three getting-started items', () => {
    const result = renderWelcome('Alice')
    expect(result.html).toContain('Complete your profile')
    expect(result.html).toContain('Explore the dashboard')
    expect(result.html).toContain('Check out the blog')
  })

  it('html includes the "Go to Dashboard" button', () => {
    const result = renderWelcome('Alice')
    expect(result.html).toContain('Go to Dashboard')
  })

  it('html dashboard button links to /app/dashboard', () => {
    const result = renderWelcome('Alice')
    expect(result.html).toContain('href="/app/dashboard"')
  })

  it('html uses checkmark character for list items', () => {
    const result = renderWelcome('Alice')
    expect(result.html).toContain('&#10003;')
  })

  it('text version contains the user name', () => {
    const result = renderWelcome('Bob')
    expect(result.text).toContain('Bob')
  })

  it('text version mentions account is ready', () => {
    const result = renderWelcome('Alice')
    expect(result.text).toContain('account is ready')
  })

  it('text version mentions dashboard', () => {
    const result = renderWelcome('Alice')
    expect(result.text).toContain('dashboard')
  })

  it('text version does not contain HTML tags', () => {
    const result = renderWelcome('Alice')
    expect(result.text).not.toContain('<a')
    expect(result.text).not.toContain('<p')
    expect(result.text).not.toContain('<table')
    expect(result.text).not.toContain('&#10003;')
  })

  it('escapes userName in html for XSS prevention', () => {
    const result = renderWelcome('<img src=x onerror=alert(1)>')
    expect(result.html).not.toContain('<img')
    expect(result.html).toContain('&lt;img')
  })

  it('escapes double quotes in userName', () => {
    const result = renderWelcome('Alice "The Dev"')
    expect(result.html).toContain('Alice &quot;The Dev&quot;')
  })

  it('escapes ampersands in userName', () => {
    const result = renderWelcome('Tom & Jerry')
    expect(result.html).toContain('Tom &amp; Jerry')
  })

  it('escapes angle brackets in userName', () => {
    const result = renderWelcome('user<b>bold</b>')
    expect(result.html).not.toContain('<b>')
    expect(result.html).toContain('&lt;b&gt;')
  })

  it('text version does not escape userName', () => {
    const result = renderWelcome('Alice & Bob "The Devs" <3')
    expect(result.text).toContain('Alice & Bob "The Devs" <3')
  })

  it('handles userName with unicode characters', () => {
    const result = renderWelcome('Ali Öztürk')
    expect(result.html).toContain('Ali Öztürk')
    expect(result.text).toContain('Ali Öztürk')
  })

  it('handles userName with emoji', () => {
    const result = renderWelcome('Alice 👋')
    expect(result.html).toContain('Alice 👋')
    expect(result.text).toContain('Alice 👋')
  })

  it('handles empty userName', () => {
    const result = renderWelcome('')
    expect(result.html).toBeDefined()
    expect(result.text).toBeDefined()
    expect(result.html).toContain('Welcome to Vibekit, ')
  })
})

// ---------------------------------------------------------------------------
// Cross-cutting concerns
// ---------------------------------------------------------------------------
describe('cross-cutting email template concerns', () => {
  it('all templates produce valid HTML with DOCTYPE', () => {
    const results = [
      renderContactNotification({
        email: 'a@b.com',
        message: 'hi',
        name: 'Test',
        subject: 'Test',
      }),
      renderEmailVerification('https://verify.com'),
      renderNewsletterConfirm('https://confirm.com'),
      renderPasswordReset('https://reset.com'),
      renderWelcome('Test'),
    ]
    for (const result of results) {
      expect(result.html).toContain('<!DOCTYPE html>')
      expect(result.html).toContain('</html>')
    }
  })

  it('all templates include the Vibekit footer', () => {
    const results = [
      renderContactNotification({
        email: 'a@b.com',
        message: 'hi',
        name: 'Test',
        subject: 'Test',
      }),
      renderEmailVerification('https://verify.com'),
      renderNewsletterConfirm('https://confirm.com'),
      renderPasswordReset('https://reset.com'),
      renderWelcome('Test'),
    ]
    for (const result of results) {
      expect(result.html).toContain('Vibekit')
    }
  })

  it('all templates use table-based layout', () => {
    const results = [
      renderContactNotification({
        email: 'a@b.com',
        message: 'hi',
        name: 'Test',
        subject: 'Test',
      }),
      renderEmailVerification('https://verify.com'),
      renderNewsletterConfirm('https://confirm.com'),
      renderPasswordReset('https://reset.com'),
      renderWelcome('Test'),
    ]
    for (const result of results) {
      expect(result.html).toContain('role="presentation"')
    }
  })

  it('all text versions are free of HTML markup', () => {
    const results = [
      renderContactNotification({
        email: 'a@b.com',
        message: 'hi',
        name: 'Test',
        subject: 'Test',
      }),
      renderEmailVerification('https://verify.com'),
      renderNewsletterConfirm('https://confirm.com'),
      renderPasswordReset('https://reset.com'),
      renderWelcome('Test'),
    ]
    for (const result of results) {
      expect(result.text).not.toMatch(/<[^>]+>/)
    }
  })

  it('templates with URLs escape ampersands in HTML but not in text', () => {
    const url = 'https://app.com/action?a=1&b=2&c=3'
    const templatesWithUrls = [
      renderEmailVerification(url),
      renderNewsletterConfirm(url),
      renderPasswordReset(url),
    ]
    for (const result of templatesWithUrls) {
      expect(result.html).toContain('a=1&amp;b=2&amp;c=3')
      expect(result.html).not.toMatch(/a=1&b=2(?!amp;)/)
      expect(result.text).toContain('a=1&b=2&c=3')
      expect(result.text).not.toContain('&amp;')
    }
  })
})
