# Media Library — Implementation Plan

## What exists

- Blog media listing (GET /api/blog/media) with pagination
- Blog media deletion (DELETE /api/blog/media/:key)
- Storage client with list/delete/get/put operations
- R2 and filesystem storage adapters
- Upload validation (image/media types, size limits)

## What's needed

1. Admin media library page (browse, search, filter by type)
2. Media upload endpoint (admin)
3. Bulk operations (delete multiple)
4. Folder/prefix organization
5. Thumbnail preview support (URL-based for images)

## Files to Create

1. `src/routes/(admin)/admin/media/+page.svelte` — media library UI
2. `tests/e2e/media-library.spec.ts`

## Files to Modify

1. `src/lib/server/hono/index.ts` — add admin media routes (upload, bulk delete)
2. `src/routes/(admin)/+layout.svelte` — add media nav item
