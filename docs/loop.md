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
- [x] Dev environment & DX (hot reload reliability, wrangler dev stability, env setup script, seed data, type generation pipeline)
- [x] Database schema review & normalization (index coverage, constraint gaps, migration safety, foreign key integrity, cascade rules)
- [x] Dead code cleanup (unused exports, orphan routes, unreachable branches, stale types, dead CSS)
- [x] Error handling framework (global error boundary, API error standardization, ProblemDetails RFC 7807, error code registry, user-facing error messages)
- [x] Error pages (custom 400/403/404/500/503 pages, brand-consistent design, helpful recovery actions, no raw stack traces in production)

#### Auth & Security
- [x] Auth security hardening (session fixation, CSRF tokens, cookie flags, token rotation, brute-force protection on login/register)
- [ ] Password security (breached password check via HaveIBeenPwned API, password strength estimator, forced rotation policy, passwordless login options)
- [ ] Two-factor authentication (TOTP apps, backup/recovery codes, remember device, 2FA enforcement per-role/per-org)
- [ ] Passkey / WebAuthn support (platform authenticators, cross-device auth, credential management UI)
- [ ] OAuth & social login hardening (PKCE flow verification, state parameter validation, account linking conflicts, provider-specific edge cases)
- [ ] Session & device management (list active sessions, remote logout, device fingerprinting, session IP/user-agent tracking, concurrent session limits)
- [ ] Security alerts & anomaly detection (new device/IP notification, password/2FA change alerts, suspicious login location, failed login thresholds)
- [ ] Security headers & CSP (Content-Security-Policy, HSTS preload, X-Frame-Options, referrer policy, permissions policy)
- [ ] Rate limiting & abuse prevention (API throttling per-route, auth brute-force lockout, progressive backoff, action quotas per tier, D1 query limits)
- [ ] Input sanitization & validation (DOMPurify for all HTML rendering, SQL injection prevention audit, XSS surface review, upload file type validation)

#### Core User Features
- [ ] User profile & settings (avatar upload, display name, bio, timezone, language preference, notification preferences, delete account flow)
- [ ] User account lifecycle (email verification flow, account deactivation vs deletion, data retention policy, re-enable flow, grace period before permanent deletion)
- [ ] User banning system (temporary/permanent ban with reason, appeal flow, automatic content unpublish on ban, ban evasion detection via email/IP)
- [ ] User data export / portability (one-click full data download as JSON/ZIP, GDPR compliance, scheduled exports for large datasets)
- [ ] Onboarding flow (guided setup wizard, feature discovery tooltips, progressive disclosure, skip/resume capability, role-based onboarding paths)
- [ ] Dashboard (activity feed, quick actions, usage metrics, recent items, workspace overview, customizable widgets)

#### Organizations & Teams
- [ ] Organizations & teams (org CRUD, member management, role assignment, team-scoped resources, org settings, transfer ownership)
- [ ] RBAC & permissions system (role definitions, permission granularity, role hierarchy, custom roles, permission inheritance in org hierarchy)
- [ ] Organization billing (org-level subscriptions, seat-based pricing, billing owner transfer, split billing across teams)
- [ ] Team collaboration features (shared workspaces, resource ownership, activity feed per-team, @mentions, team settings)

#### Admin & Moderation
- [ ] Admin dashboard (system health, user growth metrics, revenue overview, active sessions, error rates, search/filter capabilities)
- [ ] Admin user management (user list with search/filter, user detail view, impersonation, manual actions, bulk operations)
- [ ] Admin sudo / impersonation mode (admin acts on behalf of user with full audit trail, time-limited sessions, explicit reason logging)
- [ ] User audit log & activity tracking (dispute resolution, security reviews, compliance trails, immutable log entries, export for compliance)
- [ ] Content moderation tools (flagged content queue, automated rules, moderator actions, appeal system, moderation log)
- [ ] System configuration management (feature flags UI, maintenance mode toggle, email template editor, system announcements)
- [ ] Maintenance mode & scheduled broadcasts (global downtime banners, planned maintenance notices, user notification, auto-enable/disable)

#### Blog Platform
- [ ] Blog platform — full-fledged publishing system:
  - Markdown editor with toolbar, split-pane preview, keyboard shortcuts (Milkdown / TipTap / CodeMirror+preview)
  - Inline image upload-insert flow inside the editor body (upload to R2 → insert markdown image syntax)
  - Syntax highlighting for code blocks (Shiki or similar, rendered server-side)
  - Tag system: wire up dead tagIds code — tag CRUD API, tag selector in editor, public tag pages, tag display on posts
  - Pagination on public blog index (cursor or offset, load more or page nav)
  - Author attribution on public posts (join user table for display name, author profile link)
  - Reading time estimation on posts
  - Table of contents auto-generated from headings
  - Replace regex sanitization with DOMPurify
  - RSS/Atom feed endpoint
  - Draft preview (shareable link or admin-only preview route)
  - Delete button on the blog edit page
  - Audit log writes on blog mutations
  - Cover image preview in editor (not just URL)
  - Drag-and-drop image reordering for inline images
  - Link card / oEmbed support (Twitter, YouTube, GitHub gists)
  - SEO preview (Google/social card preview in editor sidebar)
  - Full-text content search (admin side minimum)
  - Scheduled publishing (set future publishedAt, cron promotes drafts)
  - Related posts by tag overlap on single post page
  - Copy-as-markdown option when viewing a post
  - Series/collection support (group posts into named series with ordering)
  - Comment system (threaded comments, moderation queue, spam filtering)
  - Newsletter integration (subscribe on blog, Mailchimp/Resend sync)
  - Analytics per post (view count, referrer tracking, reading completion)

#### Billing & Payments
- [ ] Subscription management (plan CRUD, plan comparison page, upgrade/downgrade flows, proration handling, trial periods)
- [ ] Payment processing (Stripe integration, payment method management, invoice generation, payment failure handling, dunning emails)
- [ ] Usage-based billing (metered billing, usage tracking, quota enforcement, overage handling, usage dashboard for users)
- [ ] Billing admin (revenue metrics, failed payment queue, refund processing, discount/coupon management, tax configuration)
- [ ] Payment webhooks (Stripe webhook handler, idempotent processing, event logging, failure recovery)

#### Notifications & Communication
- [ ] In-app notification system (notification bell, real-time updates, read/unread state, notification types, bulk actions, notification preferences)
- [ ] System-to-user alerts (payment receipts, admin warnings, broadcast announcements, account status changes)
- [ ] Email infrastructure (template system with preview, transactional emails, email queue with retries, bounce handling, unsubscribe flow)
- [ ] Email templates (welcome, verification, password reset, invoice, subscription changes, team invites, security alerts, custom templates via editor)
- [ ] Push notifications (Web Push API, subscription management, notification click actions, browser compatibility)
- [ ] Slack/Discord integration (workspace notifications, command slash commands, webhook delivery, channel-specific alerts)

#### API & Integrations
- [ ] API key management (scoped tokens, key rotation, usage logging, key revocation, per-key rate limits)
- [ ] Webhooks & event bus (outbound webhook delivery, retry with exponential backoff, event subscription UI, payload signing, delivery logs)
- [ ] Public API documentation (OpenAPI spec generation, interactive API explorer, code examples in multiple languages, authentication guide)
- [ ] Third-party integrations framework (OAuth connector pattern, integration catalog, per-user credentials, connection health monitoring)
- [ ] Zapier/n8n connector (expose actions and triggers for no-code automation platforms)

#### Feature Management
- [ ] Feature flags & kill switches (gradual rollout by %/cohort, instant disable without deploy, A/B testing support, flag dependencies)
- [ ] A/B testing framework (experiment definition, variant assignment, metric tracking, statistical significance calculation)
- [ ] Configuration service (runtime config without redeploy, environment-specific overrides, config versioning)

#### File Storage & Media
- [ ] File upload pipeline (chunked uploads for large files, progress tracking, upload resumption, file type validation, virus scanning)
- [ ] Media library (file browser, thumbnail generation, metadata extraction, search/filter, folder organization, bulk operations)
- [ ] Image processing (resize/crop on upload, format conversion to WebP/AVIF, responsive image srcset generation, CDN URL generation)
- [ ] Storage adapter abstraction (R2 primary, S3-compatible fallback, local dev storage, presigned URLs for direct upload)

#### Search
- [ ] Full-text search infrastructure (Algolia/Meilisearch/Typesense integration, index management, relevance tuning)
- [ ] Search UI (autocomplete/suggestions, faceted filters, search result previews, keyboard navigation, recent searches)
- [ ] Content indexing (blog posts, user content, admin content — incremental updates on mutation)

#### SEO & Performance
- [ ] SEO foundation (meta tags, Open Graph, Twitter cards, canonical URLs, sitemap.xml, robots.txt, structured data/JSON-LD)
- [ ] Performance optimization (code splitting audit, bundle analysis, lazy loading images/components, font optimization, critical CSS)
- [ ] Caching strategy (Cache API usage review, stale-while-revalidate patterns, cache invalidation on mutation, edge caching rules)
- [ ] Core Web Vitals (LCP optimization, CLS prevention, INP measurement, performance budget enforcement, real-user monitoring)

#### i18n & Accessibility
- [ ] i18n completion (all user-facing strings extracted, RTL support verification, plural rules, date/number formatting per locale, language switcher)
- [ ] i18n tooling (missing translation detection, translation key linting, icu message format support, translation workflow for contributors)
- [ ] Accessibility audit (WCAG 2.2 AA compliance, screen reader testing, focus management, skip links, ARIA attributes, reduced motion support)
- [ ] Keyboard navigation (focus traps in modals, roving tabindex in lists, shortcut collision detection, keyboard shortcuts help panel)

#### Infrastructure & DevOps
- [ ] CI/CD pipeline (GitHub Actions: lint → typecheck → test → build → preview deploy → production deploy, branch protection rules)
- [ ] Staging environment (preview deploys per PR, environment variable management, smoke tests on staging)
- [ ] Monitoring & observability (structured logging, error tracking Sentry integration, performance monitoring, uptime checks)
- [ ] Health checks & readiness endpoints (liveness probe, dependency health: D1/R2/KV connectivity, degraded mode response)
- [ ] Backup & disaster recovery (D1 backup schedule, point-in-time recovery plan, RTO/RPO targets documented, restore drill procedure)
- [ ] Secret management (rotating BETTER_AUTH_SECRET, Stripe webhook secrets, API keys — no secrets in git, Cloudflare secrets integration)
- [ ] Deployment safety (blue-green or canary deploys, automatic rollback on error spike, deploy locks, maintenance mode during migrations)

#### Testing & Quality
- [ ] Test infrastructure (Vitest config optimization, test database setup/teardown, mock patterns for D1/R2/KV, test fixtures factory)
- [ ] Unit test coverage (critical business logic: auth flows, billing calculations, permission checks, data transformations)
- [ ] Integration tests (API route tests with real D1, auth flow E2E, webhook processing, payment flow happy path + failures)
- [ ] E2E tests (Playwright: signup → verify → login → use feature → logout, admin flows, billing flows, cross-browser)
- [ ] Visual regression testing (screenshot comparison on key pages, component storybook, responsive breakpoint checks)
- [ ] Performance testing (load testing API endpoints, D1 query performance benchmarks, worker CPU time limits testing)
- [ ] Security testing (OWASP ZAP scan, dependency audit automation, secret leak detection in git history, CSRF/XSS regression tests)

#### Analytics & Tracking
- [ ] Analytics foundation (event tracking architecture, privacy-first: no cookies without consent, anonymize IPs, respect Do Not Track)
- [ ] Product analytics (page views, feature usage funnels, user retention cohorts, conversion tracking signup → activation → paid)
- [ ] Infrastructure analytics (worker execution time, D1 query latency percentiles, R2 bandwidth, cache hit rates, error rate trending)
- [ ] Analytics dashboard (admin view with filters, date range selector, export to CSV, scheduled reports)

#### Compliance & Privacy
- [ ] GDPR compliance (consent management banner, data processing disclosure, right to access/deletion/portability automation, DPA documentation)
- [ ] Privacy controls (cookie consent management, tracking opt-out, data retention policies with auto-deletion, privacy policy version tracking)
- [ ] Terms of service (versioned ToS, acceptance tracking, change notification, enforce re-acceptance on major updates)
- [ ] Audit compliance logging (immutable audit trail, data access logging, export for compliance audits, retention policy for logs)

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
