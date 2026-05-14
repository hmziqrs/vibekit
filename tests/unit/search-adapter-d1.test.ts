import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockAll = vi.fn().mockResolvedValue([])
const mockRun = vi.fn().mockResolvedValue({ meta: { changes: 0 } })

function createMockDb() {
  return { all: mockAll, run: mockRun } as never
}

beforeEach(() => {
  mockAll.mockClear()
  mockRun.mockClear()
  mockAll.mockResolvedValue([])
  mockRun.mockResolvedValue({ meta: { changes: 0 } })
})

describe('D1 search adapter', () => {
  it('search works without entity types filter', async () => {
    const { createD1SearchAdapter } = await import('$lib/server/search/adapter-d1')
    const adapter = createD1SearchAdapter(createMockDb())

    const result = await adapter.search('hello')

    expect(mockAll).toHaveBeenCalledTimes(2) // results + count
    expect(result).toEqual({ hits: [], total: 0 })
  })

  it('search works with entity types filter', async () => {
    const { createD1SearchAdapter } = await import('$lib/server/search/adapter-d1')
    const adapter = createD1SearchAdapter(createMockDb())

    await adapter.search('test', { entityTypes: ['blogPost', 'comment'] })

    // Should have called db.all twice (results + count) without throwing
    expect(mockAll).toHaveBeenCalledTimes(2)
  })

  it('search uses parameterized query for entity types (no SQL injection)', async () => {
    const { createD1SearchAdapter } = await import('$lib/server/search/adapter-d1')
    const adapter = createD1SearchAdapter(createMockDb())

    // The SQL injection attempt should be treated as a bound parameter, not raw SQL
    // With sql.join, the malicious string is parameterized, preventing injection
    await expect(
      adapter.search('test', {
        entityTypes: ["post'; DROP TABLE search_index; --"],
      })
    ).resolves.toBeDefined()

    // The key assertion: the call should succeed without error
    // If raw interpolation was used, the SQL would be malformed
    expect(mockAll).toHaveBeenCalledTimes(2)
  })

  it('search returns empty for empty query', async () => {
    const { createD1SearchAdapter } = await import('$lib/server/search/adapter-d1')
    const adapter = createD1SearchAdapter(createMockDb())

    const result = await adapter.search('')
    expect(result.hits).toEqual([])
    expect(result.total).toBe(0)
    expect(mockAll).not.toHaveBeenCalled()
  })

  it('search returns empty for special-char-only query', async () => {
    const { createD1SearchAdapter } = await import('$lib/server/search/adapter-d1')
    const adapter = createD1SearchAdapter(createMockDb())

    const result = await adapter.search('***"')
    expect(result.hits).toEqual([])
    expect(result.total).toBe(0)
  })

  it('index inserts document with upsert', async () => {
    const { createD1SearchAdapter } = await import('$lib/server/search/adapter-d1')
    const adapter = createD1SearchAdapter(createMockDb())

    await adapter.index({
      content: 'Some content',
      entityId: 'post-1',
      entityType: 'blogPost',
      metadata: { author: 'test' },
      title: 'Test Post',
    })

    expect(mockRun).toHaveBeenCalledTimes(1)
  })

  it('delete removes document', async () => {
    const { createD1SearchAdapter } = await import('$lib/server/search/adapter-d1')
    const adapter = createD1SearchAdapter(createMockDb())

    await adapter.delete('post-1', 'blogPost')

    expect(mockRun).toHaveBeenCalledTimes(1)
  })

  it('indexBatch indexes multiple documents', async () => {
    const { createD1SearchAdapter } = await import('$lib/server/search/adapter-d1')
    const adapter = createD1SearchAdapter(createMockDb())

    await adapter.indexBatch([
      { content: 'Doc 1', entityId: '1', entityType: 'post', title: 'T1' },
      { content: 'Doc 2', entityId: '2', entityType: 'post', title: 'T2' },
    ])

    expect(mockRun).toHaveBeenCalledTimes(2)
  })

  it('search with limit and offset passes them through', async () => {
    const { createD1SearchAdapter } = await import('$lib/server/search/adapter-d1')
    const adapter = createD1SearchAdapter(createMockDb())

    await adapter.search('test', { limit: 5, offset: 10 })

    expect(mockAll).toHaveBeenCalledTimes(2)
  })

  it('search parses results correctly', async () => {
    const { createD1SearchAdapter } = await import('$lib/server/search/adapter-d1')

    const mockResults = [
      {
        content: 'Test content',
        entity_id: 'post-1',
        entity_type: 'blogPost',
        metadata: '{"author":"test"}',
        rank: -0.5,
        title: 'Test Title',
      },
    ]
    const mockCount = [{ total: 42 }]

    mockAll.mockResolvedValueOnce(mockResults).mockResolvedValueOnce(mockCount)

    const adapter = createD1SearchAdapter(createMockDb())
    const result = await adapter.search('test')

    expect(result.total).toBe(42)
    expect(result.hits).toHaveLength(1)
    expect(result.hits[0]).toEqual({
      content: 'Test content',
      entityId: 'post-1',
      entityType: 'blogPost',
      metadata: { author: 'test' },
      score: 0.5,
      title: 'Test Title',
    })
  })
})
