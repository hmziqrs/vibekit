import type { SearchAdapter, SearchDocument, SearchResult, SearchService } from './types'

export function createSearchService(adapter: SearchAdapter): SearchService {
  return {
    async deleteEntity(entityId: string, entityType: string): Promise<void> {
      await adapter.delete(entityId, entityType)
    },

    async indexEntities(documents: SearchDocument[]): Promise<void> {
      await adapter.indexBatch(documents)
    },

    async indexEntity(document: SearchDocument): Promise<void> {
      await adapter.index(document)
    },

    async search(
      query: string,
      options?: { entityTypes?: string[]; limit?: number; offset?: number }
    ): Promise<{ hits: SearchResult[]; total: number }> {
      return adapter.search(query, options)
    },
  }
}
