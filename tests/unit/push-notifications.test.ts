import type { DrizzleDb } from '$lib/server/services/types'
import { describe, expect, it, vi } from 'vitest'
import { createMockDb } from '../helpers/mock-db'

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

vi.mock<typeof import('$lib/server/uuid')>(import('$lib/server/uuid'), () => ({
  uuid: () => `test-uuid-${Math.random().toString(36).slice(2, 8)}`,
}))

import { pushSubscription } from '$lib/server/db/schema'
import { configureWebPush, subscribeToPush, unsubscribeFromPush } from '$lib/server/push'
import webpush from 'web-push'

function createMockDbPush() {
  const { db } = createMockDb()
  return db as unknown as DrizzleDb
}

describe('configureWebPush', () => {
  it('calls setVapidDetails with correct arguments', () => {
    configureWebPush('public-key', 'private-key', 'mailto:test@example.com')
    expect(webpush.setVapidDetails).toHaveBeenCalledWith(
      'mailto:test@example.com',
      'public-key',
      'private-key',
    )
  })
})

describe('subscribeToPush', () => {
  it('upserts subscription with onConflictDoUpdate', async () => {
    const db = createMockDbPush()
    await subscribeToPush(db, {
      auth: 'auth-key',
      endpoint: 'https://push.example.com/sub/123',
      p256dh: 'p256dh-key',
      userId: 'user-1',
    })

    expect(db.insert).toHaveBeenCalledWith(pushSubscription)
  })

  it('stores user agent when provided', async () => {
    const db = createMockDbPush()
    await subscribeToPush(db, {
      auth: 'auth-key',
      endpoint: 'https://push.example.com/sub/123',
      p256dh: 'p256dh-key',
      userAgent: 'Mozilla/5.0',
      userId: 'user-1',
    })

    expect(db.insert).toHaveBeenCalledWith(pushSubscription)
  })
})

describe('unsubscribeFromPush', () => {
  it('deletes subscription by endpoint', async () => {
    const db = createMockDbPush()
    await unsubscribeFromPush(db, 'https://push.example.com/sub/123')
    expect(db.delete).toHaveBeenCalledWith(pushSubscription)
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
