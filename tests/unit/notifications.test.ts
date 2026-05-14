import type { DrizzleDb } from '$lib/server/services/types'
import { beforeEach, describe, expect, it, vi } from 'vitest'

type MockDb = DrizzleDb & {
  _getFn: ReturnType<typeof vi.fn>
  _insertFn: ReturnType<typeof vi.fn>
  _onConflictDoUpdateFn: ReturnType<typeof vi.fn>
  _valuesFn: ReturnType<typeof vi.fn>
}

function createMockDb(preferenceEnabled = true): MockDb {
  const getFn = vi
    .fn()
    .mockResolvedValue(preferenceEnabled ? { enabled: true } : { enabled: false })

  const onConflictDoUpdateFn = vi.fn<() => Promise<void>>().mockResolvedValue(undefined)
  const valuesFn = vi
    .fn<() => { onConflictDoUpdate: typeof onConflictDoUpdateFn }>()
    .mockReturnValue({ onConflictDoUpdate: onConflictDoUpdateFn })
  const insertFn = vi.fn<() => { values: typeof valuesFn }>().mockReturnValue({ values: valuesFn })

  const selectWhereResult = {
    get: getFn,
  } as Record<string, unknown>
  // Make thenable so bare await resolves to array
  selectWhereResult.then = (resolve: (v: unknown) => void) => Promise.resolve([]).then(resolve)

  return {
    _getFn: getFn,
    _insertFn: insertFn,
    _onConflictDoUpdateFn: onConflictDoUpdateFn,
    _valuesFn: valuesFn,
    insert: insertFn,
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue(selectWhereResult),
      }),
    }),
  } as unknown as MockDb
}

beforeEach(() => {
  vi.resetModules()
})

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
    expect(db._insertFn).toHaveBeenCalledTimes(2)
  })

  it('broadcasts to admins target', async () => {
    const { createBroadcast } = await import('$lib/server/notifications')
    const db = createMockDb()
    const getUserIds = vi.fn().mockResolvedValue(['admin-1', 'admin-2'])

    const count = await createBroadcast(
      db,
      {
        target: 'admins',
        title: 'Admin Notice',
      },
      getUserIds
    )

    expect(getUserIds).toHaveBeenCalledWith('admins')
    expect(count).toBe(2)
    expect(db._insertFn).toHaveBeenCalledTimes(1)
  })

  it('returns 0 when no target users', async () => {
    const { createBroadcast } = await import('$lib/server/notifications')
    const db = createMockDb()
    const getUserIds = vi.fn().mockResolvedValue([])

    const count = await createBroadcast(db, { target: 'all', title: 'Empty' }, getUserIds)

    expect(count).toBe(0)
    expect(db._insertFn).toHaveBeenCalledTimes(0)
  })
})

describe('setNotificationPreference', () => {
  it('uses upsert with onConflictDoUpdate', async () => {
    const { setNotificationPreference } = await import('$lib/server/notifications')
    const db = createMockDb()

    await setNotificationPreference(db, {
      channel: 'in_app',
      enabled: false,
      type: 'billing',
      userId: 'user-1',
    })

    expect(db._insertFn).toHaveBeenCalledTimes(1)
    expect(db._valuesFn).toHaveBeenCalledTimes(1)
    expect(db._onConflictDoUpdateFn).toHaveBeenCalledTimes(1)

    const values = db._valuesFn.mock.calls[0][0] as Record<string, unknown>
    expect(values.channel).toBe('in_app')
    expect(values.enabled).toBe(false)
    expect(values.type).toBe('billing')
    expect(values.userId).toBe('user-1')
  })
})

describe('getNotificationPreferences', () => {
  it('returns preferences for user', async () => {
    const { getNotificationPreferences } = await import('$lib/server/notifications')
    const mockPrefs = [
      { channel: 'in_app', enabled: true, type: 'general' },
      { channel: 'email', enabled: false, type: 'billing' },
    ]
    const db = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(mockPrefs),
        }),
      }),
    } as unknown as DrizzleDb

    const prefs = await getNotificationPreferences(db, 'user-1')

    expect(prefs).toEqual(mockPrefs)
    expect(prefs).toHaveLength(2)
  })

  it('returns empty array when no preferences', async () => {
    const { getNotificationPreferences } = await import('$lib/server/notifications')
    const db = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      }),
    } as unknown as DrizzleDb

    const prefs = await getNotificationPreferences(db, 'user-1')

    expect(prefs).toEqual([])
  })
})
