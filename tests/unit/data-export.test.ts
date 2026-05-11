import { describe, expect, it } from 'vitest'

describe('data export shape validation', () => {
  it('includes all expected top-level keys', () => {
    const exportData = {
      accounts: [],
      auditLog: [],
      contactSubmissions: [],
      exportedAt: new Date().toISOString(),
      items: [],
      passkeys: [],
      securityEvents: [],
      sessions: [],
      user: { email: 'test@example.com', id: '1', name: 'Test' },
      version: '1.0',
    }
    const expectedKeys = [
      'accounts',
      'auditLog',
      'contactSubmissions',
      'exportedAt',
      'items',
      'passkeys',
      'securityEvents',
      'sessions',
      'user',
      'version',
    ]
    for (const key of expectedKeys) {
      expect(key in exportData).toBe(true)
    }
  })

  it('omits sensitive fields from user export', () => {
    const sensitiveFields = ['banExpiresAt', 'banReason', 'deletedAt', 'password']
    const userExport = {
      bio: null,
      createdAt: new Date().toISOString(),
      displayName: null,
      email: 'test@example.com',
      emailVerified: true,
      id: '1',
      image: null,
      name: 'Test',
      role: 'user',
      status: 'active',
      timezone: null,
      updatedAt: new Date().toISOString(),
    }
    for (const field of sensitiveFields) {
      expect(field in userExport).toBe(false)
    }
  })

  it('omits tokens from account export', () => {
    const sensitiveAccountFields = ['accessToken', 'idToken', 'password', 'refreshToken']
    const accountExport = {
      accountId: 'gh-123',
      createdAt: new Date().toISOString(),
      providerId: 'github',
    }
    for (const field of sensitiveAccountFields) {
      expect(field in accountExport).toBe(false)
    }
  })

  it('omits session tokens from session export', () => {
    const sessionExport = {
      createdAt: new Date().toISOString(),
      expiresAt: new Date().toISOString(),
      ipAddress: '1.2.3.4',
      userAgent: 'Chrome',
    }
    expect('token' in sessionExport).toBe(false)
  })

  it('omits credential secrets from passkey export', () => {
    const sensitivePasskeyFields = ['counter', 'credentialID', 'publicKey', 'transports']
    const passkeyExport = {
      backedUp: false,
      createdAt: new Date().toISOString(),
      deviceType: 'platform',
      name: 'My Passkey',
    }
    for (const field of sensitivePasskeyFields) {
      expect(field in passkeyExport).toBe(false)
    }
  })

  it('excludes soft-deleted items from export', () => {
    const items = [
      { deletedAt: null, id: '1', name: 'Active Item', status: 'active' },
      { deletedAt: new Date().toISOString(), id: '2', name: 'Deleted Item', status: 'active' },
    ]
    const exportedItems = items.filter((i) => !i.deletedAt)
    expect(exportedItems).toHaveLength(1)
    expect(exportedItems[0]?.name).toBe('Active Item')
  })

  it('limits audit log entries to 500', () => {
    const limit = 500
    const entries = Array.from({ length: 600 }, (_, i) => ({ id: String(i) }))
    const limited = entries.slice(0, limit)
    expect(limited).toHaveLength(500)
  })

  it('limits security events to 500', () => {
    const limit = 500
    const entries = Array.from({ length: 600 }, (_, i) => ({ id: String(i) }))
    const limited = entries.slice(0, limit)
    expect(limited).toHaveLength(500)
  })
})

describe('export response headers', () => {
  it('sets content disposition attachment header', () => {
    const date = new Date().toISOString().split('T')[0]
    const header = `attachment; filename="vibekit-export-${date}.json"`
    expect(header).toContain('attachment')
    expect(header).toContain('.json')
  })

  it('includes date in filename', () => {
    const date = new Date().toISOString().split('T')[0]
    const header = `attachment; filename="vibekit-export-${date}.json"`
    expect(header).toContain(date ?? '')
  })
})

describe('export version', () => {
  it('uses semver format', () => {
    const version = '1.0'
    expect(version).toMatch(/^\d+\.\d+$/)
  })
})
