import { isNewDevice, type SecurityEventType } from '$lib/server/services/security-events'
import { describe, expect, it } from 'vitest'

describe('isNewDevice', () => {
  it('returns false when currentIP is empty', () => {
    expect(isNewDevice(['1.2.3.4'], '')).toBe(false)
  })

  it('returns true when knownIPs is empty', () => {
    expect(isNewDevice([], '1.2.3.4')).toBe(true)
  })

  it('returns true when IP is not in known list', () => {
    expect(isNewDevice(['1.2.3.4', '5.6.7.8'], '9.10.11.12')).toBe(true)
  })

  it('returns false when IP is in known list', () => {
    expect(isNewDevice(['1.2.3.4', '5.6.7.8'], '1.2.3.4')).toBe(false)
  })

  it('returns false when IP matches last entry', () => {
    expect(isNewDevice(['1.2.3.4'], '1.2.3.4')).toBe(false)
  })

  it('handles IPv6 addresses', () => {
    expect(isNewDevice(['::1', '2001:db8::1'], '::1')).toBe(false)
    expect(isNewDevice(['::1'], '2001:db8::2')).toBe(true)
  })
})

describe('SecurityEventType values', () => {
  it('includes login event types', () => {
    const types: SecurityEventType[] = ['login', 'login_failed', 'logout']
    expect(types).toHaveLength(3)
  })

  it('includes security alert event types', () => {
    const types: SecurityEventType[] = ['account_locked', 'new_device', 'suspicious_login']
    expect(types).toHaveLength(3)
  })

  it('includes account change event types', () => {
    const types: SecurityEventType[] = [
      'password_change',
      'two_factor_enabled',
      'two_factor_disabled',
      'passkey_added',
      'passkey_removed',
    ]
    expect(types).toHaveLength(5)
  })

  it('includes social account event types', () => {
    const types: SecurityEventType[] = ['social_account_linked', 'social_account_unlinked']
    expect(types).toHaveLength(2)
  })
})

describe('security-events module structure', () => {
  it('exports writeSecurityEvent function', async () => {
    const mod = await import('$lib/server/services/security-events')
    expect(typeof mod.writeSecurityEvent).toBe('function')
  })

  it('exports getSecurityEvents function', async () => {
    const mod = await import('$lib/server/services/security-events')
    expect(typeof mod.getSecurityEvents).toBe('function')
  })

  it('exports isNewDevice function', async () => {
    const mod = await import('$lib/server/services/security-events')
    expect(typeof mod.isNewDevice).toBe('function')
  })
})
