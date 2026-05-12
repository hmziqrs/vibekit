import { describe, expect, it, vi } from 'vitest'

function createMockDb() {
  const valuesFn = vi.fn<() => Promise<void>>().mockResolvedValue(undefined)
  const insertFn = vi.fn<() => { values: typeof valuesFn }>().mockReturnValue({ values: valuesFn })

  return {
    _insertFn: insertFn,
    _valuesFn: valuesFn,
    insert: insertFn,
  } as unknown as import('$lib/server/services/types').AppDb
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
    const db = createMockDb()

    await writeAuditLog(db, {
      action: 'user.login',
      entityId: 'user-123',
      entityType: 'user',
      userId: 'user-123',
    })

    expect(db._insertFn).toHaveBeenCalledTimes(1)
    expect(db._valuesFn).toHaveBeenCalledTimes(1)
    const values = db._valuesFn.mock.calls[0][0] as Record<string, unknown>
    expect(values.action).toBe('user.login')
    expect(values.entityId).toBe('user-123')
    expect(values.entityType).toBe('user')
    expect(values.userId).toBe('user-123')
    expect(values.metadata).toBeNull()
  })

  it('stringifies metadata when provided', async () => {
    const { writeAuditLog } = await import('$lib/server/audit')
    const db = createMockDb()

    await writeAuditLog(db, {
      action: 'item.delete',
      entityId: 'item-456',
      entityType: 'item',
      metadata: { reason: 'spam', reportedBy: 'admin' },
      userId: 'admin-1',
    })

    const values = db._valuesFn.mock.calls[0][0] as Record<string, unknown>
    expect(values.metadata).toBe('{"reason":"spam","reportedBy":"admin"}')
  })

  it('sets metadata to null when not provided', async () => {
    const { writeAuditLog } = await import('$lib/server/audit')
    const db = createMockDb()

    await writeAuditLog(db, {
      action: 'page.view',
      entityId: 'page-1',
      entityType: 'page',
      userId: 'user-1',
    })

    const values = db._valuesFn.mock.calls[0][0] as Record<string, unknown>
    expect(values.metadata).toBeNull()
  })
})
