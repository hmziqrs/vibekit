# Content Indexing — Implementation Plan

## What exists

- Search infrastructure (FTS5 adapter, search service, types)
- Search API endpoint (GET /api/search)
- Admin index management routes (POST/DELETE /api/admin/search/index)
- Search UI (dialog + results page)

## What's needed

1. Index blog posts on create, update, publish, restore, revision restore
2. De-index blog posts on delete, archive
3. Index items on create, update
4. De-index items on delete, soft delete
5. Helper function to build search documents from entities
6. Batch re-index endpoint for admin

## Files to Create

1. `src/lib/server/search/indexer.ts` — entity-to-document mapping and indexing helpers

## Files to Modify

1. `src/lib/server/hono/index.ts` — add indexing calls to blog post and item mutation routes

## Approach

- Create thin `indexBlogPost(db, postId)` and `indexItem(db, itemId)` helpers that fetch the entity, build a SearchDocument, and call the search adapter
- Create `deindexEntity(db, entityId, entityType)` helper for deletes
- Call these from the hono routes after successful mutations
- Keep indexing fire-and-forget (don't block the response on it)
