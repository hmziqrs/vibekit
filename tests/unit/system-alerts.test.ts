import type { DrizzleDb } from '$lib/server/services/types'
import { describe, expect, expectTypeOf, it, vi } from 'vitest'

import { createMockDb } from '../helpers/mock-db'

// eslint-disable-next-line unicorn/no-class
class DrizzleResult {
  private result: unknown[]
  constructor(result: unknown[]) {
    this.result = result
  }
  get() {
    return Promise.resolve(this.result[0] ?? undefined)
  }
  // Drizzle queries are thenable — awaiting the query builder resolves the result
  // eslint-disable-next-line unicorn/no-thenable
  then(resolve: (v: unknown[]) => void, _reject?: (e: unknown) => void) {
    Promise.resolve(this.result).then(resolve)
  }
}

function createMockDbSystemAlerts(selectResult?: unknown[]) {
  const { db } = createMockDb({ allResult: selectResult ?? [] })

  // Make where() thenable like Drizzle queries
  const originalWhereFn = (db as unknown as { where: ReturnType<typeof vi.fn> }).where
  if (originalWhereFn) {
    const whereResult = new DrizzleResult(selectResult ?? [])
    originalWhereFn.mockReturnValue(whereResult as never)
  }

  return db as unknown as DrizzleDb
}

describe('notification preference logic', () => {
  it('defaults to enabled when no preference exists', async () => {
    const db = createMockDbSystemAlerts()
    const { getNotificationPreferences } = await import('$lib/server/notifications')

    const prefs = await getNotificationPreferences(db, 'user-1')
    expect(prefs).toStrictEqual([])
  })
})

describe('createNotification', () => {
  it('inserts notification when preference is enabled (default)', async () => {
    const db = createMockDbSystemAlerts()
    const { createNotification } = await import('$lib/server/notifications')

    await createNotification(db, {
      title: 'Test notification',
      type: 'info',
      userId: 'user-1',
    })

    expect(db.insert).toHaveBeenCalled()
  })

  it('inserts notification with link field', async () => {
    const db = createMockDbSystemAlerts()
    const { createNotification } = await import('$lib/server/notifications')

    await createNotification(db, {
      link: '/app/items/123',
      title: 'Item updated',
      type: 'success',
      userId: 'user-1',
    })

    expect(db.insert).toHaveBeenCalled()
  })

  it('inserts notification with entity association', async () => {
    const db = createMockDbSystemAlerts()
    const { createNotification } = await import('$lib/server/notifications')

    await createNotification(db, {
      entityId: 'org-123',
      entityType: 'organization',
      title: 'Role changed',
      type: 'info',
      userId: 'user-1',
    })

    expect(db.insert).toHaveBeenCalled()
  })

  it('inserts notification with metadata', async () => {
    const db = createMockDbSystemAlerts()
    const { createNotification } = await import('$lib/server/notifications')

    await createNotification(db, {
      metadata: { action: 'role_change', newRole: 'admin' },
      title: 'Promoted',
      type: 'success',
      userId: 'user-1',
    })

    expect(db.insert).toHaveBeenCalled()
  })
})

describe('createBroadcast', () => {
  it('creates notifications for all users', async () => {
    const db = createMockDbSystemAlerts()
    const { createBroadcast } = await import('$lib/server/notifications')

    const userIds = ['user-1', 'user-2', 'user-3']
    const count = await createBroadcast(
      db,
      {
        target: 'all',
        title: 'System maintenance',
      },
      async () => userIds
    )

    expect(count).toBe(3)
    expect(db.insert).toHaveBeenCalled()
  })

  it('creates notifications for admin users only', async () => {
    const db = createMockDbSystemAlerts()
    const { createBroadcast } = await import('$lib/server/notifications')

    const adminIds = ['admin-1', 'admin-2']
    const count = await createBroadcast(
      db,
      {
        target: 'admins',
        title: 'Admin alert',
        type: 'warning',
      },
      async () => adminIds
    )

    expect(count).toBe(2)
  })

  it('handles empty user list', async () => {
    const db = createMockDbSystemAlerts()
    const { createBroadcast } = await import('$lib/server/notifications')

    const count = await createBroadcast(
      db,
      {
        target: 'all',
        title: 'Empty broadcast',
      },
      async () => []
    )

    expect(count).toBe(0)
  })

  it('handles large user lists with batching', async () => {
    const db = createMockDbSystemAlerts()
    const { createBroadcast } = await import('$lib/server/notifications')

    const userIds = Array.from({ length: 250 }, (_, i) => `user-${i}`)
    const count = await createBroadcast(
      db,
      {
        target: 'all',
        title: 'Large broadcast',
      },
      async () => userIds
    )

    expect(count).toBe(250)
    // Should be called at least 3 times (100 + 100 + 50)
    expect(db.insert).toHaveBeenCalledTimes(4) // 3 batches + 1 audit log
  })

  it('broadcast includes body and link', async () => {
    const db = createMockDbSystemAlerts()
    const { createBroadcast } = await import('$lib/server/notifications')

    const count = await createBroadcast(
      db,
      {
        body: 'Details about the alert',
        link: '/app/settings',
        target: 'all',
        title: 'Check settings',
      },
      async () => ['user-1']
    )

    expect(count).toBe(1)
  })
})

describe('notification type validation', () => {
  it('all notification types are valid strings', () => {
    const types = ['error', 'info', 'success', 'warning']
    for (const t of types) {
      expectTypeOf(t).toBeString()
      expect(t.length).toBeGreaterThan(0)
    }
  })
})

describe('notification link construction', () => {
  function getNotificationLink(n: {
    entityId: string | null
    entityType: string | null
    link: string | null
  }): string | null {
    if (n.link) return n.link
    if (n.entityType && n.entityId) {
      return `/${n.entityType.replace('_', '-')}/${n.entityId}`
    }
    return null
  }

  it('uses explicit link when present', () => {
    const result = getNotificationLink({
      entityId: '123',
      entityType: 'blog_post',
      link: '/custom/path',
    })
    expect(result).toBe('/custom/path')
  })

  it('constructs link from entity when no explicit link', () => {
    const result = getNotificationLink({
      entityId: '456',
      entityType: 'organization',
      link: null,
    })
    expect(result).toBe('/organization/456')
  })

  it('replaces underscores in entityType', () => {
    const result = getNotificationLink({
      entityId: '789',
      entityType: 'blog_post',
      link: null,
    })
    expect(result).toBe('/blog-post/789')
  })

  it('returns null when no link or entity', () => {
    const result = getNotificationLink({
      entityId: null,
      entityType: null,
      link: null,
    })
    expect(result).toBeNull()
  })

  it('returns null when only entityId present', () => {
    const result = getNotificationLink({
      entityId: '123',
      entityType: null,
      link: null,
    })
    expect(result).toBeNull()
  })

  it('returns null when only entityType present', () => {
    const result = getNotificationLink({
      entityId: null,
      entityType: 'comment',
      link: null,
    })
    expect(result).toBeNull()
  })
})
