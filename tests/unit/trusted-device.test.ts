import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createMockDb } from '../helpers/mock-db'

// Mock schema and DB modules
vi.mock('$lib/server/db/schema', () => ({
  trustedDevice: {
    createdAt: 'created_at',
    expiresAt: 'expires_at',
    id: 'id',
    ipAddress: 'ip_address',
    tokenHash: 'token_hash',
    userAgent: 'user_agent',
    userId: 'user_id',
  },
}))

vi.mock('$lib/server/uuid', () => ({
  uuid: () => 'test-uuid-' + Math.random().toString(36).slice(2, 8),
}))

describe('trusted-device module', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('exports required functions', async () => {
    const mod = await import('$lib/server/trusted-device')
    expect(typeof mod.createTrustedDevice).toBe('function')
    expect(typeof mod.isTrustedDevice).toBe('function')
    expect(typeof mod.revokeTrustedDevice).toBe('function')
    expect(typeof mod.listTrustedDevices).toBe('function')
    expect(typeof mod.revokeAllTrustedDevices).toBe('function')
    expect(typeof mod.getTrustedDeviceCookie).toBe('function')
    expect(typeof mod.clearTrustedDeviceCookie).toBe('function')
    expect(typeof mod.COOKIE_NAME).toBe('string')
  })

  it('createTrustedDevice returns a token', async () => {
    const { createTrustedDevice } = await import('$lib/server/trusted-device')
    const db = createMockDb().db
    const result = await createTrustedDevice(db, {
      ipAddress: '127.0.0.1',
      userAgent: 'Test/1.0',
      userId: 'user-1',
    })
    expect(result.token).toBeDefined()
    expect(typeof result.token).toBe('string')
    expect(result.token.length).toBeGreaterThan(0)
  })

  it('getTrustedDeviceCookie creates correct cookie string', async () => {
    const { getTrustedDeviceCookie, COOKIE_NAME } = await import('$lib/server/trusted-device')
    const cookie = getTrustedDeviceCookie('test-token', true)
    expect(cookie).toContain(`${COOKIE_NAME}=test-token`)
    expect(cookie).toContain('HttpOnly')
    expect(cookie).toContain('Secure')
    expect(cookie).toContain('SameSite=Lax')
  })

  it('clearTrustedDeviceCookie creates deletion cookie', async () => {
    const { clearTrustedDeviceCookie, COOKIE_NAME } = await import('$lib/server/trusted-device')
    const cookie = clearTrustedDeviceCookie(false)
    expect(cookie).toContain(`${COOKIE_NAME}=`)
    expect(cookie).toContain('Max-Age=0')
    expect(cookie).toContain('HttpOnly')
    expect(cookie).not.toContain('Secure')
  })

  it('COOKIE_NAME is vk_trusted_device', async () => {
    const { COOKIE_NAME } = await import('$lib/server/trusted-device')
    expect(COOKIE_NAME).toBe('vk_trusted_device')
  })
})
