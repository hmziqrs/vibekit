export interface SearchDocument {
  content: string
  entityId: string
  entityType: string
  metadata?: Record<string, unknown>
  title: string
}

export interface SearchResult {
  content: string
  entityId: string
  entityType: string
  highlights?: Record<string, string[]>
  metadata?: Record<string, unknown>
  score: number
  title: string
}

export interface SearchAdapter {
  delete(entityId: string, entityType: string): Promise<void>
  index(document: SearchDocument): Promise<void>
  indexBatch(documents: SearchDocument[]): Promise<void>
  search(
    query: string,
    options?: { entityTypes?: string[]; limit?: number; offset?: number }
  ): Promise<{ hits: SearchResult[]; total: number }>
}

export interface SearchService {
  deleteEntity(entityId: string, entityType: string): Promise<void>
  indexEntity(document: SearchDocument): Promise<void>
  indexEntities(documents: SearchDocument[]): Promise<void>
  search(
    query: string,
    options?: { entityTypes?: string[]; limit?: number; offset?: number }
  ): Promise<{ hits: SearchResult[]; total: number }>
}
