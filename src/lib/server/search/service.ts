import type { SearchAdapter, SearchDocument, SearchService } from './types'

export function createSearchService(adapter: SearchAdapter): SearchService {
  return {
    async indexEntity(document: SearchDocument): Promise<void> {
      await adapter.index(document)
    },

    async indexEntities(documents: SearchDocument[]): Promise<void> {
      await adapter.indexBatch(documents)
    },

    async deleteEntity(entityId: string, entityType: string): Promise<void> {
      await adapter.delete(entityId, entityType)
    },

    async search(
      query: string,
      options?: { entityTypes?: string[]; limit?: number; offset?: number }
    ): Promise<{ hits: SearchDocument[]; total: number }> {
      return adapter.search(query, options) as Promise<{ hits: SearchDocument[]; total: number }>
    },
  }
}
