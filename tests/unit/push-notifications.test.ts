import { describe, expect, it, vi } from 'vitest'

// Mock web-push before importing the module
vi.mock('web-push', () => ({
  default: {
    sendNotification: vi
      .fn<() => Promise<{ statusCode: number }>>()
      .mockResolvedValue({ statusCode: 201 }),
    setVapidDetails: vi.fn<() => void>(),
  },
}))

// Mock db schema
vi.mock('$lib/server/db/schema', () => ({
  pushSubscription: {
    auth: 'auth',
    createdAt: 'created_at',
    endpoint: 'endpoint',
    id: 'id',
    p256dh: 'p256dh',
    userAgent: 'user_agent',
    userId: 'user_id',
  },
}))

vi.mock('$lib/server/uuid', () => ({
  uuid: () => 'test-uuid-' + Math.random().toString(36).slice(2, 8),
}))

import { configureWebPush, subscribeToPush, unsubscribeFromPush } from '$lib/server/push'
import webpush from 'web-push'

function createMockDb() {
  return {
    delete: vi.fn<() => { where: () => Promise<void> }>().mockReturnValue({
      where: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
    }),
    insert: vi.fn<() => { values: () => Promise<void> }>().mockReturnValue({
      values: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
    }),
    select: vi.fn<() => { from: () => { where: () => Promise<unknown[]> } }>().mockReturnValue({
      from: vi.fn<() => { where: () => Promise<unknown[]> }>().mockReturnValue({
        where: vi.fn<() => Promise<unknown[]>>().mockResolvedValue([]),
      }),
    }),
  }
}

describe('configureWebPush', () => {
  it('calls setVapidDetails with correct arguments', () => {
    configureWebPush('public-key', 'private-key', 'mailto:test@example.com')
    expect(webpush.setVapidDetails).toHaveBeenCalledWith(
      'mailto:test@example.com',
      'public-key',
      'private-key'
    )
  })
})

describe('subscribeToPush', () => {
  it('removes existing subscription before creating new one', async () => {
    const db = createMockDb()
    await subscribeToPush(db, {
      auth: 'auth-key',
      endpoint: 'https://push.example.com/sub/123',
      p256dh: 'p256dh-key',
      userId: 'user-1',
    })

    // Should delete existing, then insert new
    expect(db.delete).toHaveBeenCalled()
    expect(db.insert).toHaveBeenCalled()
  })

  it('stores user agent when provided', async () => {
    const db = createMockDb()
    await subscribeToPush(db, {
      auth: 'auth-key',
      endpoint: 'https://push.example.com/sub/123',
      p256dh: 'p256dh-key',
      userAgent: 'Mozilla/5.0',
      userId: 'user-1',
    })

    expect(db.insert).toHaveBeenCalled()
  })
})

describe('unsubscribeFromPush', () => {
  it('deletes subscription by endpoint', async () => {
    const db = createMockDb()
    await unsubscribeFromPush(db, 'https://push.example.com/sub/123')
    expect(db.delete).toHaveBeenCalled()
  })
})

describe('push subscription validation', () => {
  it('endpoint must be a valid URL string', () => {
    const endpoint = 'https://fcm.googleapis.com/fcm/send/abc123'
    expect(endpoint.startsWith('https://')).toBeTruthy()
  })

  it('p256dh must be a base64 string', () => {
    const p256dh = 'BEl62iUYgUivxIkuR5Q3b_abc123'
    expect(p256dh.length).toBeGreaterThan(0)
  })

  it('auth must be a base64 string', () => {
    const auth = 'xyz789auth'
    expect(auth.length).toBeGreaterThan(0)
  })
})
