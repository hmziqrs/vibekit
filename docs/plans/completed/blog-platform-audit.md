---
name: Blog Platform Audit
description: Detailed audit of blog platform phase — claimed features vs actual implementation
type: project
---

# Blog Platform Audit — 2026-05-15

## Claimed vs Actual

| Claimed Feature                                       | Status          | Details                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ----------------------------------------------------- | --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Blog post CRUD with rich text editor                  | **IMPLEMENTED** | TipTap editor with 15+ extensions (headings, links, images, tables, embeds, pull quotes, fact boxes, corrections, timelines, source blocks, related articles). Admin CRUD via `POST/PATCH/DELETE /api/blog/:id`. Soft-delete with `deletedAt`.                                                                                                                                                                                                                        |
| Category and tag management                           | **PARTIAL**     | Tag system fully implemented (CRUD API, tag selector in editor, tag filtering on blog index, tag display on posts). **No category system** — tags serve as the sole taxonomy.                                                                                                                                                                                                                                                                                         |
| Draft/publish/schedule workflow                       | **IMPLEMENTED** | Statuses: `draft`, `published`, `archived`, `scheduled`. Dedicated `POST /:id/publish`, `POST /:id/unpublish`, `POST /:id/archive`, `POST /:id/restore` endpoints. Schedule picker in edit UI sets `scheduledAt` + `status: scheduled`.                                                                                                                                                                                                                               |
| SEO-optimized URLs with slug generation               | **IMPLEMENTED** | Slug-based URLs (`/blog/:slug`). Slug uniqueness enforced at DB level. Slug history table (`blog_post_slug_history`) with 301 redirect fallback for changed slugs. `canonicalUrl`, `seoTitle`, `seoDescription` columns.                                                                                                                                                                                                                                              |
| Featured image and Open Graph support                 | **IMPLEMENTED** | `coverImageUrl` and `ogImageUrl` columns. SEO panel in editor sidebar with OG image URL field. `seo-head.svelte` component renders `og:*` meta tags. Cover image preview in editor.                                                                                                                                                                                                                                                                                   |
| Related posts                                         | **IMPLEMENTED** | Tag-overlap algorithm in `[slug]/+page.server.ts` — joins `blogPostTag` to find posts sharing tags with the current post, groups by post ID, orders by `count(*)` descending, limits to 3. Displayed on public post page.                                                                                                                                                                                                                                             |
| Table of contents                                     | **IMPLEMENTED** | `extract-toc.ts` walks TipTap JSON content to extract `h2`/`h3` headings. `toc-panel.svelte` renders clickable TOC with scroll-to behavior. Shown in editor sidebar on "TOC" tab.                                                                                                                                                                                                                                                                                     |
| Code syntax highlighting                              | **IMPLEMENTED** | highlight.js with `github-dark-dimmed` theme. `highlightCodeBlocks()` in `src/lib/markdown.ts` processes `<pre><code>` blocks server-side. Used in both public blog rendering (`renderAndSanitize`) and admin preview.                                                                                                                                                                                                                                                |
| Comment system (threaded, moderation, spam filtering) | **IMPLEMENTED** | Schema: `comment` table with `parentId` for threading (one level deep, enforced server-side). Public API: `GET /api/comments/:postId` (top-level + replies), `POST /api/comments/:postId` (with spam detection). Admin: `GET /api/admin/comments`, `PATCH /api/admin/comments/:id/moderate`, `DELETE /api/admin/comments/:id`. `spam-detector.ts` with keyword blacklist, pattern matching, rate checks, duplicate detection. Admin comments UI at `/admin/comments`. |
| Newsletter integration                                | **PARTIAL**     | Subscribe/unsubscribe/confirm flow exists with email confirmation (`POST /api/newsletter/subscribe`, `GET /api/newsletter/confirm`, `POST /api/newsletter/unsubscribe`). Admin subscriber list and stats. **No external sync** — zero Mailchimp or Resend API integration for syncing subscribers. Claims "Mailchimp/Resend sync" but only sends confirmation emails via the app's own email service.                                                                 |
| Analytics per post                                    | **IMPLEMENTED** | `POST /api/analytics/view` records page views with dedup (1-hour window), visitor hash (IP+UA), referrer tracking, country via CF header. `POST /api/analytics/reading` tracks reading progress and completion (80%+ progress + 30s+ read time). `blogPostView` table stores per-view data. `viewCount` denormalized on `blogPost`.                                                                                                                                   |
| Blog series                                           | **IMPLEMENTED** | `blogSeries` and `blogPostSeries` tables with `sortOrder`. Full CRUD API (`GET/POST/PATCH/DELETE /api/blog/series`). Posts can belong to multiple series. Public series pages at `/blog/series/:slug`. Series navigation shown on individual post pages. Admin series management page.                                                                                                                                                                                |
| Markdown import/export                                | **IMPLEMENTED** | Export: `markdown-export.ts` using Turndown with custom rules for figure images, embed blocks, pull quotes, related articles, fact boxes, corrections, and update notes. Import: `markdown-import.ts` using `marked` to convert MD to HTML, then `cleanPastedHtml` to sanitize. Toolbar buttons in editor.                                                                                                                                                            |
| Pull quotes                                           | **IMPLEMENTED** | Custom TipTap `Node` extension (`pull-quote.svelte.ts`) with Svelte node view. Supports text and attribution attributes. Styled with brand-colored left border. Available via slash command (`/quote`) and bubble menu. Exported to blockquote markdown on MD export.                                                                                                                                                                                                 |
| Media library integration                             | **IMPLEMENTED** | `media-library.svelte` component with browse, search, and insert into editor. `GET /api/blog/media` lists objects from storage. `POST /api/blog/upload` uploads with file signature validation. `DELETE /api/blog/media/:key` for removal. Accessible from editor toolbar. Standalone admin page at `/admin/media`.                                                                                                                                                   |

## Critical Gaps

1. ~~**Scheduled publishing cron handler missing**~~ **FIXED** — Added `scheduled` handler to `worker.ts` that dispatches to `/api/admin/publish-scheduled`, `/api/admin/retry-webhooks`, and `/api/admin/cleanup` based on cron expression. Postbuild script (`scripts/postbuild-cron.ts`) injects the handler into the generated worker.

2. **Newsletter sync with external services not implemented** — loop.md claims "Mailchimp/Resend sync" but there is zero integration with either service for subscriber synchronization. The newsletter system only stores subscribers locally in D1 and sends confirmation emails via the app's own email service. No export, no webhook, no API call to external newsletter platforms.
   - **Fix**: Either implement actual sync (push subscribers to Mailchimp/Resend on confirm, handle webhooks back) or remove the claim from loop.md.

3. **No category system** — Only tags exist. The original feature request list mentioned "Category and tag management" but categories were never implemented. Tags serve as the sole taxonomy.
   - **Fix**: Either implement a `blogCategory` table with hierarchy, or update the feature claim to reflect tags-only taxonomy.

4. ~~**Blog search uses LIKE, not FTS**~~ **FIXED** — Public blog index (`/blog?q=...`) now uses FTS5 search service with bm25 ranking via `createSearchService()`. Admin API was already fixed.

5. ~~**Comment editing does not sanitize HTML**~~ **FIXED** — Both comment creation and edit now call `renderAndSanitize(parsed.content)` to properly render markdown and sanitize HTML for `htmlContent`. The `renderAndSanitize` import from `$lib/markdown` was added to the Hono index.

6. ~~**Visitor hash is plaintext, not hashed**~~ **FIXED** — The `sha256()` helper at `hono/index.ts:322` already hashes `ip:ua` via `crypto.subtle.digest('SHA-256')` before storing. Raw IP/UA is never persisted. Audit incorrectly claimed plaintext storage.

7. ~~**Blog admin search is LIKE-based, not full-text**~~ **FIXED** — Both admin API and public blog index now use FTS5 search service.

8. **No public tag pages** — Tags are displayed and used for filtering on the blog index (`?tag=slug`), but there are no dedicated `/blog/tag/:slug` routes. Tag filtering is query-parameter-based only.

## Minor Issues

- **SEO preview is text-only** — The `seo-panel.svelte` shows a simplified Google-style preview (title + domain + description) but no social card visual preview (Twitter/X card, Facebook share preview). Claim says "Google/social card preview."
- ~~**RSS feed origin is hardcoded**~~ **FIXED** — Now uses `url.origin` from the request URL instead of hardcoded value.
- **Comment threading is limited to one level** — Server explicitly rejects replies to replies (`if (parent.parentId) throw new BadRequestError('Cannot reply to a reply')`). True threaded comments would support arbitrary depth.
- **Spam detector is basic** — Keyword blacklist + pattern matching only. No Akismet, no ML-based detection, no CAPTCHA integration.
- ~~**No comment email notifications**~~ **FIXED** — Comment handler creates in-app notification via `createNotification()` AND sends email via `emailService.sendCommentNotification()` with author preference check (`isEmailEnabled`). Uses `waitUntil` for fire-and-forget delivery.
- **Reading completion threshold is hardcoded** — `progress >= 80 && readTime >= 30` is hardcoded in the analytics endpoint rather than being configurable.
- ~~**Blog index tag filtering loads all posts then filters in JS**~~ **FIXED** — Tag filtering now uses DB-level queries with `inArray` and joins. First fetches post IDs for the tag via `blogPostTag`, then queries posts with `inArray(blogPost.id, postIdArray)` and pagination.

## Files

- `src/lib/server/db/schema.ts` — Blog schema (blogPost, blogTag, blogPostTag, blogSeries, blogPostSeries, blogPostSlugHistory, blogPostRevision, comment, newsletterSubscriber, blogPostView)
- `src/lib/server/hono/index.ts` — All blog API endpoints (posts, tags, series, comments, newsletter, analytics, media, link preview, scheduled publishing)
- `src/lib/server/spam-detector.ts` — Comment spam detection
- `src/lib/markdown.ts` — Markdown rendering, syntax highlighting, DOMPurify sanitization
- `src/lib/editor/article-editor.svelte` — Main TipTap editor component
- `src/lib/editor/editor-toolbar.svelte` — Editor toolbar (formatting, image upload, MD import/export, media library)
- `src/lib/editor/extensions/` — TipTap extensions (pull-quote, figure-image, image-drop, image-reorder, embed-block, link-preview, slash-command, fact-box, related-article, correction-note, update-note, source-block, timeline-block, article-section-embed)
- `src/lib/editor/nodeviews/` — Svelte node views for custom extensions
- `src/lib/editor/utils/extract-toc.ts` — Table of contents extraction
- `src/lib/editor/utils/markdown-export.ts` — HTML-to-Markdown export
- `src/lib/editor/utils/markdown-import.ts` — Markdown-to-HTML import
- `src/lib/editor/utils/clean-paste.ts` — Paste sanitization
- `src/lib/editor/utils/draft-recovery.ts` — Auto-save draft recovery
- `src/lib/components/comment-section.svelte` — Public comment UI
- `src/lib/components/newsletter-signup.svelte` — Newsletter subscribe form
- `src/lib/components/toc-panel.svelte` — Table of contents sidebar
- `src/lib/components/seo-panel.svelte` — SEO/social preview panel
- `src/lib/components/media-library.svelte` — Media library browser
- `src/lib/components/seo-head.svelte` — OG meta tag rendering
- `src/routes/(blog)/blog/+page.server.ts` — Public blog index with pagination and tag filtering
- `src/routes/(blog)/blog/[slug]/+page.server.ts` — Public post page with related posts, series, reading time
- `src/routes/(blog)/blog/feed.xml/+server.ts` — RSS feed
- `src/routes/(blog)/blog/series/[slug]/+page.server.ts` — Public series page
- `src/routes/(admin)/admin/blog/+page.svelte` — Admin blog list
- `src/routes/(admin)/admin/blog/[id]/edit/+page.svelte` — Blog post editor page
- `src/routes/(admin)/admin/blog/[id]/preview/+page.svelte` — Draft preview page
- `src/routes/(admin)/admin/blog/series/+page.svelte` — Admin series management
- `src/routes/(admin)/admin/comments/+page.svelte` — Admin comment moderation
- `src/routes/(admin)/admin/media/+page.svelte` — Admin media library
- `wrangler.jsonc` — Cron triggers (configured but not wired to a `scheduled` handler)
