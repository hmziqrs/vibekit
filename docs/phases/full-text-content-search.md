# Full-Text Content Search (Admin Side Minimum)

## Status: In Progress

## Current State

- All blog search uses SQL `LIKE %query%` on `title` and `slug` only
- `contentBody` (full article content, up to 100K chars) is never searched
- `excerpt` is only searched on public blog, not admin
- No FTS5 virtual tables exist in any migration
- Three search surfaces: admin blog list (`GET /api/blog/`), editor article-search (`GET /api/blog/search`), public blog (`/blog/+page.server.ts`)

## Changes Required

1. **Expand admin blog list search** (`GET /api/blog/` in `hono/index.ts`)
   - Add `contentBody` and `excerpt` to LIKE search conditions
   - Use `or(like(title), like(slug), like(excerpt), like(contentBody))`

2. **Expand editor article-search** (`GET /api/blog/search` in `hono/index.ts`)
   - Add `contentBody` and `excerpt` to LIKE search conditions
   - Return a snippet/highlight of matched content

3. **Expand public blog search** (`/blog/+page.server.ts`)
   - Add `contentBody` to LIKE search conditions

4. **Add search result snippet extraction**
   - When searching `contentBody`, extract a ~150-char snippet around the match
   - Return as `matchSnippet` field in search results

5. **Unit tests** for expanded search coverage
6. **E2E test** for admin blog search functionality

## Files to Modify

- `src/lib/server/hono/index.ts` — Expand search in admin blog list + editor search endpoints
- `src/routes/(blog)/blog/+page.server.ts` — Expand public blog search
- `tests/unit/` — Unit tests for search logic
- `tests/e2e/` — E2E test for admin blog search

## Testing

- Unit test: search with query matching title, excerpt, contentBody
- Unit test: search returns correct results for various query patterns
- E2E test: admin types in search box, results filter correctly
