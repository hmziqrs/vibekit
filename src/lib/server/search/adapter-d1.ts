import { createLogger } from '$lib/server/logger'
import { sql } from 'drizzle-orm'

import type { SearchAdapter, SearchDocument, SearchResult } from './types'

const logger = createLogger('search')

function safeParseJson(value: string | null | undefined): Record<string, unknown> {
  if (!value) return {}
  try {
    return JSON.parse(value)
  } catch (error) {
    logger.error('Failed to parse JSON in search adapter', { error })
    return {}
  }
}

export interface SearchWeights {
  content: number
  entityType: number
  metadata: number
  title: number
}

export const DEFAULT_WEIGHTS: SearchWeights = {
  content: 1,
  entityType: 0,
  metadata: 0.5,
  title: 10,
}

export function createD1SearchAdapter(
  db: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    all: (query: any) => Promise<any[]>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    run: (query: any) => Promise<any>
  },
  weights?: Partial<SearchWeights>
): SearchAdapter {
  const w = { ...DEFAULT_WEIGHTS, ...weights }

  return {
    async delete(entityId: string, entityType: string): Promise<void> {
      await db.run(sql`
        DELETE FROM search_content
        WHERE entity_type = ${entityType} AND entity_id = ${entityId}
      `)
    },

    async index(document: SearchDocument): Promise<void> {
      await db.run(sql`
        INSERT INTO search_content (entity_type, entity_id, title, content, metadata, updated_at)
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
        // oxlint-disable-next-line no-await-in-loop
        await this.index(doc)
      }
    },

    async search(
      query: string,
      options?: { entityTypes?: string[]; limit?: number; offset?: number }
    ): Promise<{ hits: SearchResult[]; total: number }> {
      const limit = options?.limit ?? 20
      const offset = options?.offset ?? 0
      const sanitized = query
        .replace(/["*()^]/g, '')
        .replace(/\b(AND|OR|NOT|NEAR)\b/gi, '')
        .trim()

      if (!sanitized) return { hits: [], total: 0 }

      const typeFilter = options?.entityTypes?.length
        ? sql`AND entity_type IN (${sql.join(
            options.entityTypes.map((t) => sql`${t}`),
            sql`, `
          )})`
        : sql``

      // Bm25() column weights: entity_type, entity_id, title, content, metadata
      // Entity_id is not in the bm25 columns, so we use weights for the 5 FTS columns
      const results = await db.all(sql`
        SELECT entity_type, entity_id, title, content, metadata,
               bm25(search_index, ${w.entityType}, 0.0, ${w.title}, ${w.content}, ${w.metadata}) as rank
        FROM search_index
        WHERE search_index MATCH ${`${sanitized}*`}
        ${typeFilter}
        ORDER BY rank
        LIMIT ${limit} OFFSET ${offset}
      `)

      const countResult = await db.all(sql`
        SELECT COUNT(*) as total
        FROM search_index
        WHERE search_index MATCH ${`${sanitized}*`}
        ${typeFilter}
      `)

      const hits: SearchResult[] = (results as Record<string, unknown>[]).map((row) => ({
        content: row.content as string,
        entityId: row.entity_id as string,
        entityType: row.entity_type as string,
        metadata: safeParseJson(row.metadata as string),
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
