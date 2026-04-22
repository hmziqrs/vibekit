# Phase 6 — Blog Completion: R2 Upload, Cache Invalidation, Cron Cleanup

**Status:** In Progress
**Depends on:** Phases 0-5 (all complete)

## Overview

Complete the remaining blog infrastructure items from the PRD: image upload via R2, cache-tag purging on mutations, 30-day hard-delete cron, and public cache strategy documentation.

## Remaining PRD Items (this phase)

- [x] R2 + Cloudflare Images upload integration
- [x] Cache-tag purge on publish / update / archive / delete
- [x] 30-day hard-delete Cron for trashed posts
- [x] Public cache strategy documented

## Implementation Plan

### Step 1: R2 Upload API Endpoint

**Files:**
- `src/routes/api/admin/upload/+server.ts` — new file (image upload handler)
- `src/lib/server/upload.ts` — new file (upload utility)

**Details:**
- `POST /api/admin/upload` — accepts `multipart/form-data` with a single `file` field
- Validates: admin role, file type (image/jpeg, image/png, image/webp, image/gif), size <= 5MB
- Generates UUID-based filename to prevent collisions: `{uuid}.{ext}`
- Writes to R2 via `platform.env.R2_BLOG_MEDIA.put(key, body)`
- Returns `{ url: string }` — the public URL path `/cdn/blog/{key}`
- `GET /cdn/blog/[...key]` — serves R2 objects (or relies on R2 public bucket / custom domain in production)

**Alternative for v1:** Since R2 doesn't serve objects via Workers by default, we'll create a catch-all route that reads from the R2 bucket and returns the image with proper content-type and cache headers. This keeps it simple for local dev and staging.

**Files:**
- `src/routes/cdn/blog/[...key]/+server.ts` — new file (R2 read proxy)

### Step 2: Image Upload UI in Admin Blog Editor

**Files:**
- `src/lib/components/image-upload.svelte` — new component (reusable upload widget)
- `src/routes/(admin)/admin/blog/new/+page.svelte` — update (add cover image upload)
- `src/routes/(admin)/admin/blog/[id]/edit/+page.svelte` — update (add cover image upload)

**Details:**
- `ImageUpload` component: file input, preview, upload progress, remove button
- Shows current cover image if set (on edit page)
- On upload: calls `/api/admin/upload`, gets URL, sets `coverImageUrl`
- Preview shows the image via `/cdn/blog/...` path
- Max file size client-side validation (5MB)
- Accept only image types

### Step 3: Cache-Tag Purge on Blog Mutations

**Files:**
- `src/lib/server/cache.ts` — new file (cache purge utility)
- `src/routes/api/blog/+server.ts` — update (purge on POST)
- `src/routes/api/blog/[id]/+server.ts` — update (purge on PATCH/DELETE)
- `src/routes/api/blog/[id]/publish/+server.ts` — update (purge)
- `src/routes/api/blog/[id]/unpublish/+server.ts` — update (purge)
- `src/routes/api/blog/[id]/archive/+server.ts` — update (purge)
- `src/routes/api/blog/[id]/restore/+server.ts` — update (purge)
- `src/routes/(blog)/blog/+page.server.ts` — update (set cache headers)
- `src/routes/(blog)/blog/[slug]/+page.server.ts` — update (set cache headers)

**Details:**

`cache.ts` utility:
- `purgeBlogCache(platform, tags: string[])` — uses Cloudflare Cache API via `platform.caches` or `platform.env.ASSETS`
- Tags: `blog:index`, `blog:slug:{slug}`, `blog:tag:{tag}`
- On publish: purge `blog:index` + `blog:slug:{slug}`
- On update (PATCH): if published, purge `blog:slug:{slug}` + `blog:index`
- On unpublish: purge `blog:index` + `blog:slug:{slug}`
- On archive: purge `blog:index` + `blog:slug:{slug}`
- On delete: purge `blog:index` + `blog:slug:{slug}`
- On restore: purge `blog:index`

Cache headers on blog pages:
- `Cache-Control: public, max-age=300, s-maxage=3600, stale-while-revalidate=60`
- `CDN-Cache-Control: public, max-age=3600`

### Step 4: 30-Day Hard-Delete Cron

**Files:**
- `src/routes/api/admin/cleanup/+server.ts` — new file (manual trigger + cron handler)
- `wrangler.jsonc` — update (add cron trigger)

**Details:**
- `wrangler.jsonc`: add `"triggers": { "crons": ["0 3 * * *"] }` (daily at 3am UTC)
- Export `scheduled` handler in a top-level scheduled worker OR use an API endpoint that can be called by cron
- Since SvelteKit doesn't natively export a `scheduled` handler, we'll create a dedicated cleanup endpoint that:
  - Hard-deletes `blog_post` rows where `deleted_at IS NOT NULL` AND `deleted_at < now() - 30 days`
  - Hard-deletes `item` rows where `deleted_at IS NOT NULL` AND `deleted_at < now() - 30 days`
  - Returns `{ purged: { posts: N, items: N } }`
- In production, Cloudflare Cron Triggers will call this endpoint, or it can be triggered manually
- **Note:** For SvelteKit on Cloudflare Workers, the `scheduled` event needs to be handled in a separate `_worker.js` or via the `src/entry.js` approach. For v1 simplicity, we'll document using an external cron (e.g., cron-job.org) hitting the endpoint, since the SvelteKit adapter doesn't support scheduled handlers natively.

**Revised approach:** Create the cleanup endpoint as an admin API. Document that it should be called by a Cloudflare Cron Trigger (configured separately) or external scheduler. This keeps the SvelteKit app clean.

### Step 5: Public Cache Strategy Documentation

**Files:**
- `docs/deployment.md` — update (add cache strategy section)

**Details:**
- Document cache headers for blog pages
- Document cache-tag purge mechanism
- Document CDN-Cache-Control vs Cache-Control semantics
- Document the cleanup cron setup

### Step 6: Tests

**Unit tests:**
- `src/lib/server/upload.test.ts` — test file validation (type, size), key generation
- `src/lib/server/cache.test.ts` — test purgeBlogCache logic, tag generation

**E2E tests:**
- `e2e/blog-upload.spec.ts` — test image upload flow (admin creates post with image)
- Update `e2e/public.spec.ts` — verify cache headers on blog pages

## File Size Limits

All files will stay under 600 lines. The largest files (admin blog editor pages) currently sit at ~120 lines and will grow to ~200 with image upload — well within limits.

## Dependencies

No new npm packages needed. R2 client is built into the Cloudflare Workers runtime.

## Acceptance Criteria

- [ ] Admin can upload a cover image when creating/editing a blog post
- [ ] Uploaded images are stored in R2 and served via `/cdn/blog/` route
- [ ] Blog publish/update/unpublish/archive/delete triggers cache purge
- [ ] Blog pages have proper cache headers (Cache-Control, CDN-Cache-Control)
- [ ] Cleanup endpoint hard-deletes records older than 30 days
- [ ] All unit tests pass
- [ ] All E2E tests pass
