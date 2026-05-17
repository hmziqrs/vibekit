import { beforeEach, describe, expect, it, type Mock } from 'vitest'

import { createMockDb } from '../helpers/mock-db'

type AuditMockDb = ReturnType<typeof createMockDb>['db'] & {
  _insertFn: Mock
  _valuesFn: Mock
}

describe('audit module', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('exports writeAuditLog function', { timeout: 30_000 }, async () => {
    const mod = await import('$lib/server/audit')
    expect(typeof mod.writeAuditLog).toBe('function')
  })

  it('calls db.insert with correct values', async () => {
    const { writeAuditLog } = await import('$lib/server/audit')
    const { db, mocks } = createMockDb()
    const typedDb = {
      ...db,
      _insertFn: mocks.insertFn,
      _valuesFn: mocks.valuesFn,
    } as unknown as AuditMockDb

    await writeAuditLog(typedDb, {
      action: 'user.login',
      entityId: 'user-123',
      entityType: 'user',
      userId: 'user-123',
    })

    expect(typedDb._insertFn).toHaveBeenCalledTimes(1)
    expect(typedDb._valuesFn).toHaveBeenCalledTimes(1)
    const values = typedDb._valuesFn.mock.calls[0][0] as Record<string, unknown>
    expect(values.action).toBe('user.login')
    expect(values.entityId).toBe('user-123')
    expect(values.entityType).toBe('user')
    expect(values.userId).toBe('user-123')
    expect(values.metadata).toBeNull()
  })

  it('stringifies metadata when provided', async () => {
    const { writeAuditLog } = await import('$lib/server/audit')
    const { db, mocks } = createMockDb()
    const typedDb = {
      ...db,
      _insertFn: mocks.insertFn,
      _valuesFn: mocks.valuesFn,
    } as unknown as AuditMockDb

    await writeAuditLog(typedDb, {
      action: 'item.delete',
      entityId: 'item-456',
      entityType: 'item',
      metadata: { reason: 'spam', reportedBy: 'admin' },
      userId: 'admin-1',
    })

    const values = typedDb._valuesFn.mock.calls[0][0] as Record<string, unknown>
    expect(values.metadata).toBe('{"reason":"spam","reportedBy":"admin"}')
  })

  it('sets metadata to null when not provided', async () => {
    const { writeAuditLog } = await import('$lib/server/audit')
    const { db, mocks } = createMockDb()
    const typedDb = {
      ...db,
      _insertFn: mocks.insertFn,
      _valuesFn: mocks.valuesFn,
    } as unknown as AuditMockDb

    await writeAuditLog(typedDb, {
      action: 'page.view',
      entityId: 'page-1',
      entityType: 'page',
      userId: 'user-1',
    })

    const values = typedDb._valuesFn.mock.calls[0][0] as Record<string, unknown>
    expect(values.metadata).toBeNull()
  })
})
