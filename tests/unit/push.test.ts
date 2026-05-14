import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockDelete = vi.fn()
const mockInsert = vi.fn()
const mockSelect = vi.fn()
const mockSendNotification = vi.fn()

vi.mock('web-push', () => ({
  default: {
    sendNotification: mockSendNotification,
    setVapidDetails: vi.fn(),
  },
}))

vi.mock('$lib/server/db/schema', () => ({
  pushSubscription: {
    auth: 'auth',
    endpoint: 'endpoint',
    id: 'id',
    p256dh: 'p256dh',
    userAgent: 'userAgent',
    userId: 'userId',
  },
}))

vi.mock('$lib/server/uuid', () => ({
  uuid: () => 'test-uuid-123',
}))

function createMockDb(
  subscriptions: Array<{ auth: string; endpoint: string; p256dh: string }> = []
) {
  return {
    delete: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) }),
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        onConflictDoUpdate: vi.fn().mockResolvedValue(undefined),
      }),
    }),
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue(subscriptions),
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue(subscriptions),
        }),
      }),
    }),
  } as unknown
}

beforeEach(() => {
  mockSendNotification.mockClear()
})

describe('push module', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('exports all required functions', async () => {
    const mod = await import('$lib/server/push')
    expect(typeof mod.configureWebPush).toBe('function')
    expect(typeof mod.subscribeToPush).toBe('function')
    expect(typeof mod.unsubscribeFromPush).toBe('function')
    expect(typeof mod.getUserPushSubscriptions).toBe('function')
    expect(typeof mod.sendPushNotification).toBe('function')
  })
})

describe('subscribeToPush', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('upserts subscription for endpoint', async () => {
    const { subscribeToPush } = await import('$lib/server/push')
    const db = createMockDb()

    const result = await subscribeToPush(db, {
      auth: 'auth-key',
      endpoint: 'https://fcm.googleapis.com/test',
      p256dh: 'p256dh-key',
      userAgent: 'Mozilla/5.0',
      userId: 'user-1',
    })

    expect(result.id).toBe('test-uuid-123')
    expect(db.insert).toHaveBeenCalled()
  })

  it('works without userAgent', async () => {
    const { subscribeToPush } = await import('$lib/server/push')
    const db = createMockDb()

    const result = await subscribeToPush(db, {
      auth: 'auth-key',
      endpoint: 'https://fcm.googleapis.com/test',
      p256dh: 'p256dh-key',
      userId: 'user-1',
    })

    expect(result.id).toBe('test-uuid-123')
  })
})

describe('unsubscribeFromPush', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('deletes subscription by endpoint', async () => {
    const { unsubscribeFromPush } = await import('$lib/server/push')
    const db = createMockDb()

    await unsubscribeFromPush(db, 'https://fcm.googleapis.com/test')
    expect(db.delete).toHaveBeenCalled()
  })
})

describe('getUserPushSubscriptions', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('returns subscriptions for user', async () => {
    const { getUserPushSubscriptions } = await import('$lib/server/push')
    const subs = [
      { auth: 'a1', endpoint: 'ep1', p256dh: 'p1' },
      { auth: 'a2', endpoint: 'ep2', p256dh: 'p2' },
    ]
    const db = createMockDb(subs)

    const result = await getUserPushSubscriptions(db, 'user-1')
    expect(result).toEqual(subs)
  })

  it('returns empty array when no subscriptions', async () => {
    const { getUserPushSubscriptions } = await import('$lib/server/push')
    const db = createMockDb([])

    const result = await getUserPushSubscriptions(db, 'user-1')
    expect(result).toEqual([])
  })
})

describe('sendPushNotification', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('sends notification to all subscriptions', async () => {
    const { sendPushNotification } = await import('$lib/server/push')
    const subs = [
      { auth: 'a1', endpoint: 'ep1', p256dh: 'p1' },
      { auth: 'a2', endpoint: 'ep2', p256dh: 'p2' },
    ]
    const db = createMockDb(subs)
    mockSendNotification.mockResolvedValue({ statusCode: 201 })

    const result = await sendPushNotification(db, 'user-1', {
      body: 'Hello!',
      title: 'Test',
    })

    expect(result.sent).toBe(2)
    expect(result.total).toBe(2)
    expect(mockSendNotification).toHaveBeenCalledTimes(2)
  })

  it('serializes payload as JSON', async () => {
    const { sendPushNotification } = await import('$lib/server/push')
    const db = createMockDb([{ auth: 'a', endpoint: 'ep', p256dh: 'p' }])
    mockSendNotification.mockResolvedValue({ statusCode: 201 })

    await sendPushNotification(db, 'user-1', {
      data: { action: 'open' },
      icon: '/icon.png',
      title: 'Title',
    })

    const payload = JSON.parse(mockSendNotification.mock.calls[0][1])
    expect(payload.title).toBe('Title')
    expect(payload.icon).toBe('/icon.png')
    expect(payload.data).toEqual({ action: 'open' })
  })

  it('removes subscriptions that return 410 Gone', async () => {
    const { sendPushNotification } = await import('$lib/server/push')
    const subs = [
      { auth: 'a1', endpoint: 'ep1', p256dh: 'p1' },
      { auth: 'a2', endpoint: 'ep2', p256dh: 'p2' },
    ]
    const db = createMockDb(subs)

    const error = new Error('Gone') as Error & { statusCode: number }
    error.statusCode = 410
    mockSendNotification.mockRejectedValue(error)

    const result = await sendPushNotification(db, 'user-1', { title: 'Test' })

    expect(result.sent).toBe(0)
    expect(result.total).toBe(2)
    // Should clean up both invalid subscriptions
    expect(db.delete).toHaveBeenCalledTimes(2)
  })

  it('removes subscriptions that return 404 Not Found', async () => {
    const { sendPushNotification } = await import('$lib/server/push')
    const subs = [{ auth: 'a1', endpoint: 'ep1', p256dh: 'p1' }]
    const db = createMockDb(subs)

    const error = new Error('Not Found') as Error & { statusCode: number }
    error.statusCode = 404
    mockSendNotification.mockRejectedValue(error)

    const result = await sendPushNotification(db, 'user-1', { title: 'Test' })

    expect(result.sent).toBe(0)
    expect(db.delete).toHaveBeenCalledTimes(1)
  })

  it('keeps subscriptions that fail with other errors', async () => {
    const { sendPushNotification } = await import('$lib/server/push')
    const subs = [{ auth: 'a1', endpoint: 'ep1', p256dh: 'p1' }]
    const db = createMockDb(subs)

    const error = new Error('Server error') as Error & { statusCode: number }
    error.statusCode = 500
    mockSendNotification.mockRejectedValue(error)

    const result = await sendPushNotification(db, 'user-1', { title: 'Test' })

    expect(result.sent).toBe(0)
    // Should NOT clean up subscription (500 is temporary)
    expect(db.delete).toHaveBeenCalledTimes(0)
  })

  it('handles mix of successful and failed sends', async () => {
    const { sendPushNotification } = await import('$lib/server/push')
    const subs = [
      { auth: 'a1', endpoint: 'ep1', p256dh: 'p1' },
      { auth: 'a2', endpoint: 'ep2', p256dh: 'p2' },
      { auth: 'a3', endpoint: 'ep3', p256dh: 'p3' },
    ]
    const db = createMockDb(subs)

    const error = new Error('Gone') as Error & { statusCode: number }
    error.statusCode = 410
    mockSendNotification
      .mockResolvedValueOnce({ statusCode: 201 })
      .mockRejectedValueOnce(error)
      .mockResolvedValueOnce({ statusCode: 201 })

    const result = await sendPushNotification(db, 'user-1', { title: 'Test' })

    expect(result.sent).toBe(2)
    expect(result.total).toBe(3)
    // Only the 410 subscription should be cleaned up
    expect(db.delete).toHaveBeenCalledTimes(1)
  })

  it('returns zero counts when no subscriptions exist', async () => {
    const { sendPushNotification } = await import('$lib/server/push')
    const db = createMockDb([])

    const result = await sendPushNotification(db, 'user-1', { title: 'Test' })

    expect(result.sent).toBe(0)
    expect(result.total).toBe(0)
    expect(mockSendNotification).not.toHaveBeenCalled()
  })
})
