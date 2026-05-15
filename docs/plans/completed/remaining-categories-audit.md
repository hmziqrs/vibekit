---
name: Remaining Categories Audit
description: Comprehensive audit of 6 claimed feature categories against actual implementation
type: project
audit_date: 2026-05-15
source: docs/loop.md (lines 198-275)
---

# Remaining Categories Audit — 2026-05-15

## 1. Feature Management

**Source:** `docs/loop.md` lines 198-202

### Claimed vs Actual

| Claimed Feature                                                                                                                     | Status       | Details                                                                                                                                                                                                                                                             |
| ----------------------------------------------------------------------------------------------------------------------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Feature flags & kill switches (gradual rollout by %/cohort, instant disable without deploy, A/B testing support, flag dependencies) | **COMPLETE** | Full CRUD admin UI, `evaluateFeatureFlag()` with rollout % (hash-based deterministic), kill switch override, environment filtering, dependency chain evaluation. `feature_flag` table with proper indexes.                                                          |
| A/B testing framework (experiment definition, variant assignment, metric tracking, statistical significance calculation)            | **COMPLETE** | `ab_experiment`, `ab_variant`, `ab_assignment`, `ab_event` tables. Hash-based deterministic variant assignment. Z-test for statistical significance with z-score/p-value calculation. Admin UI with results table showing significance levels.                      |
| Configuration service (runtime config without redeploy, environment-specific overrides, config versioning)                          | **COMPLETE** | `config-service.ts` with `getConfigValue()` (env-specific fallback to base), `setConfigValue()` (auto-versions every change), `config_version` table tracking old/new values, timestamps, and who changed them. `systemConfig` table with `configVersion` relation. |

### Critical Gaps

None. All three features are fully implemented with schema, server logic, API endpoints, admin UI, and tests.

### Minor Notes

- Flag evaluation uses a simple hash function (`simpleHash`) rather than a cryptographic hash. Sufficient for rollout but not for security-sensitive cohort rules.
- A/B test statistical significance uses a two-proportion z-test (appropriate for conversion rate comparison) but does not support multi-variant correction (e.g., Bonferroni) when more than 2 variants exist.
- No client-side SDK for flag/experiment evaluation; all checks are server-side API calls.

### Files

- `src/lib/server/feature-flags.ts` — Flag CRUD + evaluation engine
- `src/lib/server/ab-testing.ts` — Experiment lifecycle + statistical analysis
- `src/lib/server/config-service.ts` — Runtime config with versioning
- `src/routes/(admin)/admin/feature-flags/+page.svelte` — Flag management UI
- `src/routes/(admin)/admin/experiments/+page.svelte` — Experiment management UI
- `src/lib/server/db/schema.ts` — `featureFlag`, `abExperiment`, `abVariant`, `abAssignment`, `abEvent`, `systemConfig`, `configVersion` tables

---

## 2. SEO & Performance

**Source:** `docs/loop.md` lines 224-229

### Claimed vs Actual

| Claimed Feature                                                   | Status              | Details                                                                                                                                                                                                                                                                                                                          |
| ----------------------------------------------------------------- | ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Meta tags (title, description, OG, Twitter cards, canonical URLs) | **COMPLETE**        | `seo-head.svelte` component renders `<title>`, `<meta name="description">`, canonical `<link>`, full Open Graph tags (`og:title`, `og:description`, `og:type`, `og:image`, `og:site_name`, `og:url`, `article:published_time`), and Twitter card tags (`twitter:card`, `twitter:title`, `twitter:description`, `twitter:image`). |
| Structured data / JSON-LD                                         | **COMPLETE**        | `seo-head.svelte` injects `<script type="application/ld+json">` with `BlogPosting` schema for articles (author, datePublished, headline, publisher) and `WebSite` schema for non-article pages.                                                                                                                                  |
| sitemap.xml                                                       | **COMPLETE**        | Dynamic endpoint at `src/routes/(public)/sitemap.xml/+server.ts` querying published blog posts and tags from D1. Includes static pages with priorities/changefreq. 1-hour cache-control.                                                                                                                                         |
| robots.txt                                                        | **PARTIAL**         | Static file at `static/robots.txt` with `Allow: /` and sitemap reference. Hardcoded origin `https://vibekit.dev`. Not dynamically generated — will not reflect environment-specific origins.                                                                                                                                     |
| Code splitting                                                    | **PARTIAL**         | `vite.config.ts` has `manualChunks` splitting TanStack, TipTap, and Hono into separate vendor chunks. No lazy loading of route-level components (no `React.lazy`/`import()` patterns for Svelte components).                                                                                                                     |
| Lazy loading images                                               | **PARTIAL**         | Blog listing uses `loading="lazy"` with `decoding="async"` and `fetchpriority` for first image. Other pages (media library, blog detail, series) also use `loading="lazy"`. No `IntersectionObserver`-based lazy loading for off-viewport images.                                                                                |
| Font optimization                                                 | **MINIMAL**         | `font-display: swap` set in `layout.css`. No `preload` links for fonts, no subset/variable font optimization, no font-service usage. System font stack appears to be used.                                                                                                                                                       |
| Critical CSS                                                      | **NOT IMPLEMENTED** | No critical CSS extraction, no inline critical styles in HTML head. Tailwind v4 handles this at build time but there is no explicit critical CSS pipeline.                                                                                                                                                                       |
| Caching strategy (Cache API, stale-while-revalidate)              | **COMPLETE**        | Blog pages use `Cache-Control: public, max-age=300, s-maxage=3600, stale-while-revalidate=60`. Media assets use `s-maxage=604800, stale-while-revalidate=3600`. `cache.ts` provides `purgeBlogCache()` and `purgePatternsCache()` using Cloudflare Cache API. Cache invalidation on mutation exists.                             |
| LCP optimization                                                  | **PARTIAL**         | Blog hero images have explicit dimensions and `object-cover`. Custom `PerformanceObserver` for LCP in `performance.svelte.ts`. Budget thresholds defined (2500ms good, 4000ms poor). No preloading of hero images or font files.                                                                                                 |
| CLS prevention                                                    | **PARTIAL**         | Images use explicit `h-48` / `aspect-video` classes. Custom CLS observer with session windowing. Budget thresholds defined (0.1 good, 0.25 poor). No explicit size reservation for dynamic content (ads, async-loaded sections).                                                                                                 |
| INP measurement                                                   | **COMPLETE**        | Custom `PerformanceObserver` tracking worst interaction duration, reported on `visibilitychange` to `hidden`. Budget thresholds (200ms good, 500ms poor).                                                                                                                                                                        |
| Performance budget enforcement                                    | **NOT IMPLEMENTED** | Budget constants exist in test file only. No build-time enforcement (no `bundlesize`, no Vite `build.rollupOptions.output.chunkSizeWarningLimit`). No CI failure on budget breach.                                                                                                                                               |
| Real-user monitoring (RUM)                                        | **NOT IMPLEMENTED** | Web Vitals are observed client-side and logged to console in dev only (`reportToConsole`). No server-side RUM endpoint, no aggregation, no alerting.                                                                                                                                                                             |
| Bundle analysis                                                   | **NOT IMPLEMENTED** | No `rollup-plugin-visualizer`, no `vite-plugin-bundle-analyzer`, no build stats output.                                                                                                                                                                                                                                          |

### Critical Gaps

1. **No bundle analysis tooling** — Cannot identify oversized chunks or measure code splitting effectiveness.
2. **No performance budget enforcement** — Budget thresholds are test constants only, not enforced in CI or build.
3. **No real-user monitoring** — Web Vitals observed client-side but never sent server-side for aggregation.
4. **No critical CSS pipeline** — Relies entirely on Tailwind v4's default output.
5. **robots.txt is static and hardcoded** — Will break if deployed to a different domain.

### Files

- `src/lib/components/seo-head.svelte` — Meta/OG/Twitter/JSON-LD rendering
- `src/lib/seo.ts` — SEO helper functions
- `src/routes/(public)/sitemap.xml/+server.ts` — Dynamic sitemap
- `static/robots.txt` — Static robots file
- `vite.config.ts` — Code splitting (manualChunks)
- `src/lib/server/cache.ts` — Cache purge utilities
- `src/lib/performance.svelte.ts` — Web Vitals observer (LCP/CLS/INP)
- `src/routes/layout.css` — Font display swap

---

## 3. Infrastructure & DevOps

**Source:** `docs/loop.md` lines 243-251

### Claimed vs Actual

| Claimed Feature                                                                                                                       | Status              | Details                                                                                                                                                                                                                                                                                                              |
| ------------------------------------------------------------------------------------------------------------------------------------- | ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CI/CD pipeline (lint -> typecheck -> test -> build -> preview deploy -> production deploy, branch protection rules)                   | **PARTIAL**         | GitHub Actions CI runs lint -> typecheck -> test -> build (sequential). Deploy workflow deploys to Cloudflare Pages on push to `main`. No preview deploys per PR. No branch protection rules defined in CI (would need repo settings).                                                                               |
| Staging environment (preview deploys per PR, env var management, smoke tests on staging)                                              | **NOT IMPLEMENTED** | No preview/staging deploy step. No smoke test step. `wrangler.jsonc` has `preview_urls: true` but this is a Wrangler CLI feature, not a CI pipeline feature.                                                                                                                                                         |
| Monitoring & observability (structured logging, error tracking Sentry integration, performance monitoring, uptime checks)             | **NOT IMPLEMENTED** | No Sentry integration. No structured logging (uses `console.log`/`console.error` throughout). No uptime monitoring endpoint or external service. No performance monitoring dashboard.                                                                                                                                |
| Health checks & readiness endpoints (liveness probe, dependency health: D1/R2/KV, degraded mode response)                             | **PARTIAL**         | `GET /api/health` checks D1 connectivity and storage health. Returns 200 (healthy) or 503 (degraded). Does NOT check KV or R2 separately (storage check covers R2 only). No separate liveness vs readiness probes. No KV binding exists in wrangler config.                                                          |
| Backup & disaster recovery (D1 backup schedule, point-in-time recovery plan, RTO/RPO targets, restore drill procedure)                | **NOT IMPLEMENTED** | No backup schedule, no PITR plan, no RTO/RPO documentation, no restore procedure. This is a Cloudflare-managed concern (D1 has built-in backups via Cloudflare dashboard), but no documentation or automation exists in the repo.                                                                                    |
| Secret management (rotating BETTER_AUTH_SECRET, Stripe webhook secrets, API keys — no secrets in git, Cloudflare secrets integration) | **PARTIAL**         | No secrets in source code. `wrangler.jsonc` has empty placeholder vars. Cloudflare Workers secrets would be set via `wrangler secret put`. No automated rotation mechanism. A `docs/phases/completed/secret-management.md` documents rotation procedures but no code automates it.                                   |
| Deployment safety (blue-green or canary deploys, automatic rollback on error spike, deploy locks, maintenance mode during migrations) | **PARTIAL**         | No blue-green or canary deployment. No automatic rollback. No deploy locks. Maintenance mode IS implemented via `system_config` table — `hooks.server.ts` checks for `maintenance_mode` key and returns 503. Deploy workflow has `concurrency` group with `cancel-in-progress: false` (prevents concurrent deploys). |
| Dockerfile                                                                                                                            | **NOT IMPLEMENTED** | No Dockerfile exists in the repo. Deployment is Cloudflare Workers only.                                                                                                                                                                                                                                             |

### Critical Gaps

1. **No staging/preview environment** — No PR preview deploys, no smoke tests against a staging target.
2. **No monitoring or observability** — No Sentry, no structured logging, no uptime checks, no error alerting. Production issues are invisible.
3. **No backup/DR plan** — No documented procedure, no automated backups, no restore drills.
4. **No deployment safety** — Direct deploy to production with no rollback mechanism.
5. **No structured logging** — All logging is `console.log`/`console.error` with `JSON.stringify` in some places. No log levels, no correlation IDs, no log aggregation target.

### Files

- `.github/workflows/ci.yml` — CI pipeline (lint/typecheck/test/build)
- `.github/workflows/deploy.yml` — Production deploy
- `wrangler.jsonc` — Cloudflare Workers config
- `src/lib/server/hono/index.ts:520-558` — Health check endpoint
- `src/hooks.server.ts:297-303` — Maintenance mode check
- `src/lib/server/config-service.ts` — Runtime config (maintenance_mode)

---

## 4. Testing & Quality

**Source:** `docs/loop.md` lines 253-261

### Claimed vs Actual

| Claimed Feature                                                                                                                   | Status              | Details                                                                                                                                                                                                                                                                                                                 |
| --------------------------------------------------------------------------------------------------------------------------------- | ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Test infrastructure (Vitest config optimization, test database setup/teardown, mock patterns for D1/R2/KV, test fixtures factory) | **PARTIAL**         | Vitest config exists with `environment: 'node'`, `globals: true`. Unit tests use mocks for D1/R2/KV. No dedicated test database setup/teardown utilities. No fixture factory (tests create data inline).                                                                                                                |
| Unit test coverage (auth flows, billing calculations, permission checks, data transformations)                                    | **COMPLETE**        | 157 unit test files covering auth, billing, validators, services, API routes, search, feature flags, config, email, webhooks, storage, audit, and more.                                                                                                                                                                 |
| Integration tests (API route tests with real D1, auth flow E2E, webhook processing, payment flow)                                 | **PARTIAL**         | Tests are primarily unit-level with mocks. No integration tests using a real D1 instance (all D1 interactions are mocked). Auth flow tests exist as unit tests of auth config, not integration tests.                                                                                                                   |
| E2E tests (Playwright: signup -> verify -> login -> use feature -> logout, admin flows, billing flows, cross-browser)             | **PARTIAL**         | 75 Playwright spec files exist covering auth, admin, billing, blog, search, feature flags, experiments, media, etc. Playwright config uses `browsers: not specified` (defaults to chromium only). No cross-browser configuration (no `projects` for firefox/webkit). Tests run against dev server, not a built preview. |
| Visual regression testing (screenshot comparison, component storybook, responsive breakpoint checks)                              | **NOT IMPLEMENTED** | No Storybook. No `toHaveScreenshot()` calls in Playwright tests. No visual regression framework. No responsive breakpoint testing configuration.                                                                                                                                                                        |
| Performance testing (load testing API endpoints, D1 query benchmarks, worker CPU time limits)                                     | **NOT IMPLEMENTED** | No load testing tools (k6, artillery, locust). No D1 query benchmarking. No worker CPU time measurement. No performance test scripts.                                                                                                                                                                                   |
| Security testing (OWASP ZAP scan, dependency audit automation, secret leak detection in git history, CSRF/XSS regression tests)   | **PARTIAL**         | CSRF and XSS regression tests exist in unit tests (`auth-security.test.ts`, `input-sanitization.test.ts`). No OWASP ZAP integration in CI. No `npm audit` step in CI. No secret leak detection (gitleaks, trufflehog). No dependency audit automation.                                                                  |

### Critical Gaps

1. **No integration tests with real D1** — All database interactions are mocked. Integration gaps between schema, queries, and business logic are untested.
2. **No cross-browser E2E testing** — Playwright config defaults to chromium only. No firefox or webkit projects configured.
3. **No visual regression testing** — No Storybook, no screenshot comparison, no responsive breakpoint tests.
4. **No performance/load testing** — No tools, no scripts, no benchmarks.
5. **No security scanning in CI** — No OWASP ZAP, no dependency audit, no secret scanning.
6. **No test coverage reporting** — `@vitest/coverage-v8` not installed. No coverage thresholds enforced.

### Files

- `vitest.config.ts` — Vitest configuration
- `playwright.config.ts` — Playwright configuration
- `playwright.config.preview.ts` — Preview Playwright config
- `tests/unit/` — 157 unit test files
- `tests/e2e/` — 75 E2E spec files
- `tests/e2e/helpers/auth.ts` — Auth helpers for E2E

---

## 5. Analytics & Tracking

**Source:** `docs/loop.md` lines 263-268

### Claimed vs Actual

| Claimed Feature                                                                                                                    | Status              | Details                                                                                                                                                                                                                                                                                                                                                                             |
| ---------------------------------------------------------------------------------------------------------------------------------- | ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Privacy-first analytics (no cookies without consent, anonymize IPs, respect Do Not Track)                                          | **PARTIAL**         | Firebase Analytics only initializes after explicit consent (`initAnalyticsIfConsented` checks `getConsentStatus()`). No cookies are set without consent. **However**: no IP anonymization code exists, no Do Not Track detection. CF Web Analytics beacon loads unconditionally in public layout (though it is token-gated and token is empty string by default).                   |
| Product analytics (page views, feature usage funnels, user retention cohorts, conversion tracking signup -> activation -> paid)    | **PARTIAL**         | Blog post view tracking exists (`/api/analytics/view`, `/api/analytics/reading` for scroll depth and completion). Admin analytics dashboard shows total views, unique visitors, completion rate, top posts, referrers. **No** feature usage funnels, no retention cohorts, no signup-to-paid conversion tracking.                                                                   |
| Infrastructure analytics (worker execution time, D1 query latency percentiles, R2 bandwidth, cache hit rates, error rate trending) | **NOT IMPLEMENTED** | No worker execution time tracking. No D1 query latency measurement. No R2 bandwidth monitoring. No cache hit rate tracking. No error rate trending. These would require Cloudflare analytics (separate from application code).                                                                                                                                                      |
| Analytics dashboard (admin view with filters, date range selector, export to CSV, scheduled reports)                               | **PARTIAL**         | Admin analytics endpoints (`/analytics/overview`, `/analytics/posts/:postId`) with date range filter (`days` query param, 1-365). No CSV export endpoint. No scheduled reports. No admin UI for analytics (endpoints exist but no dedicated admin page found for analytics dashboard — the admin analytics UI test references it but the actual page component needs verification). |

### Critical Gaps

1. **No IP anonymization** — Analytics requests to `/api/analytics/view` use a `visitorHash` but the hashing is done server-side. The raw IP reaches the worker.
2. **No Do Not Track support** ✅ FIXED — `isDoNotTrack()` checks `navigator.doNotTrack`. `shouldTrack()` short-circuits on DNT.
3. **No product analytics** — Only blog reading metrics. No signup funnels, retention cohorts, or conversion tracking.
4. **No infrastructure analytics** — No worker CPU time, D1 latency, R2 bandwidth, or cache hit rate monitoring.
5. **No CSV export or scheduled reports** — Analytics are API-only with no export capability.
6. **CF Web Analytics beacon loads before consent** ✅ FIXED — `cf-beacon.svelte` is now gated on `shouldTrack()`.

### Files

- `src/lib/analytics.svelte.ts` — Consent-gated analytics init
- `src/lib/firebase.ts` — Firebase Analytics initialization
- `src/lib/use-analytics.svelte.ts` — Analytics composition helper
- `src/lib/components/cf-beacon.svelte` — Cloudflare Web Analytics beacon
- `src/lib/components/reading-tracker.svelte` — Blog reading metrics (scroll depth, completion)
- `src/lib/components/consent-banner.svelte` — Cookie consent UI
- `src/lib/consent.svelte.ts` — Consent state management (localStorage)
- `src/lib/server/hono/index.ts:5906-5962` — Admin analytics overview endpoint
- `src/lib/server/hono/index.ts:5964+` — Post-level analytics endpoint

---

## 6. Compliance & Privacy

**Source:** `docs/loop.md` lines 270-275

### Claimed vs Actual

| Claimed Feature                                                                                                                | Status              | Details                                                                                                                                                                                                                                                                                                                                                                                                              |
| ------------------------------------------------------------------------------------------------------------------------------ | ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GDPR consent management banner                                                                                                 | **COMPLETE**        | Consent banner (`consent-banner.svelte`) with Accept/Decline buttons, focus trap, ARIA dialog role. State persisted in localStorage. Withdrawal available in app settings.                                                                                                                                                                                                                                           |
| Data processing disclosure                                                                                                     | **PARTIAL**         | Privacy policy page lists data collection, use, and protection practices. Does NOT provide a formal data processing disclosure (no DPA, no article 13/14 GDPR information notice specifying legal basis, data categories, retention periods per category, third-country transfers).                                                                                                                                  |
| Right to access automation                                                                                                     | **PARTIAL**         | Data export endpoint (`GET /account/export`) provides full personal data as JSON. Rate-limited to 1/hour. No automated "right to access" request workflow (user must manually trigger export).                                                                                                                                                                                                                       |
| Right to deletion automation                                                                                                   | **PARTIAL**         | Account deletion endpoint (`DELETE /account`) performs soft-delete with 30-day grace period. Search deindex triggered on delete. No hard-delete after grace period (no cron job to purge expired soft-deleted accounts).                                                                                                                                                                                             |
| Right to portability                                                                                                           | **PARTIAL**         | Data export provides JSON. JSON is a machine-readable format per GDPR, but no alternative formats offered. No standardized export schema.                                                                                                                                                                                                                                                                            |
| Cookie consent management                                                                                                      | **PARTIAL**         | Binary accept/decline only. No granular categories (necessary/functional/analytics/marketing). No cookie audit listing all cookies set by the application.                                                                                                                                                                                                                                                           |
| Tracking opt-out                                                                                                               | **PARTIAL**         | Users can decline analytics at consent banner or withdraw later in settings. CF Web Analytics beacon is unconditional (token-gated but not consent-gated).                                                                                                                                                                                                                                                           |
| Data retention policies with auto-deletion                                                                                     | **NOT IMPLEMENTED** | Soft-delete with 30-day grace period for accounts. No automated cleanup of expired soft-deleted data. No retention policies for audit logs, analytics data, or other data categories. Upload sessions have 24h TTL but no cleanup cron.                                                                                                                                                                              |
| Privacy policy version tracking                                                                                                | **NOT IMPLEMENTED** | Privacy policy is a static Svelte page. No version numbering, no change history, no notification mechanism for policy updates.                                                                                                                                                                                                                                                                                       |
| Versioned ToS with acceptance tracking                                                                                         | **NOT IMPLEMENTED** | Terms of service is a static Svelte page. No version tracking, no acceptance logging, no re-acceptance flow on updates.                                                                                                                                                                                                                                                                                              |
| Change notification                                                                                                            | **NOT IMPLEMENTED** | No mechanism to notify users of ToS or privacy policy changes.                                                                                                                                                                                                                                                                                                                                                       |
| Audit compliance logging (immutable audit trail, data access logging, export for compliance audits, retention policy for logs) | **PARTIAL**         | `audit_log` table exists with `writeAuditLog()` service. Records action, entityType, entityId, userId, metadata, timestamp. Table is NOT immutable (no write-once constraint, no append-only trigger, no deletion protection). No dedicated data access logging (audit events are written for admin actions but not for routine data access). No export endpoint for audit logs. No retention policy for audit logs. |

### Critical Gaps

1. **No automated data retention/deletion** — Soft-deleted accounts never hard-delete. Audit logs and analytics data have no TTL or cleanup.
2. **No ToS versioning or acceptance tracking** — Terms are static HTML. No record of which version a user accepted.
3. **Audit log is mutable** ✅ FIXED — Migration `0041_audit_log_immutable.sql` adds `RAISE ABORT` triggers that prevent UPDATE and DELETE on the `audit_log` table.
4. **No granular consent categories** — Binary accept/decline violates GDPR guidance on granular consent.
5. **No DPA documentation** — No Data Processing Agreement template or documentation.
6. **CF Web Analytics bypasses consent** ✅ FIXED — Beacon now gated on `shouldTrack()` which checks consent status.
7. **Privacy policy lacks GDPR-required specifics** — No legal basis disclosure, no data retention periods per category, no third-country transfer information.

### Files

- `src/lib/components/consent-banner.svelte` — Consent UI
- `src/lib/consent.svelte.ts` — Consent state (localStorage)
- `src/routes/(public)/privacy/+page.svelte` — Privacy policy
- `src/routes/(public)/terms/+page.svelte` — Terms of service
- `src/lib/server/audit.ts` — Audit log writer
- `src/lib/server/db/schema.ts:173-190` — `auditLog` table definition
- `src/lib/server/hono/index.ts:1437-1573` — Data export endpoint
- `src/lib/server/hono/index.ts:1580+` — Account deletion endpoint
- `src/lib/components/cf-beacon.svelte` — CF Web Analytics (unconditional)
