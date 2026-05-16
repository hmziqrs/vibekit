---
name: Search Implementation Audit
description: Detailed audit of search phase — claimed features vs actual implementation
type: project
---

# Search Implementation Audit — 2026-05-15

## Claimed vs Actual

| Claimed Feature                           | Status              | Details                                                                       |
| ----------------------------------------- | ------------------- | ----------------------------------------------------------------------------- |
| Algolia/Meilisearch/Typesense integration | **NOT IMPLEMENTED** | Uses SQLite FTS5 on D1 exclusively. No third-party search engine code exists. |
| Index management                          | **PARTIAL**         | Admin reindex endpoint exists but ignores entityType filter                   |
| Relevance tuning                          | **IMPLEMENTED**     | bm25() with configurable weights (title 10x, content 1x, metadata 0.5x)       |
| Autocomplete/suggestions                  | **NOT IMPLEMENTED** | Debounced prefix search exists but no dedicated autocomplete endpoint         |
| Faceted filters                           | **MINIMAL**         | Entity type filter buttons only. No date/status/author facets.                |
| Search result previews                    | **IMPLEMENTED**     | Content snippets with match highlighting                                      |
| Keyboard navigation                       | **IMPLEMENTED**     | Arrow keys, Enter, Escape in search dialog                                    |
| Recent searches                           | **IMPLEMENTED**     | localStorage-based, max 5 entries                                             |
| Blog posts indexed                        | **IMPLEMENTED**     | Full lifecycle: create, update, delete                                        |
| User content indexed                      | **COMPLETE**        | Create (via better-auth databaseHooks), update, and delete hooks wired.       |
| Admin content indexed                     | **N/A**             | No admin content entity type in schema                                        |
| Comments indexed                          | **IMPLEMENTED**     | Full lifecycle: create (approved), update, delete, admin approve/reject       |
| Incremental updates                       | **COMPLETE**        | All entities: blog/items/users/comments have full create/update/delete hooks  |

## Critical Gaps

1. ~~**User indexing incomplete**~~ — **FIXED**. `indexUser` called via `databaseHooks.user.create.after` in auth.ts. `deindexEntity` called on self-delete (hono/index.ts ~1586) and admin delete (hono/index.ts ~3946).

2. ~~**Blog search uses LIKE, not FTS**~~ — **FIXED**. `GET /api/blog/search` now uses the FTS5 search service with `entityTypes: ['blog_post']`, returning ranked results with relevance scoring.

3. ~~**No relevance tuning**~~ — **FIXED**. bm25() with configurable SearchWeights (title 10x, content 1x, metadata 0.5x, entityType 0x).

4. **reindexSchema entityType filter ignored** — Schema accepts it but handler reindexes everything.
   - **Fix**: Use the entityType param in the reindex handler.

5. ~~**Comments not indexed**~~ — **FIXED**. `indexComment()` in indexer.ts:214-244, full lifecycle hooks in hono/index.ts (create:3721, update:3751, delete:3775, admin approve:7829, admin reject/spam:7832, admin delete:7851).

## Files

- `src/lib/server/search/adapter-d1.ts` — D1/FTS5 adapter
- `src/lib/server/search/indexer.ts` — Indexing functions
- `src/lib/server/search/service.ts` — Search service
- `src/lib/components/search-dialog.svelte` — Search UI (Ctrl/Cmd+K)
- `src/routes/(app)/app/search/+page.svelte` — Full results page

## Session 2026-05-15 Updates

- **"Admin reindex ignores entityType filter"**: FIXED — The entityType filter in the reindex handler worked correctly, but the `EntityType` enum included `'page'` which had no corresponding reindexer function. Removed `'page'` from the enum so the filter now only offers valid, implementable entity types.
