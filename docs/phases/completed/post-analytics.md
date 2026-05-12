# Post Analytics Implementation Plan

## Status: In Progress

## Overview

Add per-blog-post analytics: view counting, referrer tracking, and reading completion tracking.

## Architecture

### Database Schema

#### `blog_post_view` table

Tracks individual page views for each blog post.

| Column          | Type                  | Notes                                   |
| --------------- | --------------------- | --------------------------------------- |
| id              | TEXT PK               | UUID v7                                 |
| postId          | TEXT FK → blogPost.id | Which post was viewed                   |
| visitorHash     | TEXT                  | Hashed IP+UA for dedup (no raw PII)     |
| referrer        | TEXT NULL             | HTTP Referer header (trimmed to origin) |
| referrerDomain  | TEXT NULL             | Extracted domain from referrer          |
| userAgent       | TEXT NULL             | Browser/device category only            |
| country         | TEXT NULL             | CF-IPCountry header                     |
| readingProgress | INTEGER DEFAULT 0     | 0-100 percentage scrolled               |
| readTime        | INTEGER NULL          | Seconds spent on page                   |
| isCompleted     | INTEGER DEFAULT 0     | Boolean: read to end (>=80% + 30s)      |
| createdAt       | INTEGER               | Unix ms timestamp                       |

Indexes:

- `blog_post_view_post_created_idx` on (postId, createdAt) — for time-series queries
- `blog_post_view_post_visitor_idx` on (postId, visitorHash) — for dedup

#### Add `viewCount` column to `blogPost`

- `viewCount INTEGER NOT NULL DEFAULT 0` — denormalized counter for fast reads

### API Routes

#### Public routes (no auth required)

**POST /api/analytics/view** — Record a page view

- Body: `{ postId: string, referrer?: string }`
- Dedup: Hash IP+UA, skip if same visitor viewed same post within 1 hour
- Increment blogPost.viewCount if new unique view
- Rate limited: 30/min per IP

**POST /api/analytics/reading** — Update reading progress

- Body: `{ postId: string, progress: number (0-100), readTime: number (seconds) }`
- Updates existing view record's readingProgress and readTime
- Sets isCompleted when progress >= 80 AND readTime >= 30
- Rate limited: 10/min per IP

#### Admin routes (require admin auth)

**GET /api/admin/analytics/posts/:postId** — Per-post analytics

- Returns: total views, unique views, avg read time, completion rate
- Returns: daily view counts (last 30 days)
- Returns: top referrers with counts

**GET /api/admin/analytics/overview** — Blog-wide analytics

- Returns: total views, total unique visitors, avg completion rate
- Returns: top posts by views, trending posts (last 7 days)
- Returns: referrer breakdown

### Components

#### `ReadingTracker` (Svelte component)

- Client-side component loaded on blog post pages
- Uses IntersectionObserver + scroll events to track reading progress
- Sends periodic progress updates to /api/analytics/reading
- Debounced updates (every 15 seconds or on significant progress change)
- Tracks time on page via `performance.now()`

### Admin UI

#### `/admin/analytics` page

- Overview stats cards: Total Views, Unique Visitors, Avg Read Time, Completion Rate
- Top posts table with view counts
- Referrer breakdown
- Date range filter (7d, 30d, 90d, all time)

#### Blog post admin list enhancement

- Show view count column in existing blog admin table

### Validators

#### `recordViewSchema`

- postId: string (required, UUID)
- referrer: string (optional, max 500, trimmed)

#### `recordReadingSchema`

- postId: string (required, UUID)
- progress: number (0-100, integer)
- readTime: number (>= 0, integer)

### Files to Create/Modify

**New files:**

- `drizzle/0026_post_analytics.sql` — Migration
- `src/lib/validators/analytics.ts` — Zod schemas
- `src/lib/components/reading-tracker.svelte` — Client-side tracking component
- `src/routes/(admin)/admin/analytics/+page.svelte` — Admin analytics page
- `src/routes/(admin)/admin/analytics/+page.ts` — CSR config
- `tests/unit/post-analytics.test.ts` — Unit tests
- `tests/e2e/post-analytics.spec.ts` — E2E tests

**Modified files:**

- `src/lib/server/db/schema.ts` — Add blogPostView table, viewCount column on blogPost
- `src/lib/server/hono/index.ts` — Add analytics API routes
- `src/lib/validators/index.ts` — Export analytics validators
- `src/routes/(blog)/blog/[slug]/+page.svelte` — Add ReadingTracker component
- `src/routes/(admin)/admin/blog/+page.svelte` — Add view count column
