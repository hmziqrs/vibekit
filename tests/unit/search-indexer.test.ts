import type { DrizzleDb } from '$lib/server/services/types'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mock the D1 search adapter
const mockIndex = vi.fn().mockResolvedValue(undefined)
const mockDelete = vi.fn().mockResolvedValue(undefined)

vi.mock('$lib/server/search/adapter-d1', () => ({
  createD1SearchAdapter: () => ({
    delete: mockDelete,
    index: mockIndex,
  }),
}))

type MockDb = DrizzleDb & {
  _fromFn: ReturnType<typeof vi.fn>
  _limitFn: ReturnType<typeof vi.fn>
  _whereFn: ReturnType<typeof vi.fn>
}

function createMockDb(rows: Record<string, unknown>[] = []): MockDb {
  const limitFn = vi.fn().mockResolvedValue(rows)
  const whereFn = vi.fn().mockReturnValue({ limit: limitFn })
  const fromFn = vi.fn().mockReturnValue({ where: whereFn })

  return {
    _fromFn: fromFn,
    _limitFn: limitFn,
    _whereFn: whereFn,
    select: vi.fn().mockReturnValue({ from: fromFn }),
  } as unknown as MockDb
}

beforeEach(() => {
  mockIndex.mockClear()
  mockDelete.mockClear()
})

describe('search indexer module', () => {
  it('exports indexBlogPost function', async () => {
    const mod = await import('$lib/server/search/indexer')
    expect(typeof mod.indexBlogPost).toBe('function')
  })

  it('exports indexItem function', async () => {
    const mod = await import('$lib/server/search/indexer')
    expect(typeof mod.indexItem).toBe('function')
  })

  it('exports deindexEntity function', async () => {
    const mod = await import('$lib/server/search/indexer')
    expect(typeof mod.deindexEntity).toBe('function')
  })

  it('exports reindexAllBlogPosts function', async () => {
    const mod = await import('$lib/server/search/indexer')
    expect(typeof mod.reindexAllBlogPosts).toBe('function')
  })

  it('exports reindexAllItems function', async () => {
    const mod = await import('$lib/server/search/indexer')
    expect(typeof mod.reindexAllItems).toBe('function')
  })
})

describe('indexBlogPost', () => {
  it('indexes a published blog post', async () => {
    const { indexBlogPost } = await import('$lib/server/search/indexer')
    const db = createMockDb([
      {
        contentBody: 'Full article content here',
        excerpt: 'A short summary',
        id: 'post-1',
        slug: 'test-post',
        status: 'published',
        title: 'Test Post',
      },
    ])

    await indexBlogPost(db, 'post-1')

    expect(mockIndex).toHaveBeenCalledTimes(1)
    const doc = mockIndex.mock.calls[0][0]
    expect(doc.entityId).toBe('post-1')
    expect(doc.entityType).toBe('blog_post')
    expect(doc.title).toBe('Test Post')
    expect(doc.metadata).toEqual({ slug: 'test-post', status: 'published' })
    expect(doc.content).toContain('A short summary')
    expect(doc.content).toContain('Full article content here')
  })

  it('skips indexing when post not found', async () => {
    const { indexBlogPost } = await import('$lib/server/search/indexer')
    const db = createMockDb([])

    await indexBlogPost(db, 'nonexistent')

    expect(mockIndex).not.toHaveBeenCalled()
  })

  it('skips indexing archived posts', async () => {
    const { indexBlogPost } = await import('$lib/server/search/indexer')
    const db = createMockDb([
      {
        contentBody: 'Old content',
        excerpt: null,
        id: 'post-2',
        slug: 'old-post',
        status: 'archived',
        title: 'Old Post',
      },
    ])

    await indexBlogPost(db, 'post-2')

    expect(mockIndex).not.toHaveBeenCalled()
  })

  it('uses slug as title fallback', async () => {
    const { indexBlogPost } = await import('$lib/server/search/indexer')
    const db = createMockDb([
      {
        contentBody: 'Content',
        excerpt: null,
        id: 'post-3',
        slug: 'no-title-post',
        status: 'published',
        title: null,
      },
    ])

    await indexBlogPost(db, 'post-3')

    const doc = mockIndex.mock.calls[0][0]
    expect(doc.title).toBe('no-title-post')
  })

  it('truncates content to 5000 chars', async () => {
    const { indexBlogPost } = await import('$lib/server/search/indexer')
    const longContent = 'x'.repeat(10000)
    const db = createMockDb([
      {
        contentBody: longContent,
        excerpt: null,
        id: 'post-4',
        slug: 'long-post',
        status: 'published',
        title: 'Long Post',
      },
    ])

    await indexBlogPost(db, 'post-4')

    const doc = mockIndex.mock.calls[0][0]
    expect(doc.content.length).toBeLessThanOrEqual(5000)
  })
})

describe('indexItem', () => {
  it('indexes an active item', async () => {
    const { indexItem } = await import('$lib/server/search/indexer')
    const db = createMockDb([
      {
        createdAt: new Date(),
        description: 'A useful tool',
        id: 'item-1',
        name: 'My Tool',
        status: 'active',
      },
    ])

    await indexItem(db, 'item-1')

    expect(mockIndex).toHaveBeenCalledTimes(1)
    const doc = mockIndex.mock.calls[0][0]
    expect(doc.entityId).toBe('item-1')
    expect(doc.entityType).toBe('item')
    expect(doc.title).toBe('My Tool')
    expect(doc.content).toBe('A useful tool')
  })

  it('skips archived items', async () => {
    const { indexItem } = await import('$lib/server/search/indexer')
    const db = createMockDb([
      {
        createdAt: new Date(),
        description: 'Old tool',
        id: 'item-2',
        name: 'Old Tool',
        status: 'archived',
      },
    ])

    await indexItem(db, 'item-2')

    expect(mockIndex).not.toHaveBeenCalled()
  })

  it('handles null description', async () => {
    const { indexItem } = await import('$lib/server/search/indexer')
    const db = createMockDb([
      {
        createdAt: new Date(),
        description: null,
        id: 'item-3',
        name: 'No Desc',
        status: 'active',
      },
    ])

    await indexItem(db, 'item-3')

    const doc = mockIndex.mock.calls[0][0]
    expect(doc.content).toBe('')
  })
})

describe('deindexEntity', () => {
  it('calls adapter delete with correct params', async () => {
    const { deindexEntity } = await import('$lib/server/search/indexer')
    const db = createMockDb()

    await deindexEntity(db, 'post-1', 'blog_post')

    expect(mockDelete).toHaveBeenCalledWith('post-1', 'blog_post')
  })
})

describe('reindexAllBlogPosts', () => {
  it('indexes all non-archived posts', async () => {
    const { reindexAllBlogPosts } = await import('$lib/server/search/indexer')
    const db = createMockDb([
      {
        contentBody: 'Post 1',
        excerpt: null,
        id: 'p1',
        slug: 'post-1',
        status: 'published',
        title: 'Post 1',
      },
      {
        contentBody: 'Post 2',
        excerpt: null,
        id: 'p2',
        slug: 'post-2',
        status: 'draft',
        title: 'Post 2',
      },
      {
        contentBody: 'Post 3',
        excerpt: null,
        id: 'p3',
        slug: 'post-3',
        status: 'archived',
        title: 'Post 3',
      },
    ])
    // Override select().from() for the no-where query
    const fromFn = db._fromFn
    fromFn.mockReturnValue({
      where: vi.fn().mockResolvedValue([
        {
          contentBody: 'Post 1',
          excerpt: null,
          id: 'p1',
          slug: 'post-1',
          status: 'published',
          title: 'Post 1',
        },
        {
          contentBody: 'Post 2',
          excerpt: null,
          id: 'p2',
          slug: 'post-2',
          status: 'draft',
          title: 'Post 2',
        },
        {
          contentBody: 'Post 3',
          excerpt: null,
          id: 'p3',
          slug: 'post-3',
          status: 'archived',
          title: 'Post 3',
        },
      ]),
    })

    const count = await reindexAllBlogPosts(db)

    expect(count).toBe(2) // published + draft, skipped archived
    expect(mockIndex).toHaveBeenCalledTimes(2)
  })
})

describe('indexUser', () => {
  it('exports indexUser function', async () => {
    const mod = await import('$lib/server/search/indexer')
    expect(typeof mod.indexUser).toBe('function')
  })

  it('indexes a user with displayName', async () => {
    const { indexUser } = await import('$lib/server/search/indexer')
    const db = createMockDb([
      {
        bio: 'Full-stack developer',
        displayName: 'Jane Doe',
        email: 'jane@example.com',
        id: 'user-1',
        name: 'Jane',
      },
    ])

    await indexUser(db, 'user-1')

    expect(mockIndex).toHaveBeenCalledTimes(1)
    const doc = mockIndex.mock.calls[0][0]
    expect(doc.entityId).toBe('user-1')
    expect(doc.entityType).toBe('user')
    expect(doc.title).toBe('Jane Doe')
    expect(doc.content).toContain('Jane Doe')
    expect(doc.content).not.toContain('jane@example.com')
    expect(doc.content).toContain('Full-stack developer')
    expect(doc.metadata).toEqual({})
  })

  it('uses name as title fallback when displayName is null', async () => {
    const { indexUser } = await import('$lib/server/search/indexer')
    const db = createMockDb([
      {
        bio: null,
        displayName: null,
        email: 'bob@example.com',
        id: 'user-2',
        name: 'Bob Smith',
      },
    ])

    await indexUser(db, 'user-2')

    const doc = mockIndex.mock.calls[0][0]
    expect(doc.title).toBe('Bob Smith')
  })

  it('uses User as title fallback when name and displayName are null', async () => {
    const { indexUser } = await import('$lib/server/search/indexer')
    const db = createMockDb([
      {
        bio: null,
        displayName: null,
        email: 'noname@example.com',
        id: 'user-3',
        name: null,
      },
    ])

    await indexUser(db, 'user-3')

    const doc = mockIndex.mock.calls[0][0]
    expect(doc.title).toBe('User')
  })

  it('skips indexing when user not found', async () => {
    const { indexUser } = await import('$lib/server/search/indexer')
    const db = createMockDb([])

    await indexUser(db, 'nonexistent')

    expect(mockIndex).not.toHaveBeenCalled()
  })
})

describe('reindexAllUsers', () => {
  it('exports reindexAllUsers function', async () => {
    const mod = await import('$lib/server/search/indexer')
    expect(typeof mod.reindexAllUsers).toBe('function')
  })

  it('indexes all users', async () => {
    const { reindexAllUsers } = await import('$lib/server/search/indexer')
    const db = createMockDb([
      {
        bio: 'Dev',
        displayName: 'Alice',
        email: 'alice@example.com',
        id: 'u1',
        name: 'Alice',
      },
      {
        bio: null,
        displayName: null,
        email: 'bob@example.com',
        id: 'u2',
        name: 'Bob',
      },
    ])
    // Override for the no-where query
    const fromFn = db._fromFn
    fromFn.mockResolvedValue([
      {
        bio: 'Dev',
        displayName: 'Alice',
        email: 'alice@example.com',
        id: 'u1',
        name: 'Alice',
      },
      {
        bio: null,
        displayName: null,
        email: 'bob@example.com',
        id: 'u2',
        name: 'Bob',
      },
    ])

    const count = await reindexAllUsers(db)

    expect(count).toBe(2)
    expect(mockIndex).toHaveBeenCalledTimes(2)
  })
})
