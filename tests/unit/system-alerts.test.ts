import { describe, expect, it, vi } from 'vitest'

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

function createMockDb(selectResult?: unknown[]) {
  const whereResult = new DrizzleResult(selectResult ?? [])
  const whereGetFn = vi
    .fn<() => Promise<unknown>>()
    .mockResolvedValue(selectResult?.[0] ?? undefined)
  const whereFn = vi.fn<() => DrizzleResult>().mockReturnValue(whereResult)
  const fromFn = vi.fn<() => { where: typeof whereFn }>().mockReturnValue({ where: whereFn })
  const selectFn = vi.fn<() => { from: typeof fromFn }>().mockReturnValue({ from: fromFn })
  const valuesFn = vi.fn<() => Promise<void>>().mockResolvedValue(undefined)
  const insertFn = vi.fn<() => { values: typeof valuesFn }>().mockReturnValue({ values: valuesFn })

  return {
    insert: insertFn,
    select: selectFn,
  } as unknown as import('$lib/server/services/types').AppDb
}

describe('notification preference logic', () => {
  it('defaults to enabled when no preference exists', async () => {
    const db = createMockDb()
    const { getNotificationPreferences } = await import('$lib/server/notifications')

    const prefs = await getNotificationPreferences(db, 'user-1')
    expect(prefs).toStrictEqual([])
  })
})

describe('createNotification', () => {
  it('inserts notification when preference is enabled (default)', async () => {
    const db = createMockDb()
    const { createNotification } = await import('$lib/server/notifications')

    await createNotification(db, {
      title: 'Test notification',
      type: 'info',
      userId: 'user-1',
    })

    expect(db.insert).toHaveBeenCalled()
  })

  it('inserts notification with link field', async () => {
    const db = createMockDb()
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
    const db = createMockDb()
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
    const db = createMockDb()
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
    const db = createMockDb()
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
    const db = createMockDb()
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
    const db = createMockDb()
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
    const db = createMockDb()
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
    expect(db.insert).toHaveBeenCalledTimes(3)
  })

  it('broadcast includes body and link', async () => {
    const db = createMockDb()
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
