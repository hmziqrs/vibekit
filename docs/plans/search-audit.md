---
name: Search Implementation Audit
description: Detailed audit of search phase — claimed features vs actual implementation
type: project
---

# Search Implementation Audit — 2026-05-15

## Claimed vs Actual

| Claimed Feature                           | Status              | Details                                                                                           |
| ----------------------------------------- | ------------------- | ------------------------------------------------------------------------------------------------- |
| Algolia/Meilisearch/Typesense integration | **NOT IMPLEMENTED** | Uses SQLite FTS5 on D1 exclusively. No third-party search engine code exists.                     |
| Index management                          | **DONE**            | Admin reindex endpoint supports entityType filter (blog_post, comment, item, user) or all at once |
| Relevance tuning                          | **NOT IMPLEMENTED** | Default FTS5 BM25 ranking. No custom boost weights.                                               |
| Autocomplete/suggestions                  | **NOT IMPLEMENTED** | Debounced prefix search exists but no dedicated autocomplete endpoint                             |
| Faceted filters                           | **MINIMAL**         | Entity type filter buttons only. No date/status/author facets.                                    |
| Search result previews                    | **IMPLEMENTED**     | Content snippets with match highlighting                                                          |
| Keyboard navigation                       | **IMPLEMENTED**     | Arrow keys, Enter, Escape in search dialog                                                        |
| Recent searches                           | **IMPLEMENTED**     | localStorage-based, max 5 entries                                                                 |
| Blog posts indexed                        | **IMPLEMENTED**     | Full lifecycle: create, update, delete                                                            |
| User content indexed                      | **COMPLETE**        | Create (via better-auth databaseHooks), update, and delete hooks wired.                           |
| Admin content indexed                     | **N/A**             | No admin content entity type in schema                                                            |
| Comments indexed                          | **DONE**            | Indexed on create (if approved), reindexed on update, deindexed on delete                         |
| Incremental updates                       | **DONE**            | Full lifecycle for blog/items/users/comments                                                      |

## Critical Gaps

1. ~~**User indexing incomplete**~~ — **FIXED**. `indexUser` called via `databaseHooks.user.create.after` in auth.ts. `deindexEntity` called on self-delete (hono/index.ts ~1586) and admin delete (hono/index.ts ~3946).

2. ~~**Blog search uses LIKE, not FTS**~~ — **FIXED**. `GET /api/blog/search` now uses the FTS5 search service with `entityTypes: ['blog_post']`, returning ranked results with relevance scoring.

3. ~~**No relevance tuning**~~ — **FIXED**. bm25() with configurable column weights (title 10x, content 1x, metadata 0.5x, entityType 0x). SearchWeights interface for custom overrides. Unit tests in search-relevance.test.ts.

4. ~~**reindexSchema entityType filter ignored**~~ — **FIXED**. Reindex handler now validates with reindexSchema and filters by entityType. Supports blog_post, comment, item, user. All-entity reindex includes comments.

5. ~~**Comments not indexed**~~ — **FIXED**. `indexComment()` and `reindexAllComments()` added to indexer.ts. Wired into: comment create (approved only), user delete, admin delete, admin moderate (approve → index, reject/spam → deindex).

## Files

- `src/lib/server/search/adapter-d1.ts` — D1/FTS5 adapter
- `src/lib/server/search/indexer.ts` — Indexing functions
- `src/lib/server/search/service.ts` — Search service
- `src/lib/components/search-dialog.svelte` — Search UI (Ctrl/Cmd+K)
- `src/routes/(app)/app/search/+page.svelte` — Full results page

## Tests

- `tests/unit/search-relevance.test.ts` — BM25 weight verification (7 tests)
- `tests/unit/comment-indexer.test.ts` — Comment document structure, reindexSchema validation (8 tests)
