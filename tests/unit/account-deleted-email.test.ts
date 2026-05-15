import { renderAccountDeleted } from '$lib/server/email/templates/account-deleted'
import { describe, expect, it } from 'vitest'

describe('renderAccountDeleted', () => {
  const baseData = {
    reactivationUrl: 'https://vibekit.com/reactivate',
  }

  it('renders without user name', () => {
    const { html, text } = renderAccountDeleted(baseData)

    expect(html).toContain('there')
    expect(html).toContain('deleted')
    expect(html).toContain('30 days')
    expect(html).toContain('https://vibekit.com/reactivate')
    expect(html).toContain('Reactivate Account')

    expect(text).toContain('deleted')
    expect(text).toContain('30 days')
    expect(text).toContain('https://vibekit.com/reactivate')
  })

  it('renders with user name', () => {
    const { html, text } = renderAccountDeleted({
      ...baseData,
      userName: 'Jane Doe',
    })

    expect(html).toContain('Jane Doe')
    expect(text).toContain('Jane Doe')
  })

  it('escapes HTML in user name and URL', () => {
    const { html } = renderAccountDeleted({
      reactivationUrl: 'https://vibekit.com/reactivate?token=<script>alert(1)</script>',
      userName: '<b>Evil</b>',
    })

    expect(html).not.toContain('<script>')
    expect(html).toContain('&lt;script&gt;')
    expect(html).toContain('&lt;b&gt;')
  })

  it('mentions permanent deletion after retention', () => {
    const { html, text } = renderAccountDeleted(baseData)

    expect(html).toContain('permanently deleted')
    expect(text).toContain('permanently deleted')
  })

  it('includes fallback link for button', () => {
    const { html } = renderAccountDeleted(baseData)

    expect(html).toContain('copy and paste this link')
  })
})
