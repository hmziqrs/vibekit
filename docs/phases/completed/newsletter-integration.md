# Newsletter Integration

## Status: In Progress

## Overview

Add newsletter subscription to the blog with double opt-in email confirmation. Subscribers are stored in D1, confirmation emails sent via existing EmailClient. No third-party newsletter service required for MVP — uses existing Cloudflare email infrastructure.

## Schema

### `newsletter_subscriber` table

```sql
CREATE TABLE newsletter_subscriber (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','confirmed','unsubscribed','bounced')),
  confirmation_token TEXT NOT NULL UNIQUE,
  confirmed_at INTEGER,
  unsubscribed_at INTEGER,
  source TEXT DEFAULT 'blog',
  ip_address TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch('subsecond') * 1000),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch('subsecond') * 1000)
);
CREATE INDEX newsletter_subscriber_status_idx ON newsletter_subscriber(status);
CREATE INDEX newsletter_subscriber_email_idx ON newsletter_subscriber(email);
CREATE INDEX newsletter_subscriber_token_idx ON newsletter_subscriber(confirmation_token);
```

## Files to Create

1. `drizzle/0025_newsletter.sql` — Migration SQL
2. `src/lib/validators/newsletter.ts` — Zod schemas
3. `src/lib/components/newsletter-signup.svelte` — Reusable signup form
4. `src/routes/(admin)/admin/newsletter/+page.svelte` — Admin subscriber list
5. `src/routes/(admin)/admin/newsletter/+page.ts` — CSR config
6. `tests/unit/newsletter.test.ts` — Unit tests
7. `tests/e2e/newsletter.spec.ts` — E2E tests

## Files to Modify

1. `src/lib/server/db/schema.ts` — Add `newsletterSubscriber` table + relations
2. `src/lib/server/hono/index.ts` — Add newsletter API routes
3. `src/lib/validators/index.ts` — Export newsletter validators
4. `src/routes/(blog)/blog/+page.svelte` — Add newsletter signup
5. `src/routes/(blog)/blog/[slug]/+page.svelte` — Add post-article CTA
6. `src/lib/components/footer.svelte` — Add newsletter section

## Implementation Steps

### Step 1: Schema & Migration

- Add `newsletterSubscriber` table to schema.ts
- Create migration SQL
- Run `bun run db:push:local`

### Step 2: Validators

- `subscribeSchema`: { email: string, name?: string, source?: string }
- Admin routes use existing patterns

### Step 3: API Endpoints

- `POST /api/newsletter/subscribe` — Public, rate-limited, sends confirmation email
- `GET /api/newsletter/confirm` — Validates token, confirms subscription, redirects
- `POST /api/newsletter/unsubscribe` — One-click unsubscribe via token
- `GET /api/admin/newsletter/subscribers` — Admin list with stats
- `DELETE /api/admin/newsletter/subscribers/:id` — Admin remove subscriber

### Step 4: Newsletter Signup Component

- Reusable `NewsletterSignup.svelte` with email input + submit
- States: idle, loading, success, error
- Props: source (blog, footer, post)

### Step 5: Blog Integration

- Add signup form on blog listing page (between search and posts)
- Add CTA on blog post page (after article content, before comments)
- Add to footer

### Step 6: Admin Page

- Subscriber list with DataTable, filter by status
- Stats (pending, confirmed, unsubscribed counts)

### Step 7: Tests

- Unit tests: validators, token logic
- E2E tests: subscribe flow, auth guards, admin page

## Design Decisions

- Double opt-in: subscribers must confirm via email link (GDPR/CAN-SPAM compliance)
- Confirmation token is UUID v7, expires after 24 hours (checked against createdAt)
- Re-subscribing an unsubscribed email sends new confirmation
- Already-confirmed emails return friendly "already subscribed" message
- No third-party service dependency for MVP — uses existing EmailClient
- Token passed as query param in confirmation link
- Unsubscribe is one-click via token in email footer
