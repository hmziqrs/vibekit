import { and, desc, eq, sql } from 'drizzle-orm'

import type { SearchAdapter, SearchDocument, SearchResult } from './types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DbClient = any

export function createD1SearchAdapter(db: DbClient): SearchAdapter {
  return {
    async index(document: SearchDocument): Promise<void> {
      await db.run(sql`
        INSERT INTO search_index (entity_type, entity_id, title, content, metadata, updated_at)
        VALUES (${document.entityType}, ${document.entityId}, ${document.title}, ${document.content}, ${JSON.stringify(document.metadata ?? {})}, ${Date.now()})
        ON CONFLICT(entity_type, entity_id) DO UPDATE SET
          title = ${document.title},
          content = ${document.content},
          metadata = ${JSON.stringify(document.metadata ?? {})},
          updated_at = ${Date.now()}
      `)
    },

    async indexBatch(documents: SearchDocument[]): Promise<void> {
      for (const doc of documents) {
        await this.index(doc)
      }
    },

    async delete(entityId: string, entityType: string): Promise<void> {
      await db.run(sql`
        DELETE FROM search_index
        WHERE entity_type = ${entityType} AND entity_id = ${entityId}
      `)
    },

    async search(
      query: string,
      options?: { entityTypes?: string[]; limit?: number; offset?: number }
    ): Promise<{ hits: SearchResult[]; total: number }> {
      const limit = options?.limit ?? 20
      const offset = options?.offset ?? 0
      const sanitized = query.replace(/["*]/g, '').trim()

      if (!sanitized) return { hits: [], total: 0 }

      const typeFilter = options?.entityTypes?.length
        ? `AND entity_type IN (${options.entityTypes.map((t) => `'${t}'`).join(',')})`
        : ''

      const results = await db.all(sql`
        SELECT entity_type, entity_id, title, content, metadata, rank
        FROM search_index
        WHERE search_index MATCH ${sanitized + '*'}
        ${sql.raw(typeFilter)}
        ORDER BY rank
        LIMIT ${limit} OFFSET ${offset}
      `)

      const countResult = await db.all(sql`
        SELECT COUNT(*) as total
        FROM search_index
        WHERE search_index MATCH ${sanitized + '*'}
        ${sql.raw(typeFilter)}
      `)

      const hits: SearchResult[] = (results as Record<string, unknown>[]).map((row) => ({
        content: row.content as string,
        entityId: row.entity_id as string,
        entityType: row.entity_type as string,
        metadata: JSON.parse((row.metadata as string) ?? '{}'),
        score: -(row.rank as number),
        title: row.title as string,
      }))

      return {
        hits,
        total: ((countResult[0] as Record<string, unknown>)?.total as number) ?? 0,
      }
    },
  }
}
