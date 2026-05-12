# Search UI — Implementation Plan

## What exists

- Search API endpoint (GET /api/search?q=...&limit=...&offset=...&types=...)
- Search service with D1 FTS5 adapter
- Admin index management routes

## What's needed

1. Global search component (used in app layout header)
2. Autocomplete/suggestions dropdown
3. Keyboard navigation (arrow keys, enter, escape)
4. Faceted filters (by entity type)
5. Search results page with previews
6. Recent searches (localStorage)

## Files to Create

1. `src/lib/components/search-dialog.svelte` — global search dialog
2. `src/routes/(app)/app/search/+page.svelte` — full search results page
3. `tests/e2e/search-ui.spec.ts`

## Files to Modify

1. `src/routes/(app)/+layout.svelte` — add search trigger in header
