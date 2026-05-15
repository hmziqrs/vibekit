# Ralph Loop Prompt: Vibekit Project Roadmap

## Context

Vibekit is a SvelteKit SaaS boilerplate on Cloudflare Workers. This loop builds a planning document (`ROADMAP.md`) that catalogs every gap, feature, and infrastructure need. The document itself is a lightweight skeleton — one or two lines per phase. All detail is discovered at runtime by subagents exploring the codebase.

## The Prompt

Copy the block below into a new Claude Code session to start the loop:

---

````
/loop

Build and refine ROADMAP.md — a planning document for this SvelteKit/Cloudflare Workers project.

## Global Rules

- No code in ROADMAP.md. Bullet-point references only.
- No `any`, no `unknown`, no type hacks. Everything must be properly typed.
- All new code must pass `bun run check`, `bun run lint`, `bun run format:check`.
- Tests are mandatory. No untested code ships.
- Use Sonnet subagents for all exploration and research.

## MCP Tools for Exploration & Research

Subagents MUST use these tools during investigation cycles:

### ZAI Cloud MCPs (built-in, no setup required)
- **`mcp__4_5v_mcp__analyze_image`** — AI vision analysis. Use to:
  - Analyze UI screenshots for design gaps, accessibility issues, layout problems
  - Compare rendered pages against design specs or screenshots
  - Verify visual regression by analyzing before/after screenshots
  - Extract text/layout from images of wireframes or mockups
- **`mcp__web_reader__webReader`** — Fetch and convert any URL to LLM-friendly input. Use to:
  - Read library documentation pages, changelogs, migration guides
  - Fetch GitHub issues, PR descriptions, release notes
  - Read Cloudflare Workers/D1/R2 docs for platform-specific guidance
  - Extract structured content from any web page for research
- **`WebSearch`** (built-in) — Web search for current information. Use to:
  - Find latest library versions and breaking changes
  - Research best practices for SaaS patterns
  - Look up Cloudflare Workers platform limits and features
  - Find security advisories relevant to dependencies

### Plugin MCPs
- **`mcp__plugin_context7_context7__resolve-library-id`** + **`mcp__plugin_context7_context7__query-docs`** — Fetch up-to-date library docs with code examples. Use to:
  - Get accurate API signatures for Svelte 5, TanStack, Drizzle, Better Auth
  - Verify migration paths between library versions
  - Find idiomatic patterns for the exact versions in use
- **`mcp__plugin_playwright_playwright__*`** — Browser automation. Use to:
  - Test actual rendered pages in the dev server
  - Verify form submissions, navigation, auth flows
  - Capture screenshots for visual review
  - Test responsive layouts at different viewport sizes
  - Verify accessibility with snapshot-based testing

### How to use MCPs in exploration cycles
- Agent 1 (trace implementation): Use `grep`, `Read`, `LSP` tools on local codebase
- Agent 2 (find gaps/TODOs): Use `grep`, `Read` on local codebase + `mcp__web_reader__webReader` to read any referenced docs
- Agent 3 (research): Use `WebSearch` for discovery → `mcp__web_reader__webReader` for deep reads → `mcp__plugin_context7_context7__query-docs` for library-specific patterns
- Visual verification: Use `mcp__plugin_playwright_playwright__browser_snapshot` / `browser_take_screenshot` + `mcp__4_5v_mcp__analyze_image` to audit rendered UIs

## Document Format

ROADMAP.md has two parts:

### Part 1: Rules & Standards (static, written once)
- TypeScript strict mode, no `any`/`unknown` casts
- Must pass: `bun run check`, `bun run lint`, `bun run format:check`, `bun run test`
- New features require E2E tests
- All server code uses `$lib/server/` — never imported from client
- Svelte 5 runes only (no legacy syntax)
- Use semantic color tokens from `layout.css` (no hardcoded hex/Tailwind colors)
- Use `cn()` from `$lib/utils` for class merging
- Every user-facing action must have loading, error, and empty states
- All forms must validate with Zod schemas (server + client)
- All API routes return typed responses (never raw `Response` without typing)
- Keyboard accessible: all interactive elements reachable via Tab, activated via Enter/Space
- Responsive: test at 320px, 768px, 1024px, 1440px breakpoints minimum

### Part 2: Implementation Phases (iterative)
Each phase is one or two lines max. Subagents discover all detail at runtime.

#### Foundation & DX
<!-- Audit: foundation-dx-audit.md — 2026-05-15 -->
- [x] Dev environment & DX (hot reload reliability, wrangler dev stability, env setup script, seed data, type generation pipeline)
- [x] Database schema review & normalization (index coverage, constraint gaps, migration safety, foreign key integrity, cascade rules)
- [x] Dead code cleanup (unused exports, orphan routes, unreachable branches, stale types, dead CSS)
- [x] Error handling framework (global error boundary, API error standardization, ProblemDetails RFC 7807, error code registry, user-facing error messages)
- [x] Error pages (custom 400/403/404/500/503 pages, brand-consistent design, helpful recovery actions, no raw stack traces in production)

#### Auth & Security
<!-- Audit: auth-security-audit.md — 2026-05-14 -->
- [x] Auth security hardening (session fixation, CSRF tokens, cookie flags, token rotation, brute-force protection on login/register)
- [x] Password security (breached password check via HaveIBeenPwned API, password strength estimator, password strength UI component, enhanced password validator)
- [x] Two-factor authentication (TOTP apps, backup/recovery codes, remember device, 2FA enforcement per-role/per-org)
- [x] Passkey / WebAuthn support (platform authenticators, cross-device auth, credential management UI)
- [x] OAuth & social login hardening (PKCE flow verification, state parameter validation, account linking conflicts, provider-specific edge cases)
- [x] Session & device management (list active sessions, remote logout, device fingerprinting, session IP/user-agent tracking, concurrent session limits)
- [x] Security alerts & anomaly detection (new device/IP notification, password/2FA change alerts, suspicious login location, failed login thresholds)
- [x] Security headers & CSP (Content-Security-Policy with nonce-based script-src, HSTS preload, X-Frame-Options, COOP, CORP, referrer policy, permissions policy)
- [x] Rate limiting & abuse prevention (API throttling per-route, auth brute-force lockout, progressive backoff, action quotas per tier, D1 query limits)
- [x] Input sanitization & validation (DOMPurify for all HTML rendering, SQL injection prevention audit, XSS surface review, upload file type validation)

#### Core User Features
<!-- Audit: core-user-features-audit.md — 2026-05-14 -->
- [x] User profile & settings (avatar upload, display name, bio, timezone, language preference, notification preferences, delete account flow)
- [x] User account lifecycle (email verification flow, account deactivation vs deletion, data retention policy, re-enable flow, grace period before permanent deletion)
- [x] User banning system (temporary/permanent ban with reason, appeal flow, automatic content unpublish on ban, ban evasion detection via email/IP)
- [x] User data export / portability (one-click full data download as JSON/ZIP, GDPR compliance, scheduled exports for large datasets)
- [x] Onboarding flow (guided setup wizard, feature discovery tooltips, progressive disclosure, skip/resume capability, role-based onboarding paths)
- [x] Dashboard (activity feed, quick actions, usage metrics, recent items, workspace overview, customizable widgets)

#### Organizations & Teams
<!-- Audit: organizations-teams-audit.md — 2026-05-14 -->
- [x] Organizations & teams (org CRUD, member management, role assignment, team-scoped resources, org settings, transfer ownership)
- [x] RBAC & permissions system (role definitions, permission granularity, role hierarchy, custom roles, permission inheritance in org hierarchy)
- [x] Organization billing (org-level subscriptions, seat-based pricing, billing owner transfer, split billing across teams)
- [x] Team collaboration features (shared workspaces, resource ownership, activity feed per-team, @mentions, team settings)

#### Admin & Moderation
<!-- Audit: admin-moderation-audit.md — 2026-05-14 -->
- [x] Admin dashboard (system health, user growth metrics, revenue overview, active sessions, error rates, search/filter capabilities)
- [x] Admin user management (user list with search/filter, user detail view, impersonation, manual actions, bulk operations)
- [x] Admin sudo / impersonation mode (admin acts on behalf of user with full audit trail, time-limited sessions, explicit reason logging)
- [x] User audit log & activity tracking (dispute resolution, security reviews, compliance trails, immutable log entries, export for compliance)
- [x] Content moderation tools (flagged content queue, automated rules, moderator actions, appeal system, moderation log)
- [x] System configuration management (feature flags UI, maintenance mode toggle, email template editor, system announcements)
- [x] Maintenance mode & scheduled broadcasts (global downtime banners, planned maintenance notices, user notification, auto-enable/disable)

#### Blog Platform
<!-- Audit: blog-platform-audit.md — 2026-05-14 -->
- [x] Blog platform — full-fledged publishing system:
  - [x] Markdown editor with toolbar, split-pane preview, keyboard shortcuts (Milkdown / TipTap / CodeMirror+preview)
  - [x] Inline image upload-insert flow inside the editor body (upload to R2 → insert markdown image syntax)
  - [x] Syntax highlighting for code blocks (highlight.js, rendered server-side, CSS class-based)
  - [x] Tag system: wire up dead tagIds code — tag CRUD API, tag selector in editor, public tag pages, tag display on posts
  - [x] Pagination on public blog index (cursor or offset, load more or page nav)
  - [x] Author attribution on public posts (join user table for display name, author profile link)
  - [x] Reading time estimation on posts
  - [x] Table of contents auto-generated from headings
  - [x] Replace regex sanitization with DOMPurify
  - [x] RSS/Atom feed endpoint
  - [x] Draft preview (shareable link or admin-only preview route)
  - [x] Delete button on the blog edit page
  - [x] Audit log writes on blog mutations
  - [x] Cover image preview in editor (not just URL)
  - [x] Drag-and-drop image reordering for inline images (HTML5 Drag API, grip handle, drop line indicator, ProseMirror plugin)
  - [x] Link card / oEmbed support (Twitter, YouTube, GitHub gists, embed provider detection, oEmbed discovery, conditional rendering)
  - [x] SEO preview (Google/social card preview in editor sidebar)
  - [x] Full-text content search (admin side minimum, searches title + slug + excerpt + contentBody across admin, editor, and public surfaces)
  - [x] Scheduled publishing (set future publishedAt, cron promotes drafts)
  - [x] Related posts by tag overlap on single post page
  - [x] Copy-as-markdown option when viewing a post
  - [x] Series/collection support (group posts into named series with ordering)
  - [x] Comment system (threaded comments, moderation queue, spam filtering)
  - [x] Newsletter integration (subscribe on blog, Mailchimp/Resend sync)
  - [x] Analytics per post (view count, referrer tracking, reading completion)

#### Billing & Payments
<!-- Audit: billing-deep-audit.md — 2026-05-15 -->
- [x] Subscription management (plan CRUD, plan comparison page, upgrade/downgrade flows, trial periods)
- [x] Gap: Proration handling — calculateProration() now called in changeSubscriptionPlan(), returns proration amount in API response
- [x] Payment processing (Stripe integration, checkout sessions, invoice generation, payment failure detection)
- [x] Gap: Payment method management — synced via payment_method.attached/detached webhook events
- [x] Gap: Dunning emails — 5 billing email templates created (payment failed, payment succeeded, subscription canceled, trial ending soon, plan changed) with HTML/text versions; wired into Stripe webhook handlers
- [x] Usage-based billing infrastructure (metered billing tables, usage recording API)
- [x] Gap: Quota enforcement — checkUsageLimit() now called in POST /billing/usage, rejects over-limit
- [x] Gap: Usage dashboard — GET /billing/usage endpoint returns current usage and limits
- [x] Gap: Overage handling — checkUsageLimit returns overage cost/rate/units; POST /billing/usage allows overage when plan has overagePricing in features JSON; hard-rejects when rate is 0
- [x] Billing admin (plan management, subscription overview, invoice listing)
- [x] Gap: Revenue metrics — MRR/ARR/ARPU/net revenue/churn/trial counts added to getBillingOverview()
- [x] Gap: Refund processing — admin refund endpoint (POST /api/admin/billing/refund) calls Stripe refunds API, marks invoice void; charge.refunded webhook handles automatic Stripe-initiated refunds
- [x] Gap: Discount/coupon management — coupon table, admin CRUD, Stripe coupon sync, user redemption endpoint, validators
- [x] Gap: Tax configuration — taxRate/taxInclusive on subscriptionPlan, calculateTax() utility, Stripe automatic_tax enabled at checkout when taxRate > 0, taxAmountInCents on invoice
- [x] Payment webhooks (Stripe webhook handler, idempotent processing with eventId dedup)
- [x] Gap: Missing webhook events — added 6 more: trial_will_end, subscription.created, payment_method.attached/detached, charge.refunded, checkout.session.expired
- [x] Gap: Failure recovery — stripeWebhookEvent now tracks status/retryCount/nextRetryAt/errorMessage; catch block records failures; admin endpoints for viewing and retrying failed events

#### Notifications & Communication
<!-- Audit: notifications-audit.md — 2026-05-14 -->
- [x] In-app notification system (notification bell, real-time updates, read/unread state, notification types, bulk actions, notification preferences)
- [x] System-to-user alerts (payment receipts, admin warnings, broadcast announcements, account status changes)
- [x] Email infrastructure (template system with preview, transactional emails, email queue with retries, bounce handling, unsubscribe flow)
- [x] Email templates (welcome, verification, password reset, invoice, subscription changes, team invites, security alerts, custom templates via editor)
- [x] Push notifications (Web Push API, subscription management, notification click actions, browser compatibility)
- [x] Slack/Discord integration (workspace notifications, command slash commands, webhook delivery, channel-specific alerts)

#### API & Integrations
<!-- Audit: api-integrations-audit.md — 2026-05-14 -->
- [x] API key management (scoped tokens, key rotation, usage logging, key revocation, per-key rate limits)
- [x] Webhooks & event bus (outbound webhook delivery, retry with exponential backoff, event subscription UI, payload signing, delivery logs)
- [x] Public API documentation (OpenAPI spec generation, interactive API explorer, code examples in multiple languages, authentication guide)
- [x] Third-party integrations framework (OAuth connector pattern, integration catalog, per-user credentials, connection health monitoring)
- [x] Zapier/n8n connector (expose actions and triggers for no-code automation platforms)

#### Feature Management
<!-- Audit: remaining-categories-audit.md — 2026-05-14 -->
- [x] Feature flags & kill switches (gradual rollout by %/cohort, instant disable without deploy, A/B testing support, flag dependencies)
- [x] A/B testing framework (experiment definition, variant assignment, metric tracking, statistical significance calculation)
- [x] Configuration service (runtime config without redeploy, environment-specific overrides, config versioning)

#### File Storage & Media
<!-- Audit: file-storage-audit.md — 2026-05-15 -->
- [x] File upload pipeline (single-request upload, file type validation with magic bytes, upload session tracking infrastructure)
- [x] Media library (file browser with grid/list, type filters, search by filename, pagination, bulk delete)
- [x] Image processing (Cloudflare Image Resizing URL builders, responsive srcset generation, CDN URL generation)
- [x] Storage adapter abstraction (R2 primary, S3-compatible fallback, local dev filesystem adapter, GET presigned URLs)
- [x] Gap: Chunked upload — chunk data transfer to temp dir, assembly via assembleChunks(), POST /uploads/session/:id/complete endpoint stores assembled file via storage adapter
- [x] Gap: Virus scanning — scanBuffer() detects PE/ELF/MachO/EICAR signatures; integrated into media and blog upload endpoints; 422 rejection for threats
- [x] Gap: Thumbnail generation — generateThumbnail() service, POST /storage/thumbnail admin endpoint, Cloudflare Image Resizing URL helper, configurable sizes
- [x] Gap: Presigned URLs — putPresignedUrl added to StorageClient interface, implemented in S3/R2/filesystem adapters; POST /storage/presign-get and POST /storage/presign-put endpoints

#### Search
<!-- Audit: search-audit.md — 2026-05-15 -->
- [x] Full-text search infrastructure (D1/FTS5 adapter, index management, admin reindex)
- [x] Search UI (debounced search, entity type filters, result previews with highlighting, keyboard navigation, recent searches)
- [x] Content indexing (blog posts + items + users fully indexed with create/update/delete hooks; comments not indexed)
- [x] Gap: User indexing fixed — create via databaseHooks in auth.ts, deindex on self-delete and admin delete
- [x] Gap: Blog search endpoint now uses FTS5 via search service instead of raw SQL LIKE
- [x] Gap: Search relevance tuning — bm25() with configurable column weights (title 10x, content 1x, metadata 0.5x, entityType 0x); SearchWeights interface for custom overrides

#### SEO & Performance
<!-- Audit: remaining-categories-audit.md — 2026-05-14 -->
- [x] SEO foundation (meta tags, Open Graph, Twitter cards, canonical URLs, sitemap.xml, dynamic robots.txt, structured data/JSON-LD)
- [x] Performance optimization (code splitting audit, bundle analysis, lazy loading images/components, font optimization, critical CSS)
- [x] Caching strategy (Cache API usage review, stale-while-revalidate patterns, cache invalidation on mutation, edge caching rules)
- [x] Core Web Vitals (LCP optimization, CLS prevention, INP measurement, performance budget enforcement, real-user monitoring)

#### i18n & Accessibility
<!-- Audit: i18n-audit.md — 2026-05-15 -->
- [x] i18n completion (83 translation keys defined, Paraglide runtime, HTML lang/dir attributes, language switcher component)
- [x] i18n tooling (missing translation detection script, ICU message format, key parity tests)
- [x] Gap: Translation keys wired in app sidebar, admin sidebar, and search dialog components; i18n check added to CI pipeline
- [x] Gap: 27 components replaced hardcoded 'en-US' date/number formatting with locale-aware formatDate/formatNumber from $lib/i18n.svelte
- [x] Gap: RTL-aware CSS — replaced LTR-specific classes (ml-, mr-, pl-, pr-, left-, right-, border-l/r) with logical properties (ms-, me-, ps-, pe-, start-, end-, border-s/e) across layouts and core components
- [x] Gap: Language switcher moved into app and admin sidebar navigation (user section)
- [x] Gap: i18n check script added to GitHub Actions CI pipeline
- [x] Accessibility audit (WCAG 2.2 AA compliance, screen reader testing, focus management, skip links, ARIA attributes, reduced motion support)
- [x] Keyboard navigation (focus traps in modals, roving tabindex in lists, shortcut collision detection, keyboard shortcuts help panel)

#### Infrastructure & DevOps
<!-- Audit: remaining-categories-audit.md — 2026-05-14 -->
- [x] CI/CD pipeline (GitHub Actions: lint → typecheck → test → build → preview deploy → production deploy, branch protection rules)
- [x] Staging environment (preview deploys per PR, environment variable management, smoke tests on staging)
- [x] Monitoring & observability (structured logging, error tracking Sentry integration, performance monitoring, uptime checks)
- [x] Health checks & readiness endpoints (liveness probe, dependency health: D1/R2/KV connectivity, degraded mode response)
- [x] Backup & disaster recovery (D1 backup schedule, point-in-time recovery plan, RTO/RPO targets documented, restore drill procedure)
- [x] Secret management (rotating BETTER_AUTH_SECRET, Stripe webhook secrets, API keys — no secrets in git, Cloudflare secrets integration)
- [x] Deployment safety (blue-green or canary deploys, automatic rollback on error spike, deploy locks, maintenance mode during migrations)

#### Testing & Quality
<!-- Audit: remaining-categories-audit.md — 2026-05-14 -->
- [x] Test infrastructure (Vitest config optimization, test database setup/teardown, mock patterns for D1/R2/KV, test fixtures factory)
- [x] Unit test coverage (critical business logic: auth flows, billing calculations, permission checks, data transformations)
- [x] Integration tests (API route tests with real D1, auth flow E2E, webhook processing, payment flow happy path + failures)
- [x] E2E tests (Playwright: signup → verify → login → use feature → logout, admin flows, billing flows, cross-browser)
- [x] Visual regression testing (screenshot comparison on key pages, component storybook, responsive breakpoint checks)
- [x] Performance testing (load testing API endpoints, D1 query performance benchmarks, worker CPU time limits testing)
- [x] Security testing (OWASP ZAP scan, dependency audit automation, secret leak detection in git history, CSRF/XSS regression tests)

#### Analytics & Tracking
<!-- Audit: remaining-categories-audit.md — 2026-05-14 -->
- [x] Analytics foundation (event tracking architecture, privacy-first: no cookies without consent, anonymize IPs, respect Do Not Track)
- [x] Product analytics (page views, feature usage funnels, user retention cohorts, conversion tracking signup → activation → paid)
- [x] Infrastructure analytics (worker execution time, D1 query latency percentiles, R2 bandwidth, cache hit rates, error rate trending)
- [x] Analytics dashboard (admin view with filters, date range selector, export to CSV, scheduled reports)

#### Compliance & Privacy
<!-- Audit: remaining-categories-audit.md — 2026-05-14 -->
- [x] GDPR compliance (consent management banner, data processing disclosure, right to access/deletion/portability automation, DPA documentation)
- [x] Privacy controls (cookie consent management, tracking opt-out, data retention policies with auto-deletion, privacy policy version tracking)
- [x] Terms of service (versioned ToS, acceptance tracking, change notification, enforce re-acceptance on major updates)
- [x] Audit compliance logging (immutable audit trail, data access logging, export for compliance audits, retention policy for logs)

## Task Completion Protocol

EVERY task MUST complete this full sequence before moving to the next task. No exceptions.

### Step 1: Implement the feature/fix
- Write the code for the current task
- Follow all Rules & Standards from Part 1

### Step 2: Run existing test suite
- Run `bun run test` and confirm ALL existing tests pass
- If any pre-existing tests break, fix them before proceeding — never leave a broken test suite
- Run `bun run check` + `bun run lint` + `bun run format:check` — all must pass clean

### Step 3: Browser agent E2E verification
For the feature just implemented, use the Playwright browser agent to manually walk through the workflow:
1. Start dev server (`bun run dev`) if not already running
2. Open the relevant page via `browser_navigate`
3. Walk through the **entire user workflow** step by step:
   - Fill forms, click buttons, navigate between pages
   - Test the happy path AND at least one error/edge case
   - Verify the feature works end-to-end as a real user would experience it
4. Take screenshots at key points via `browser_take_screenshot`
5. Analyze screenshots via `mcp__4_5v_mcp__analyze_image` for visual issues
6. If anything is broken or looks wrong, fix it and re-test

### Step 4: Write E2E test
Based on the browser walkthrough from Step 3, write a Playwright E2E test that covers:
- The full user workflow verified in Step 3
- Happy path + at least one failure/edge case
- All assertions that confirm correct behavior
- Place test in `tests/e2e/` following existing naming patterns

### Step 5: Write unit tests
Write Vitest unit tests for:
- All new functions, utilities, and business logic
- All new API route handlers
- All new server-side logic
- Place tests alongside source files (e.g., `foo.ts` → `foo.test.ts`)
- Run `bun run test` to confirm new + all existing tests pass

### Step 6: Final validation gate
Run the full quality suite in order — ALL must pass:
```bash
bun run test           # All tests (unit + integration) pass
bun run check          # Type checking passes
bun run lint           # Lint passes
bun run format:check   # Formatting passes
````

If any check fails, fix it and re-run from the top. Do not proceed until all four are green.

### Step 7: Commit

Once all checks pass:

1. `git add` only the files changed for this task (no unrelated changes)
2. Commit with a descriptive message referencing what was done
3. Commit message format: `<type>: <description>` (e.g., `feat: add 2FA TOTP setup flow`, `fix: session fixation on password change`)
4. Do NOT push — just commit locally

### Step 8: Mark task complete and move on

- Mark the task as `[x]` in ROADMAP.md
- Move to the next unchecked task
- Start again from Step 1

## Loop Behavior

Each cycle:

1. Read ROADMAP.md current state
2. Pick the next unchecked phase
3. Launch 2-3 Explore subagents (Sonnet) to investigate:
   - Agent 1: Trace current implementation (routes, APIs, schema, components) using `grep`, `Read`, `LSP`
   - Agent 2: Find gaps, TODOs, unused code, missing error handling. Use `mcp__web_reader__webReader` to read any referenced external docs
   - Agent 3: Research using `WebSearch` → `mcp__web_reader__webReader` for deep reads → `mcp__plugin_context7_context7__query-docs` for library-specific patterns. Use `mcp__4_5v_mcp__analyze_image` if analyzing screenshots/mockups
4. Expand that phase into actionable sub-bullets — still no code, just what needs to happen
5. For each sub-bullet, execute the full Task Completion Protocol (Steps 1–8 above)
6. Mark phase as `[x]` when all sub-bullets are implemented, tested, and committed
7. When all phases are `[x]`, stop the loop

### Visual Verification (when applicable)

During Step 3 of the Task Completion Protocol, for UI/UX work:

1. Start dev server: `bun run dev`
2. Navigate to relevant pages using `mcp__plugin_playwright_playwright__browser_navigate`
3. Walk through the full workflow as a real user
4. Take screenshots at key moments: `mcp__plugin_playwright_playwright__browser_take_screenshot`
5. Analyze for visual/accessibility issues: `mcp__4_5v_mcp__analyze_image`
6. Test responsive layouts at 320px, 768px, 1024px, 1440px using `browser_resize`

Start with auth security hardening — it's the most blocking gap.

````

## Verification

1. Copy the prompt block (between the ``` fences)
2. Start a new Claude Code session in the vibekit directory
3. Paste as your first message
4. The loop creates `ROADMAP.md` and iterates through each phase
5. Each cycle discovers real gaps from the codebase — nothing is pre-filled
6. MCP tools are used throughout for research, documentation lookup, and visual verification
````
