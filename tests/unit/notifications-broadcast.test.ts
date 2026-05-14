import {
  createBroadcast,
  createNotification,
  getNotificationPreferences,
  setNotificationPreference,
} from '$lib/server/notifications'
import type { DrizzleDb } from '$lib/server/services/types'
import { describe, expect, it, vi } from 'vitest'

function createMockDb(
  overrides: Record<string, unknown> = {}
): DrizzleDb & { _insertValues: ReturnType<typeof vi.fn> } {
  const _insertValues = vi.fn().mockResolvedValue(undefined)
  return {
    _insertValues,
    insert: vi.fn().mockReturnValue({
      values: _insertValues,
    }),
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          get: vi.fn().mockResolvedValue(null),
        }),
      }),
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue({ rowsAffected: 1 }),
      }),
    }),
    ...overrides,
  } as unknown as DrizzleDb & { _insertValues: ReturnType<typeof vi.fn> }
}

describe('createNotification', () => {
  it('inserts notification when preference is enabled (default)', async () => {
    // Default: no preference row = enabled
    const db = createMockDb()
    await createNotification(db, {
      title: 'Test notification',
      type: 'info',
      userId: 'user-1',
    })

    expect(db.insert).toHaveBeenCalled()
  })

  it('skips insert when preference is disabled', async () => {
    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          get: vi.fn().mockResolvedValue({ enabled: false }),
        }),
      }),
    })
    const db = createMockDb({ select: mockSelect })

    await createNotification(db, {
      title: 'Test notification',
      type: 'info',
      userId: 'user-1',
    })

    // Insert should NOT be called because preference is disabled
    expect(db.insert).not.toHaveBeenCalled()
  })

  it('uses default values for optional fields', async () => {
    const db = createMockDb()
    await createNotification(db, {
      title: 'Simple notification',
      userId: 'user-1',
    })

    expect(db._insertValues).toHaveBeenCalled()
    const values = db._insertValues.mock.calls[0][0]
    expect(values.type).toBe('info')
    expect(values.body).toBeNull()
  })

  it('passes all provided fields', async () => {
    const db = createMockDb()
    await createNotification(db, {
      body: 'Notification body',
      entityId: 'entity-1',
      entityType: 'blog_post',
      link: '/blog/post',
      metadata: { key: 'value' },
      title: 'Rich notification',
      type: 'success',
      userId: 'user-1',
    })

    expect(db._insertValues).toHaveBeenCalled()
    const values = db._insertValues.mock.calls[0][0]
    expect(values.title).toBe('Rich notification')
    expect(values.type).toBe('success')
    expect(values.body).toBe('Notification body')
    expect(values.entityId).toBe('entity-1')
    expect(values.link).toBe('/blog/post')
    expect(values.metadata).toBe(JSON.stringify({ key: 'value' }))
  })
})

describe('createBroadcast', () => {
  it('sends to all users with enabled preferences', async () => {
    const userIds = ['user-1', 'user-2', 'user-3']
    const getUserIds = vi.fn().mockResolvedValue(userIds)

    // Mock select to return enabled for all users
    let selectCount = 0
    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          get: vi.fn().mockImplementation(() => {
            selectCount++
            // user-2 has disabled broadcast
            if (selectCount === 2) return { enabled: false }
            return { enabled: true }
          }),
        }),
      }),
    })
    const db = createMockDb({ select: mockSelect })

    const count = await createBroadcast(db, { title: 'Broadcast', target: 'all' }, getUserIds)

    expect(count).toBe(2) // user-1 and user-3
    expect(getUserIds).toHaveBeenCalledWith('all')
  })

  it('sends to admin users when target is admins', async () => {
    const adminIds = ['admin-1', 'admin-2']
    const getUserIds = vi.fn().mockResolvedValue(adminIds)

    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          get: vi.fn().mockResolvedValue({ enabled: true }),
        }),
      }),
    })
    const db = createMockDb({ select: mockSelect })

    const count = await createBroadcast(
      db,
      { title: 'Admin broadcast', target: 'admins' },
      getUserIds
    )

    expect(count).toBe(2)
    expect(getUserIds).toHaveBeenCalledWith('admins')
  })

  it('defaults to enabled when no preference exists', async () => {
    const userIds = ['user-1']
    const getUserIds = vi.fn().mockResolvedValue(userIds)

    // No preference row returns null → default to enabled
    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          get: vi.fn().mockResolvedValue(null),
        }),
      }),
    })
    const db = createMockDb({ select: mockSelect })

    const count = await createBroadcast(db, { title: 'Broadcast', target: 'all' }, getUserIds)

    expect(count).toBe(1)
  })

  it('returns 0 when all users have disabled broadcast', async () => {
    const userIds = ['user-1', 'user-2']
    const getUserIds = vi.fn().mockResolvedValue(userIds)

    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          get: vi.fn().mockResolvedValue({ enabled: false }),
        }),
      }),
    })
    const db = createMockDb({ select: mockSelect })

    const count = await createBroadcast(db, { title: 'Broadcast', target: 'all' }, getUserIds)

    expect(count).toBe(0)
    // Insert should not be called
    expect(db.insert).not.toHaveBeenCalled()
  })

  it('sets entityType to broadcast on all notifications', async () => {
    const userIds = ['user-1']
    const getUserIds = vi.fn().mockResolvedValue(userIds)

    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          get: vi.fn().mockResolvedValue(null),
        }),
      }),
    })
    const db = createMockDb({ select: mockSelect })

    await createBroadcast(
      db,
      { body: 'Body text', title: 'Broadcast', type: 'warning' },
      getUserIds
    )

    expect(db._insertValues).toHaveBeenCalled()
    // Broadcast passes an array of values to insert().values()
    const inserted = db._insertValues.mock.calls[0][0]
    expect(inserted).toBeDefined()
    const values = Array.isArray(inserted) ? inserted[0] : inserted
    expect(values.entityType).toBe('broadcast')
    expect(values.title).toBe('Broadcast')
    expect(values.body).toBe('Body text')
    expect(values.type).toBe('warning')
  })
})

describe('getNotificationPreferences', () => {
  it('returns user preferences', async () => {
    const mockPrefs = [
      { channel: 'in_app', enabled: true, type: 'general' },
      { channel: 'in_app', enabled: false, type: 'broadcast' },
    ]
    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(mockPrefs),
      }),
    })
    const db = createMockDb({ select: mockSelect })

    const prefs = await getNotificationPreferences(db, 'user-1')
    expect(prefs).toEqual(mockPrefs)
  })
})

describe('setNotificationPreference', () => {
  it('updates existing preference', async () => {
    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          get: vi.fn().mockResolvedValue({ id: 'pref-1' }),
        }),
      }),
    })
    const db = createMockDb({ select: mockSelect })

    await setNotificationPreference(db, {
      channel: 'in_app',
      enabled: false,
      type: 'broadcast',
      userId: 'user-1',
    })

    expect(db.update).toHaveBeenCalled()
  })

  it('creates new preference when none exists', async () => {
    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          get: vi.fn().mockResolvedValue(null),
        }),
      }),
    })
    const db = createMockDb({ select: mockSelect })

    await setNotificationPreference(db, {
      channel: 'in_app',
      enabled: true,
      type: 'general',
      userId: 'user-1',
    })

    expect(db.insert).toHaveBeenCalled()
  })
})
