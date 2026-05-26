/* oxlint-disable typescript-eslint/no-explicit-any */
import type { DrizzleDb } from '$lib/server/services/types'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createMockDb } from '../helpers/mock-db'

vi.mock('$lib/server/push', () => ({
  sendPushNotification: vi.fn().mockResolvedValue({ sent: 0, total: 0 }),
}))
vi.mock('$lib/server/integrations/dispatch', () => ({
  dispatchToIntegrations: vi.fn().mockResolvedValue(undefined),
}))

type MockDb = DrizzleDb & {
  _getFn: ReturnType<typeof vi.fn>
  _insertFn: ReturnType<typeof vi.fn>
  _onConflictDoUpdateFn: ReturnType<typeof vi.fn>
  _valuesFn: ReturnType<typeof vi.fn>
}

function createMockDbWithPref(preferenceEnabled = true): MockDb {
  const { db, mocks } = createMockDb({
    getResult: preferenceEnabled ? { enabled: true } : { enabled: false },
  })

  // Make select().from().where() thenable so bare await resolves to array
  const originalWhereFn = mocks.whereFn
  const selectWhereResult = {
    get: mocks.getFn,
  } as Record<string, unknown>
  selectWhereResult.then = (resolve: (v: unknown) => void) => Promise.resolve([]).then(resolve)

  mocks.whereFn.mockReturnValue(selectWhereResult)

  return {
    ...db,
    _getFn: mocks.getFn,
    _insertFn: mocks.insertFn,
    _onConflictDoUpdateFn: mocks.onConflictDoUpdateFn,
    _valuesFn: mocks.valuesFn,
  } as unknown as MockDb
}

beforeEach(() => {
  vi.resetModules()
  vi.clearAllMocks()
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
    const db = createMockDbWithPref(true)

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
    const db = createMockDbWithPref(false)

    await createNotification(db, {
      title: 'Test',
      userId: 'user-1',
    })

    expect(db._insertFn).toHaveBeenCalledTimes(0)
  })

  it('defaults type to info', async () => {
    const { createNotification } = await import('$lib/server/notifications')
    const db = createMockDbWithPref(true)

    await createNotification(db, {
      title: 'Test',
      userId: 'user-1',
    })

    const values = db._valuesFn.mock.calls[0][0] as Record<string, unknown>
    expect(values.type).toBe('info')
  })

  it('stringifies metadata when provided', async () => {
    const { createNotification } = await import('$lib/server/notifications')
    const db = createMockDbWithPref(true)

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
    const db = createMockDbWithPref(true)

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
    const db = createMockDbWithPref()
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
    expect(db._insertFn).toHaveBeenCalledTimes(2) // 1 notification batch + 1 audit log
    expect(db._valuesFn).toHaveBeenCalledTimes(2)
  })

  it('inserts in batches of 100', async () => {
    const { createBroadcast } = await import('$lib/server/notifications')
    const db = createMockDbWithPref()
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
    expect(db._insertFn).toHaveBeenCalledTimes(3) // 2 batches + 1 audit log
  })

  it('broadcasts to admins target', async () => {
    const { createBroadcast } = await import('$lib/server/notifications')
    const db = createMockDbWithPref()
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
    expect(db._insertFn).toHaveBeenCalledTimes(2) // 1 notification batch + 1 audit log
  })

  it('returns 0 when no target users', async () => {
    const { createBroadcast } = await import('$lib/server/notifications')
    const db = createMockDbWithPref()
    const getUserIds = vi.fn().mockResolvedValue([])

    const count = await createBroadcast(db, { target: 'all', title: 'Empty' }, getUserIds)

    expect(count).toBe(0)
    expect(db._insertFn).toHaveBeenCalledTimes(0)
  })
})

describe('setNotificationPreference', () => {
  it('uses upsert with onConflictDoUpdate', async () => {
    const { setNotificationPreference } = await import('$lib/server/notifications')
    const db = createMockDbWithPref()

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

describe('push notification integration', () => {
  it('calls sendPushNotification when push is enabled', async () => {
    const { createNotification } = await import('$lib/server/notifications')
    // In-app enabled (first select), push enabled (second select)
    const getFn = vi
      .fn()
      .mockResolvedValueOnce({ enabled: true }) // in_app check
      .mockResolvedValueOnce({ enabled: true }) // push check
    const db = createMockDbWithPref(true)
    // Override the get function for the push check
    const selectWhereResult: Record<string, unknown> = { get: getFn }
    db.select = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue(selectWhereResult),
      }),
    }) as any

    const { sendPushNotification } = await import('$lib/server/push')

    await createNotification(db, {
      body: 'Test push',
      link: '/test',
      title: 'Push Test',
      userId: 'user-1',
    })

    expect(sendPushNotification).toHaveBeenCalledWith(
      db,
      'user-1',
      expect.objectContaining({
        body: 'Test push',
        title: 'Push Test',
        data: { link: '/test' },
      })
    )
  })

  it('skips push notification when push is disabled', async () => {
    const { createNotification } = await import('$lib/server/notifications')
    const getFn = vi
      .fn()
      .mockResolvedValueOnce({ enabled: true }) // in_app check
      .mockResolvedValueOnce({ enabled: false }) // push check
    const db = createMockDbWithPref(true)
    const selectWhereResult: Record<string, unknown> = { get: getFn }
    db.select = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue(selectWhereResult),
      }),
    }) as any

    const { sendPushNotification } = await import('$lib/server/push')

    await createNotification(db, {
      title: 'No Push',
      userId: 'user-1',
    })

    expect(sendPushNotification).not.toHaveBeenCalled()
  })

  it('defaults push to enabled when no preference is set', async () => {
    const { createNotification } = await import('$lib/server/notifications')
    const getFn = vi
      .fn()
      .mockResolvedValueOnce({ enabled: true }) // in_app check
      .mockResolvedValueOnce(undefined) // no push pref -> default enabled
    const db = createMockDbWithPref(true)
    const selectWhereResult: Record<string, unknown> = { get: getFn }
    db.select = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue(selectWhereResult),
      }),
    }) as any

    const { sendPushNotification } = await import('$lib/server/push')

    await createNotification(db, {
      title: 'Default Push',
      userId: 'user-1',
    })

    expect(sendPushNotification).toHaveBeenCalled()
  })
})
