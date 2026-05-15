import { renderAccountSuspended } from '$lib/server/email/templates/account-suspended'
import { describe, expect, it } from 'vitest'

describe('renderAccountSuspended', () => {
  it('renders indefinite suspension email', () => {
    const { html, text } = renderAccountSuspended({
      reason: 'Violation of terms of service',
      userName: 'Test User',
    })

    expect(html).toContain('Test User')
    expect(html).toContain('Violation of terms of service')
    expect(html).toContain('indefinite')
    expect(html).not.toContain('temporarily')
    expect(text).toContain('Test User')
    expect(text).toContain('Violation of terms of service')
    expect(text).toContain('indefinite')
  })

  it('renders temporary suspension email with expiry date', () => {
    const { html, text } = renderAccountSuspended({
      expiresAt: '2026-06-01',
      reason: 'Spamming',
      userName: 'John',
    })

    expect(html).toContain('John')
    expect(html).toContain('Spamming')
    expect(html).toContain('2026-06-01')
    expect(html).toContain('temporarily')
    expect(text).toContain('temporary')
    expect(text).toContain('2026-06-01')
  })

  it('includes appeal link when provided', () => {
    const { html, text } = renderAccountSuspended({
      appealUrl: 'https://example.com/appeal',
      reason: 'Policy violation',
    })

    expect(html).toContain('https://example.com/appeal')
    expect(html).toContain('Submit an Appeal')
    expect(text).toContain('https://example.com/appeal')
  })

  it('omits appeal section when no appealUrl', () => {
    const { html, text } = renderAccountSuspended({
      reason: 'Policy violation',
    })

    expect(html).not.toContain('Submit an Appeal')
    expect(text).not.toContain('submit an appeal')
  })

  it('escapes HTML in reason and userName', () => {
    const { html } = renderAccountSuspended({
      reason: '<script>alert("xss")</script>',
      userName: '<b>Evil</b>',
    })

    expect(html).not.toContain('<script>')
    expect(html).not.toContain('<b>')
    expect(html).toContain('&lt;script&gt;')
    expect(html).toContain('&lt;b&gt;')
  })

  it('works without userName', () => {
    const { html, text } = renderAccountSuspended({
      reason: 'Banned for abuse',
    })

    expect(html).toContain('Hi,')
    expect(text).toContain('Hi,')
    expect(html).toContain('Banned for abuse')
  })
})
