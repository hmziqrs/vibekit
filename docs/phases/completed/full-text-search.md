# Full-Text Search Infrastructure — Implementation Plan

## Approach

Create a search service abstraction that works with:

1. D1 FTS5 for local development (SQLite built-in)
2. Meilisearch/Typesense for production (via adapter pattern)

## Implementation

1. Search service interface with adapter pattern
2. D1 FTS5 adapter (default, works locally)
3. Meilisearch adapter (optional, for production)
4. Index management functions
5. API routes for search
6. Admin index management

## DB: search_index table (for D1 FTS fallback)

- id, entityType, entityId
- title, content (searchable)
- metadata (JSON)
- createdAt, updatedAt

## Files to Create

1. `src/lib/server/search/types.ts` — search interfaces
2. `src/lib/server/search/service.ts` — search service
3. `src/lib/server/search/adapter-d1.ts` — D1 adapter
4. `src/lib/validators/search.ts` — search params validation
5. `drizzle/0037_search_index.sql` — migration
6. `tests/unit/search.test.ts`
7. `tests/e2e/search.spec.ts`

## Files to Modify

1. `src/lib/server/db/schema.ts` — add search index table
2. `src/lib/server/hono/index.ts` — add search routes
3. `src/lib/validators/index.ts` — re-export
