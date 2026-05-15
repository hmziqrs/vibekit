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
| Relevance tuning                          | **NOT IMPLEMENTED** | Default FTS5 BM25 ranking. No custom boost weights.                           |
| Autocomplete/suggestions                  | **NOT IMPLEMENTED** | Debounced prefix search exists but no dedicated autocomplete endpoint         |
| Faceted filters                           | **MINIMAL**         | Entity type filter buttons only. No date/status/author facets.                |
| Search result previews                    | **IMPLEMENTED**     | Content snippets with match highlighting                                      |
| Keyboard navigation                       | **IMPLEMENTED**     | Arrow keys, Enter, Escape in search dialog                                    |
| Recent searches                           | **IMPLEMENTED**     | localStorage-based, max 5 entries                                             |
| Blog posts indexed                        | **IMPLEMENTED**     | Full lifecycle: create, update, delete                                        |
| User content indexed                      | **COMPLETE**        | Create (via better-auth databaseHooks), update, and delete hooks wired.       |
| Admin content indexed                     | **N/A**             | No admin content entity type in schema                                        |
| Comments indexed                          | **NOT IMPLEMENTED** | Listed in validators but no indexer function                                  |
| Incremental updates                       | **PARTIAL**         | Works for blog/items/users. Absent for comments.                              |

## Critical Gaps

1. ~~**User indexing incomplete**~~ — **FIXED**. `indexUser` called via `databaseHooks.user.create.after` in auth.ts. `deindexEntity` called on self-delete (hono/index.ts ~1586) and admin delete (hono/index.ts ~3946).

2. ~~**Blog search uses LIKE, not FTS**~~ — **FIXED**. `GET /api/blog/search` now uses the FTS5 search service with `entityTypes: ['blog_post']`, returning ranked results with relevance scoring.

3. **No relevance tuning** — Title matches should rank higher than body matches.
   - **Fix**: Add column weights to FTS5 table definition or use custom rank function.

4. **reindexSchema entityType filter ignored** — Schema accepts it but handler reindexes everything.
   - **Fix**: Use the entityType param in the reindex handler.

5. **Comments not indexed** — Valid entity type but zero implementation.
   - **Fix**: Create `indexComment` function and wire into comment mutation handlers.

## Files

- `src/lib/server/search/adapter-d1.ts` — D1/FTS5 adapter
- `src/lib/server/search/indexer.ts` — Indexing functions
- `src/lib/server/search/service.ts` — Search service
- `src/lib/components/search-dialog.svelte` — Search UI (Ctrl/Cmd+K)
- `src/routes/(app)/app/search/+page.svelte` — Full results page

## Session 2026-05-15 Updates

- **"Admin reindex ignores entityType filter"**: FIXED — The entityType filter in the reindex handler worked correctly, but the `EntityType` enum included `'page'` which had no corresponding reindexer function. Removed `'page'` from the enum so the filter now only offers valid, implementable entity types.
