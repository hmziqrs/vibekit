# Phase 8 — Analytics & Final QA

**Status:** In Progress
**Depends on:** Phase 7 (complete)

## Overview

Wire up the two-stack analytics system (Cloudflare Web Analytics for public, Firebase Analytics for app/admin), gate Firebase behind the consent banner, and perform responsive QA across surfaces.

## Remaining PRD Items (this phase)

- [x] Cloudflare Web Analytics beacon wired on public surfaces
- [x] Firebase Analytics initialized on authenticated surfaces, gated behind consent banner
- [x] Responsive QA
- [x] Performance / bundle review for public pages

## Implementation Plan

### Step 1: Cloudflare Web Analytics Beacon

Add the Cloudflare Web Analytics beacon script to public-facing pages. This is privacy-friendly (cookieless) and doesn't require consent.

**Approach:** Add the beacon script in the public layout (`src/routes/(public)/+layout.svelte`) and blog layout (`src/routes/(blog)/+layout.svelte`), NOT in the root layout (since app/admin don't need it).

The beacon is a lightweight `<script>` tag that sends page view data to Cloudflare. In development, we'll use a placeholder token that gets replaced in production via environment variable.

**Files:**

- `src/routes/(public)/+layout.svelte` — add beacon script
- `src/routes/(blog)/+layout.svelte` — add beacon script

**Note:** Since the beacon requires a Cloudflare site token (obtained after enabling Web Analytics in the dashboard), we'll make it conditional on an environment variable `CF_WEB_ANALYTICS_TOKEN`. If not set, the beacon is not rendered.

### Step 2: Firebase Analytics SDK + Consent Gate

Wire Firebase Analytics into authenticated surfaces, fully gated behind the existing consent banner.

**New files:**

- `src/lib/firebase.ts` — Firebase app initialization + analytics exports
- `src/lib/analytics.svelte.ts` — analytics wrapper that checks consent before sending events

**Update:**

- `src/lib/components/consent-banner.svelte` — export a reactive `consentGiven` signal
- `src/routes/(app)/+layout.svelte` — initialize Firebase Analytics if consent given
- `src/routes/(admin)/+layout.svelte` — initialize Firebase Analytics if consent given
- `src/app.html` — no changes (Firebase loaded dynamically, not via script tag)

**Details:**

- Firebase config read from `PUBLIC_FIREBASE_CONFIG` env var (JSON string, marked as public in `wrangler.jsonc`)
- Analytics module only imports Firebase SDK when consent is `'accepted'`
- If consent is `'declined'` or not set, Firebase is never initialized
- Consent changes are reactive: accepting triggers initialization, declining stops tracking

**Dependency:** `firebase` npm package (analytics submodule only)

### Step 3: Responsive QA

Verify responsive behavior across surfaces:

- `(public)` — mobile-first: test on 375px, 768px, 1024px viewports
- `(app)` — fluid: test on mobile and desktop
- `(admin)` — desktop-first: ensure tables don't break on smaller screens

This is a manual QA pass. Any issues found will be fixed inline.

### Step 4: Performance / Bundle Review

- Check that public pages ship minimal JS (`csr = false` where possible)
- Verify no unnecessary imports in public routes
- Check that admin-only code is dynamically imported

This is an audit. Any issues found will be fixed inline.

### Step 5: Tests

- No new unit tests needed for analytics wiring (it's configuration, not logic)
- Existing tests should still pass
- E2E tests should still pass

## Acceptance Criteria

- [ ] Cloudflare Web Analytics beacon loads on public/blog pages (when token configured)
- [ ] Firebase Analytics initializes only after user accepts consent
- [ ] Declining consent prevents Firebase from loading
- [ ] Public pages remain minimal JS
- [ ] All unit tests pass (103 existing)
