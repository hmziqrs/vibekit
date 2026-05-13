import { describe, expect, it, vi } from 'vitest'

vi.mock('$lib/server/db/schema', () => ({
  auditLog: {
    action: 'action',
    entityId: 'entityId',
    entityType: 'entityType',
    metadata: 'metadata',
    userId: 'userId',
  },
}))

describe('audit service', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  describe('writeAuditLog', () => {
    it('inserts audit log entry with all fields', async () => {
      const { writeAuditLog } = await import('$lib/server/audit')
      const insertFn = vi.fn().mockReturnValue({ values: vi.fn().mockResolvedValue(undefined) })
      const db = { insert: insertFn } as never

      await writeAuditLog(db, {
        action: 'user.login',
        entityId: 'user-1',
        entityType: 'user',
        metadata: { ip: '1.2.3.4' },
        userId: 'user-1',
      })

      expect(insertFn).toHaveBeenCalled()
      const valuesFn = insertFn.mock.results[0].value.values
      expect(valuesFn).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'user.login',
          entityId: 'user-1',
          entityType: 'user',
          metadata: JSON.stringify({ ip: '1.2.3.4' }),
          userId: 'user-1',
        })
      )
    })

    it('sets metadata to null when not provided', async () => {
      const { writeAuditLog } = await import('$lib/server/audit')
      const insertFn = vi.fn().mockReturnValue({ values: vi.fn().mockResolvedValue(undefined) })
      const db = { insert: insertFn } as never

      await writeAuditLog(db, {
        action: 'item.create',
        entityId: 'item-1',
        entityType: 'item',
        userId: 'user-1',
      })

      const valuesFn = insertFn.mock.results[0].value.values
      expect(valuesFn).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: null,
        })
      )
    })

    it('serializes complex metadata to JSON', async () => {
      const { writeAuditLog } = await import('$lib/server/audit')
      const insertFn = vi.fn().mockReturnValue({ values: vi.fn().mockResolvedValue(undefined) })
      const db = { insert: insertFn } as never

      const complexMetadata = {
        changes: { name: { from: 'Old', to: 'New' } },
        nested: { deep: { value: true } },
      }

      await writeAuditLog(db, {
        action: 'item.update',
        entityId: 'item-1',
        entityType: 'item',
        metadata: complexMetadata,
        userId: 'user-1',
      })

      const valuesFn = insertFn.mock.results[0].value.values
      const call = valuesFn.mock.calls[0][0]
      expect(JSON.parse(call.metadata)).toEqual(complexMetadata)
    })

    it('handles various action formats', async () => {
      const { writeAuditLog } = await import('$lib/server/audit')
      const insertFn = vi.fn().mockReturnValue({ values: vi.fn().mockResolvedValue(undefined) })
      const db = { insert: insertFn } as never

      const actions = [
        'blog.create',
        'blog.publish',
        'admin.user.ban',
        'api.key.rotate',
        'auth.login',
      ]

      for (const action of actions) {
        await writeAuditLog(db, {
          action,
          entityId: 'test',
          entityType: 'test',
          userId: 'user-1',
        })
      }

      expect(insertFn).toHaveBeenCalledTimes(5)
    })
  })
})
