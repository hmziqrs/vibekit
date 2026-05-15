import { renderSecurityAlert } from '$lib/server/email/templates/security-alert'
import { describe, expect, it } from 'vitest'

describe('renderSecurityAlert', () => {
  const baseData = {
    eventTime: '2026-05-15T12:00:00Z',
    eventType: 'new_device' as const,
  }

  it('returns html and text properties', () => {
    const result = renderSecurityAlert(baseData)
    expect(result.html).toBeDefined()
    expect(result.text).toBeDefined()
  })

  it('includes event description in html for new_device', () => {
    const result = renderSecurityAlert(baseData)
    expect(result.html).toContain('A new device signed in to your account.')
  })

  it('includes event description in html for account_locked', () => {
    const result = renderSecurityAlert({ ...baseData, eventType: 'account_locked' })
    expect(result.html).toContain('Your account was locked')
  })

  it('includes event description for password_change', () => {
    const result = renderSecurityAlert({ ...baseData, eventType: 'password_change' })
    expect(result.html).toContain('Your password was changed.')
    expect(result.text).toContain('Your password was changed.')
  })

  it('includes event description for two_factor_change', () => {
    const result = renderSecurityAlert({ ...baseData, eventType: 'two_factor_change' })
    expect(result.html).toContain('Two-factor authentication settings were changed')
  })

  it('includes event time in html and text', () => {
    const result = renderSecurityAlert(baseData)
    expect(result.html).toContain('2026-05-15T12:00:00Z')
    expect(result.text).toContain('Time: 2026-05-15T12:00:00Z')
  })

  it('includes ip address when provided', () => {
    const result = renderSecurityAlert({ ...baseData, ipAddress: '1.2.3.4' })
    expect(result.html).toContain('1.2.3.4')
    expect(result.text).toContain('IP: 1.2.3.4')
  })

  it('omits ip address row when not provided', () => {
    const result = renderSecurityAlert(baseData)
    expect(result.text).not.toContain('IP:')
  })

  it('includes details when provided', () => {
    const result = renderSecurityAlert({ ...baseData, details: 'Chrome on macOS' })
    expect(result.html).toContain('Chrome on macOS')
    expect(result.text).toContain('Details: Chrome on macOS')
  })

  it('includes userName when provided', () => {
    const result = renderSecurityAlert({ ...baseData, userName: 'Alice' })
    expect(result.html).toContain('Alice')
    expect(result.text).toContain('Alice')
  })

  it('greets without name when userName not provided', () => {
    const result = renderSecurityAlert(baseData)
    expect(result.html).toContain('Hi,')
    expect(result.text).toContain('Hi,')
  })

  it('escapes userName in html', () => {
    const result = renderSecurityAlert({ ...baseData, userName: '<script>alert(1)</script>' })
    expect(result.html).not.toContain('<script>')
    expect(result.html).toContain('&lt;script&gt;')
  })

  it('escapes ipAddress in html', () => {
    const result = renderSecurityAlert({ ...baseData, ipAddress: '"><img src=x>' })
    expect(result.html).not.toContain('"><img')
  })

  it('escapes details in html', () => {
    const result = renderSecurityAlert({ ...baseData, details: '<b>bold</b>' })
    expect(result.html).not.toContain('<b>bold</b>')
    expect(result.html).toContain('&lt;b&gt;bold&lt;/b&gt;')
  })

  it('includes security advice text', () => {
    const result = renderSecurityAlert(baseData)
    expect(result.html).toContain('change your password immediately')
    expect(result.text).toContain('change your password immediately')
  })

  it('includes review settings link in html', () => {
    const result = renderSecurityAlert(baseData)
    expect(result.html).toContain('Review Security Settings')
  })

  it('uses correct subject for each event type', () => {
    const newDevice = renderSecurityAlert({ ...baseData, eventType: 'new_device' })
    expect(newDevice.html).toContain('Security alert: New device sign-in')

    const locked = renderSecurityAlert({ ...baseData, eventType: 'account_locked' })
    expect(locked.html).toContain('Security alert: Account locked')

    const pw = renderSecurityAlert({ ...baseData, eventType: 'password_change' })
    expect(pw.html).toContain('Security alert: Password changed')

    const tfa = renderSecurityAlert({ ...baseData, eventType: 'two_factor_change' })
    expect(tfa.html).toContain('Security alert: 2FA settings changed')
  })

  it('text version contains security settings link', () => {
    const result = renderSecurityAlert(baseData)
    expect(result.text).toContain('{{APP_URL}}/app/settings/security')
  })
})
