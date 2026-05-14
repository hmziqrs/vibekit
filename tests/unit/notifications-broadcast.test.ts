import { beforeEach, describe, expect, it, vi } from 'vitest'

function createMockDb(overrides: Record<string, unknown> = {}) {
  const onConflictDoUpdateFn = vi.fn().mockResolvedValue(undefined)
  const _insertValues = vi.fn().mockReturnValue({ onConflictDoUpdate: onConflictDoUpdateFn })
  const _insertFn = vi.fn().mockReturnValue({ values: _insertValues })

  return {
    _insertFn,
    _insertValues,
    _onConflictDoUpdateFn: onConflictDoUpdateFn,
    insert: _insertFn,
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          get: vi.fn().mockResolvedValue(null),
        }),
      }),
    }),
    ...overrides,
  } as unknown
}

beforeEach(() => {
  vi.resetModules()
})

describe('createNotification', () => {
  it('inserts notification when preference is enabled (default)', async () => {
    const { createNotification } = await import('$lib/server/notifications')
    const db = createMockDb()
    await createNotification(db, {
      title: 'Test notification',
      type: 'info',
      userId: 'user-1',
    })

    expect(db.insert).toHaveBeenCalled()
  })

  it('skips insert when preference is disabled', async () => {
    const { createNotification } = await import('$lib/server/notifications')
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

    expect(db.insert).not.toHaveBeenCalled()
  })

  it('uses default values for optional fields', async () => {
    const { createNotification } = await import('$lib/server/notifications')
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
    const { createNotification } = await import('$lib/server/notifications')
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
    const { createBroadcast } = await import('$lib/server/notifications')
    const userIds = ['user-1', 'user-2', 'user-3']
    const getUserIds = vi.fn().mockResolvedValue(userIds)

    // Bulk query returns user-2 as disabled
    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ enabled: false, userId: 'user-2' }]),
      }),
    })
    const db = createMockDb({ select: mockSelect })

    const count = await createBroadcast(db, { title: 'Broadcast', target: 'all' }, getUserIds)

    expect(count).toBe(2) // user-1 and user-3
    expect(getUserIds).toHaveBeenCalledWith('all')
  })

  it('sends to admin users when target is admins', async () => {
    const { createBroadcast } = await import('$lib/server/notifications')
    const adminIds = ['admin-1', 'admin-2']
    const getUserIds = vi.fn().mockResolvedValue(adminIds)

    // No disabled prefs returned = all enabled
    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
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
    const { createBroadcast } = await import('$lib/server/notifications')
    const userIds = ['user-1']
    const getUserIds = vi.fn().mockResolvedValue(userIds)

    // Empty result = no disabled prefs = all enabled
    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      }),
    })
    const db = createMockDb({ select: mockSelect })

    const count = await createBroadcast(db, { title: 'Broadcast', target: 'all' }, getUserIds)

    expect(count).toBe(1)
  })

  it('returns 0 when all users have disabled broadcast', async () => {
    const { createBroadcast } = await import('$lib/server/notifications')
    const userIds = ['user-1', 'user-2']
    const getUserIds = vi.fn().mockResolvedValue(userIds)

    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([
          { enabled: false, userId: 'user-1' },
          { enabled: false, userId: 'user-2' },
        ]),
      }),
    })
    const db = createMockDb({ select: mockSelect })

    const count = await createBroadcast(db, { title: 'Broadcast', target: 'all' }, getUserIds)

    expect(count).toBe(0)
    expect(db.insert).not.toHaveBeenCalled()
  })

  it('sets entityType to broadcast on all notifications', async () => {
    const { createBroadcast } = await import('$lib/server/notifications')
    const userIds = ['user-1']
    const getUserIds = vi.fn().mockResolvedValue(userIds)

    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      }),
    })
    const db = createMockDb({ select: mockSelect })

    await createBroadcast(
      db,
      { body: 'Body text', title: 'Broadcast', type: 'warning' },
      getUserIds
    )

    expect(db._insertValues).toHaveBeenCalled()
    const inserted = db._insertValues.mock.calls[0][0]
    expect(inserted).toBeDefined()
    const values = Array.isArray(inserted) ? inserted[0] : inserted
    expect(values.entityType).toBe('broadcast')
    expect(values.title).toBe('Broadcast')
    expect(values.body).toBe('Body text')
    expect(values.type).toBe('warning')
  })

  it('returns 0 for empty user list', async () => {
    const { createBroadcast } = await import('$lib/server/notifications')
    const db = createMockDb()
    const getUserIds = vi.fn().mockResolvedValue([])

    const count = await createBroadcast(db, { title: 'Empty', target: 'all' }, getUserIds)

    expect(count).toBe(0)
    expect(db.insert).not.toHaveBeenCalled()
  })
})

describe('getNotificationPreferences', () => {
  it('returns user preferences', async () => {
    const { getNotificationPreferences } = await import('$lib/server/notifications')
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
  it('uses upsert via onConflictDoUpdate', async () => {
    const { setNotificationPreference } = await import('$lib/server/notifications')
    const db = createMockDb()

    await setNotificationPreference(db, {
      channel: 'in_app',
      enabled: false,
      type: 'broadcast',
      userId: 'user-1',
    })

    expect(db._insertFn).toHaveBeenCalledTimes(1)
    expect(db._onConflictDoUpdateFn).toHaveBeenCalledTimes(1)

    const values = db._insertValues.mock.calls[0][0] as Record<string, unknown>
    expect(values.channel).toBe('in_app')
    expect(values.enabled).toBe(false)
    expect(values.type).toBe('broadcast')
    expect(values.userId).toBe('user-1')
  })
})
