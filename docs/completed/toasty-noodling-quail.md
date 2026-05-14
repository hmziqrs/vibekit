# Newsletter Refactor: Hand-Curated Issues

## Context

The current newsletter system auto-sends the latest blog post. The user wants newsletters to be separate, hand-curated issues that can be standalone content OR reference blog posts. This decouples newsletters from blog posts entirely.

## What Changes

### New: `content/newsletters/` directory

Newsletter issues as markdown with frontmatter:

```yaml
---
title: 'Weekly Notes #1'
date: 2026-05-02
subject: 'Optional email subject line' # defaults to title
posts: # optional, links to blog posts
  - 'building-with-astro-6'
---
Freeform markdown body. Rendered to HTML by the send script.
```

### 1. Queue message shape — `apps/api/src/modules/newsletter/queue.ts`

Rename fields from post-centric to generic:

```ts
export interface NewsletterMessage {
  issueSlug: string // was postSlug
  subject: string // was postTitle → email subject
  htmlBody: string // was postExcerpt → full HTML body
  subscriberId: string
  subscriberEmail: string
  unsubscribeToken: string
}
```

### 2. DB migration — new `0002_newsletter_refactor.sql`

- Rename `post_slug` → `issue_slug` in `newsletter_sent` and `newsletter_deliveries`
- Drop `posts` table (no longer used for validation)

### 3. Send route — `apps/api/src/modules/newsletter/routes/send.ts`

- Remove `posts` table lookup — no more slug validation against D1
- Accept `{ slug, subject, htmlBody }` instead of `{ slug, title, excerpt }`
- Raise `htmlBody` limit to 100KB (was 4096 for excerpt)
- Update SQL to use `issue_slug`

### 4. Queue consumer — `apps/api/src/modules/newsletter/queue-consumer.ts`

- Simplify `generateHTML` — inject `htmlBody` directly into wrapper, no escaping (it's pre-rendered HTML from the author)
- Email subject uses `message.subject` directly (no "New Post:" prefix)
- Update delivery SQL to `issue_slug`

### 5. Send script — `scripts/send-newsletter.ts`

- Accept CLI arg: `bun run newsletter:send <issue-slug>`
- Read from `content/newsletters/{slug}.md`
- Parse frontmatter, render markdown body to HTML (add `marked` as devDependency)
- POST `{ slug, subject, htmlBody }` to API

### 6. Newsletter utils — `scripts/newsletter-utils.ts`

- Add `parseNewsletterIssue(slug)` — reads `content/newsletters/{slug}.md`, parses frontmatter, renders markdown
- Remove `parsePost`, `getLatestPost`, `generateHTML` (no longer needed)

### 7. GitHub workflow — `.github/workflows/send-newsletter.yml`

- Remove auto-trigger on `content/posts/**` push
- Make `workflow_dispatch` only, with `issue_slug` input parameter
- Run: `bun run newsletter:send ${{ inputs.issue_slug }}`

### 8. Admin script — `scripts/newsletter-admin.ts`

- Update SQL queries: `post_slug` → `issue_slug`

### 9. Tests

- `test/send.route.test.ts` — remove `posts` table seeding, update field names
- `test/newsletter-queue.test.ts` — update message shape
- `test/e2e.test.ts` — remove `posts` seeding, update assertions
- `test/integration.test.ts` — same
- `scripts/__tests__/newsletter-send.test.ts` — rewrite for `parseNewsletterIssue`

## What Does NOT Change

- Subscribe/unsubscribe routes — untouched
- Rate limiting (KV) — untouched
- Token derivation (HMAC-SHA256) — untouched
- Blog posts in `content/posts/` — completely unaffected
- Astro site build — newsletters aren't part of it

## Verification

1. Run `bun run test` — all 109+ tests pass with new field names
2. Create a test issue in `content/newsletters/test-issue.md`
3. `bun run db:migrate:staging` — migration applies cleanly
4. `SITE_URL=... NEWSLETTER_SEND_SECRET=... bun run newsletter:send test-issue` — sends successfully
5. Verify email delivery, unsubscribe link works, delivery recorded in D1
