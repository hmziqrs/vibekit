import { createSearchService } from '$lib/server/search/service'
import type { SearchAdapter } from '$lib/server/search/types'
import { describe, expect, it, vi } from 'vitest'

function createMockAdapter(): SearchAdapter {
  return {
    delete: vi.fn().mockResolvedValue(undefined),
    index: vi.fn().mockResolvedValue(undefined),
    indexBatch: vi.fn().mockResolvedValue(undefined),
    search: vi.fn().mockResolvedValue({ hits: [], total: 0 }),
  }
}

describe('createSearchService', () => {
  it('returns an object with all required methods', () => {
    const service = createSearchService(createMockAdapter())
    expect(typeof service.indexEntity).toBe('function')
    expect(typeof service.indexEntities).toBe('function')
    expect(typeof service.deleteEntity).toBe('function')
    expect(typeof service.search).toBe('function')
  })

  it('indexEntity delegates to adapter.index', async () => {
    const adapter = createMockAdapter()
    const service = createSearchService(adapter)
    const doc = { content: 'hello', entityId: '1', entityType: 'post', title: 'Test' }

    await service.indexEntity(doc)

    expect(adapter.index).toHaveBeenCalledWith(doc)
  })

  it('indexEntities delegates to adapter.indexBatch', async () => {
    const adapter = createMockAdapter()
    const service = createSearchService(adapter)
    const docs = [
      { content: 'a', entityId: '1', entityType: 'post', title: 'A' },
      { content: 'b', entityId: '2', entityType: 'post', title: 'B' },
    ]

    await service.indexEntities(docs)

    expect(adapter.indexBatch).toHaveBeenCalledWith(docs)
  })

  it('deleteEntity delegates to adapter.delete', async () => {
    const adapter = createMockAdapter()
    const service = createSearchService(adapter)

    await service.deleteEntity('post-1', 'post')

    expect(adapter.delete).toHaveBeenCalledWith('post-1', 'post')
  })

  it('search delegates to adapter.search with options', async () => {
    const adapter = createMockAdapter()
    const hits = [{ content: 'result', entityId: '1', entityType: 'post', title: 'R' }]
    ;(adapter.search as ReturnType<typeof vi.fn>).mockResolvedValue({ hits, total: 1 })
    const service = createSearchService(adapter)

    const result = await service.search('test', { entityTypes: ['post'], limit: 10 })

    expect(adapter.search).toHaveBeenCalledWith('test', { entityTypes: ['post'], limit: 10 })
    expect(result.hits).toEqual(hits)
    expect(result.total).toBe(1)
  })

  it('search works without options', async () => {
    const adapter = createMockAdapter()
    const service = createSearchService(adapter)

    const result = await service.search('query')

    expect(adapter.search).toHaveBeenCalledWith('query', undefined)
    expect(result.total).toBe(0)
  })
})
