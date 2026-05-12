import { describe, expect, it, vi } from 'vitest'

function createMockDb(preferenceEnabled = true) {
  const getFn = vi
    .fn()
    .mockResolvedValue(preferenceEnabled ? { enabled: true } : { enabled: false })

  const valuesFn = vi.fn<() => Promise<void>>().mockResolvedValue(undefined)
  const insertFn = vi.fn<() => { values: typeof valuesFn }>().mockReturnValue({ values: valuesFn })
  const setFn = vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) })
  const updateFn = vi
    .fn()
    .mockReturnValue({ set: setFn, where: vi.fn().mockResolvedValue(undefined) })

  return {
    _insertFn: insertFn,
    _setFn: setFn,
    _updateFn: updateFn,
    _valuesFn: valuesFn,
    insert: insertFn,
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          get: getFn,
        }),
      }),
    }),
    update: updateFn,
  } as unknown as import('$lib/server/services/types').AppDb
}

describe('notifications module', () => {
  it('exports createNotification function', async () => {
    const mod = await import('$lib/server/notifications')
    expect(typeof mod.createNotification).toBe('function')
  })

  it('exports createBroadcast function', async () => {
    const mod = await import('$lib/server/notifications')
    expect(typeof mod.createBroadcast).toBe('function')
  })

  it('exports getNotificationPreferences function', async () => {
    const mod = await import('$lib/server/notifications')
    expect(typeof mod.getNotificationPreferences).toBe('function')
  })

  it('exports setNotificationPreference function', async () => {
    const mod = await import('$lib/server/notifications')
    expect(typeof mod.setNotificationPreference).toBe('function')
  })
})

describe('createNotification', () => {
  it('inserts notification when in-app is enabled', async () => {
    const { createNotification } = await import('$lib/server/notifications')
    const db = createMockDb(true)

    await createNotification(db, {
      body: 'You have a new message',
      title: 'New Message',
      type: 'info',
      userId: 'user-1',
    })

    expect(db._insertFn).toHaveBeenCalledTimes(1)
    expect(db._valuesFn).toHaveBeenCalledTimes(1)
  })

  it('skips insert when in-app is disabled', async () => {
    const { createNotification } = await import('$lib/server/notifications')
    const db = createMockDb(false)

    await createNotification(db, {
      title: 'Test',
      userId: 'user-1',
    })

    // insert should not be called for the notification
    expect(db._insertFn).toHaveBeenCalledTimes(0)
  })

  it('defaults type to info', async () => {
    const { createNotification } = await import('$lib/server/notifications')
    const db = createMockDb(true)

    await createNotification(db, {
      title: 'Test',
      userId: 'user-1',
    })

    const values = db._valuesFn.mock.calls[0][0] as Record<string, unknown>
    expect(values.type).toBe('info')
  })

  it('stringifies metadata when provided', async () => {
    const { createNotification } = await import('$lib/server/notifications')
    const db = createMockDb(true)

    await createNotification(db, {
      metadata: { key: 'value' },
      title: 'Test',
      userId: 'user-1',
    })

    const values = db._valuesFn.mock.calls[0][0] as Record<string, unknown>
    expect(values.metadata).toBe('{"key":"value"}')
  })

  it('sets metadata to null when not provided', async () => {
    const { createNotification } = await import('$lib/server/notifications')
    const db = createMockDb(true)

    await createNotification(db, {
      title: 'Test',
      userId: 'user-1',
    })

    const values = db._valuesFn.mock.calls[0][0] as Record<string, unknown>
    expect(values.metadata).toBeNull()
  })
})

describe('createBroadcast', () => {
  it('inserts notifications for all target users', async () => {
    const { createBroadcast } = await import('$lib/server/notifications')
    const db = createMockDb()
    const getUserIds = vi.fn().mockResolvedValue(['user-1', 'user-2', 'user-3'])

    const count = await createBroadcast(
      db,
      {
        body: 'System update',
        target: 'all',
        title: 'Announcement',
        type: 'info',
      },
      getUserIds
    )

    expect(count).toBe(3)
    expect(getUserIds).toHaveBeenCalledWith('all')
    // createBroadcast inserts all 3 in one batch call
    expect(db._insertFn).toHaveBeenCalledTimes(1)
    expect(db._valuesFn).toHaveBeenCalledTimes(1)
  })

  it('inserts in batches of 100', async () => {
    const { createBroadcast } = await import('$lib/server/notifications')
    const db = createMockDb()
    const userIds = Array.from({ length: 150 }, (_, i) => `user-${i}`)
    const getUserIds = vi.fn().mockResolvedValue(userIds)

    const count = await createBroadcast(
      db,
      {
        target: 'all',
        title: 'Bulk',
      },
      getUserIds
    )

    expect(count).toBe(150)
    // 2 insert calls: batch of 100 + batch of 50
    expect(db._insertFn).toHaveBeenCalledTimes(2)
  })
})
