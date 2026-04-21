# Product Requirements Document (PRD)

## Vibekit — SvelteKit SaaS Platform on Cloudflare

**Status:** Draft v2
**Package Manager:** Bun
**Framework:** SvelteKit 2 (Svelte 5, runes)
**Runtime / Deploy Target:** Cloudflare Workers (`@sveltejs/adapter-cloudflare`)
**Database:** Cloudflare D1 (SQLite at the edge)
**ORM / Migrations:** Drizzle ORM + Drizzle Kit
**Authentication:** Better Auth (Drizzle adapter, Cloudflare-compatible)
**UI System:** shadcn-svelte on Tailwind CSS v4
**Utility Styling:** `class-variance-authority`, `clsx`, `tailwind-merge`, `@tailwindcss/forms`, `@tailwindcss/typography`
**State / Data:** TanStack Svelte Query, TanStack Svelte DB, TanStack Svelte Form, TanStack Svelte Table, TanStack Svelte Virtual
**i18n:** Paraglide JS (`@inlang/paraglide-js`)
**Testing:** Vitest (+ `@vitest/ui`)
**Tooling:** Vite 8, oxlint, oxfmt, svelte-check, wrangler
**Local DB tooling:** `drizzle-kit` + `wrangler d1 execute` (local + remote)

---

# 1. Executive Summary

Vibekit is a full-stack SaaS platform built on SvelteKit, deployed to Cloudflare Workers, with four major surfaces:

1. **Static marketing website** under `/`
2. **Blog** under `/blog/*` using ISR-style regeneration via Cloudflare cache + on-demand revalidation
3. **Consumer application** under `/app/*` (CSR-only inside a protected shell)
4. **Administrative console** under `/admin/*` (CSR-only inside a protected shell)

The platform covers authentication, user management, blog publishing, protected product features, and internal administration. Public surfaces prioritize SEO, performance, and conversion. Authenticated surfaces prioritize responsiveness, correctness, access control, and maintainability.

This PRD is **SvelteKit-specific**. Rendering strategies, route groups, form handling, and data flow are expressed in SvelteKit terms (load functions, form actions, `+server.ts` endpoints, hooks, route groups `(public)`, `(app)`, `(admin)`, and `prerender` / `csr` / `ssr` export flags).

---

# 2. Product Goals

## 2.1 Primary Goals

* Ship a production-ready SaaS platform with a clear boundary between public content and authenticated product surfaces.
* Deliver a static, SEO-friendly marketing experience with minimal JS.
* Deliver a cache-friendly blog with ISR-style regeneration on content updates.
* Deliver fast, client-rendered authenticated surfaces (`/app/*`, `/admin/*`) that load a protected shell and hydrate data via TanStack Query.
* Keep the stack cohesive: Bun + SvelteKit + D1 + Drizzle + Better Auth + shadcn-svelte + TanStack.
* Exploit Cloudflare primitives (Workers, D1, KV/cache) without leaking runtime concerns into app code.

## 2.2 Success Criteria

* Visitors discover the product through the static website and blog.
* Users can register, log in, log out, and access protected routes.
* Admins can manage users and blog content end-to-end.
* Blog posts support draft → publish → update → unpublish with public regeneration.
* `/app/*` and `/admin/*` run fully in CSR mode behind an auth-guarded shell.
* D1 schema is driven by Drizzle, with reproducible migrations for local + remote.
* shadcn-svelte primitives + Tailwind tokens form a single, consistent design system.

## 2.3 Non-Goals

* Native mobile apps.
* Multi-region distributed databases beyond what D1 already provides.
* Real-time collaborative editing in v1.
* Enterprise RBAC beyond `user` / `admin` in v1.
* Multi-tenant billing in v1.
* Editorial workflow approvals or scheduled publishing beyond a minimal mechanism.

---

# 3. Product Scope

## 3.1 Public Website (`/`)

Static-first, prerendered:

* Home
* Features
* Pricing
* About
* Contact
* Legal (privacy, terms, cookie notice as needed)
* Shared nav, footer, CTA surfaces
* Contact / lead capture form (SvelteKit form action, optional KV queue)

## 3.2 Blog (`/blog/*`)

Public, SEO-oriented, ISR-style:

* Blog index with pagination
* Blog detail by slug
* Optional tag / category pages
* Related posts
* Author attribution
* SEO metadata + JSON-LD structured data
* Draft / published states
* On-demand regeneration (cache purge / tag-based invalidation) after publish or update

## 3.3 Consumer App (`/app/*`)

CSR-only behind an authenticated shell:

* Dashboard
* Profile
* Settings
* Core product workflows (defined per module)
* Data views (TanStack Table + TanStack Virtual for large sets)
* Forms (TanStack Form + shared validators)
* Server state via TanStack Query over SvelteKit `+server.ts` endpoints
* Session-aware UI

## 3.4 Admin (`/admin/*`)

CSR-only behind an authenticated + role-gated shell:

* Admin login / session validation
* Admin dashboard
* User management
* Blog management (list, create, edit, publish/unpublish)
* Access control for privileged mutations
* Audit-friendly action logging

---

# 4. Rendering Strategy (SvelteKit)

SvelteKit lets us mix strategies per route group via route-level exports (`prerender`, `ssr`, `csr`) and per-request behavior in `load` / `+server.ts`.

## 4.1 Route Class Rules

### `/` and marketing pages — **prerendered static**

* `export const prerender = true`
* `export const csr = false` where no interactivity is needed (progressively enable on interactive pages)
* Minimal JS payload
* Full SEO metadata via `<svelte:head>` + shared SEO helper

### `/blog/*` — **ISR-style regeneration**

* Prerender at build time for known slugs, with on-demand revalidation on publish/update
* Cloudflare cache headers (`Cache-Control`, `CDN-Cache-Control`) + cache tags where supported
* `/blog` index and `/blog/[slug]` both revalidate on admin publish/update actions via a server-side invalidation hook
* No private / user-specific data rendered in blog responses

### `/app/*` — **CSR only**

* `export const ssr = false` on the `(app)` layout
* `export const csr = true`
* Initial shell served fast; data hydrated with TanStack Query against `+server.ts` endpoints
* Auth guard runs in `hooks.server.ts` + a layout `load` redirect

### `/admin/*` — **CSR only, role-gated**

* Same posture as `/app/*` with an additional `role === 'admin'` check in `hooks.server.ts` and in `+server.ts` handlers

## 4.2 SvelteKit Implementation Requirements

* Route groups: `(public)`, `(blog)`, `(app)`, `(admin)` with group-level `+layout.ts` / `+layout.server.ts` controlling rendering + auth.
* `src/hooks.server.ts` hosts session loading (Better Auth) and top-level auth guards.
* Form-based mutations use SvelteKit form actions where the UI is primarily server-driven (marketing forms, auth flows). Client-driven mutations in `/app/*` and `/admin/*` use TanStack Query's `createMutation` against `+server.ts` endpoints.
* Shared server modules live under `src/lib/server/**` (never imported from client code).

---

# 5. Target Users

## 5.1 Visitor
Anonymous; browses marketing + blog; may convert.

## 5.2 Authenticated User
Logged in; uses `/app/*`; manages own data; only accesses authorized resources.

## 5.3 Admin
Privileged operator; manages blog and users; accesses `/admin/*`.

---

# 6. User Stories

## 6.1 Visitor
* Understand product value on the landing page.
* Read blog content without logging in.
* Expect fast, indexable blog pages.
* Sign up from public CTAs.

## 6.2 Authenticated User
* Create an account and log in securely.
* Stay signed in across sessions as appropriate.
* Use a responsive dashboard.
* Edit profile / settings.
* See clear loading, success, and error states.

## 6.3 Admin
* Create, edit, publish, and unpublish blog posts.
* Manage user accounts.
* Search / filter / inspect records.
* Perform role-gated actions only when allowed.
* Work in a reliable admin UI with confirmations and validation.

---

# 7. Functional Requirements

## 7.1 Authentication & Authorization (Better Auth)

### Requirements
* Email/password via Better Auth, backed by the Drizzle D1 adapter.
* Session creation, validation, refresh, and revocation.
* Server-side session resolution in `hooks.server.ts`, exposing `event.locals.user` / `event.locals.session`.
* Role-based access for `user` and `admin`.
* Logout flow.
* Password reset flow if supported by the chosen Better Auth plugin set.
* Route guards for `/app/*` and `/admin/*` enforced in `hooks.server.ts` **and** in each protected `+server.ts`.
* `bun run auth:schema` regenerates `src/lib/server/db/auth.schema.ts` from Better Auth config.

### Acceptance Criteria
* Unauthenticated access to `/app/*` or `/admin/*` redirects to `/login` with a `next` hint.
* Non-admin authenticated users are blocked from `/admin/*` pages and admin endpoints with 403.
* Expired or invalid sessions are rejected on the server and cleared on the client.
* Admin role checks occur on the server even if UI already gates the control.

## 7.2 Public Website

### Requirements
* Prerendered top-level public routes.
* Responsive navigation and footer (shadcn-svelte primitives).
* CTA modules reusable across pages.
* Per-page SEO metadata via a shared helper (title, description, canonical, OG, Twitter).
* Contact / lead capture form using a SvelteKit form action; persisted to D1 (or queued via KV).
* Image optimization via Cloudflare Images or `<img>` with explicit dimensions and `loading="lazy"`.
* Paraglide-driven copy for any string expected to be translated.

### Acceptance Criteria
* All public pages render without auth.
* Metadata is configurable per page and present in the prerendered HTML.
* Public forms validate on client (TanStack Form + shared schema) and server (form action) and show success/error feedback.

## 7.3 Blog

### Requirements
* Posts persisted in D1 via Drizzle.
* Per-post fields: title, slug, excerpt, body, cover image (optional), author ref, publish state, timestamps, SEO fields.
* `/blog` index with pagination (cursor or offset).
* `/blog/[slug]` detail page.
* Optional tag / category taxonomy.
* Admin editing UI under `/admin/blog`.
* ISR-style regeneration: on publish / update / unpublish, the admin endpoint invalidates the relevant blog routes (index, slug, tag pages) using a cache-tag / manual purge helper.
* Markdown or rich content rendering pipeline (decided during implementation; `@tailwindcss/typography` provides the prose styling).

### Acceptance Criteria
* Draft posts are not publicly reachable by slug.
* Published posts appear on `/blog` and `/blog/[slug]`.
* Editing a published post reflects publicly after the regeneration hook completes.
* Duplicate slugs are rejected at the DB + API level.

## 7.4 Consumer App (`/app/*`)

### Requirements
* CSR-only shell using shadcn-svelte layout primitives.
* Auth-guarded layout (`+layout.server.ts` redirect + `+layout.ts` checks).
* Dashboard, profile, settings pages.
* Protected data fetching via TanStack Svelte Query against `/app/api/*` or `+server.ts` endpoints.
* Forms via TanStack Svelte Form with shared validators.
* Tables via TanStack Svelte Table, virtualized with TanStack Svelte Virtual for large sets.
* Optional local-first caching / reactive queries via TanStack Svelte DB where it simplifies a feature (not required for every view).
* Loading, empty, success, and error states for every async surface.

### Acceptance Criteria
* App pages can load user-scoped data after login.
* Unauthorized data requests fail safely with a typed error and do not leak cross-user data.
* Forms validate on both client (TanStack Form + shared schema) and server.

## 7.5 Admin Panel (`/admin/*`)

### Requirements
* CSR-only admin shell using shadcn-svelte.
* Role-gated layout (`role === 'admin'`) with server-side enforcement.
* User list with search / filter / sort / pagination (TanStack Table).
* User detail view.
* Blog list with draft/published indicators.
* Blog create / edit form (TanStack Form).
* Publish / unpublish actions that trigger regeneration.
* Optional soft-delete / archive flow.
* Destructive actions use confirmation dialogs.

### Acceptance Criteria
* Admin can create a draft.
* Admin can publish a post and make it visible publicly (after regeneration).
* Admin can update a post and trigger content refresh.
* Admin can list users and inspect basic account data.
* All admin mutations verify role server-side, not only in the UI.

---

# 8. Technical Requirements

## 8.1 Stack Constraints (fixed)

* Package manager: **Bun**.
* Framework: **SvelteKit 2** on **Svelte 5** (runes: `$state`, `$derived`, `$effect`, `$props`, `$bindable`).
* Deploy: **Cloudflare Workers** via `@sveltejs/adapter-cloudflare`.
* Database: **Cloudflare D1** (SQLite).
* ORM: **Drizzle ORM** with Drizzle Kit migrations.
* Auth: **Better Auth** + Drizzle adapter.
* UI: **shadcn-svelte** on **Tailwind CSS v4**, with `class-variance-authority`, `clsx`, `tailwind-merge`.
* Forms: **TanStack Svelte Form** + shared validators.
* Server state: **TanStack Svelte Query**.
* Tables / virtualization: **TanStack Svelte Table** + **TanStack Svelte Virtual**.
* Optional local-first data: **TanStack Svelte DB**.
* i18n: **Paraglide JS**.
* Testing: **Vitest** (+ `@vitest/ui`).
* Lint / format: **oxlint**, **oxfmt**.

## 8.2 Database Requirements (D1 + Drizzle)

* Drizzle schema under `src/lib/server/db/**`, split into domain files (`auth.schema.ts` generated by Better Auth, `blog.schema.ts`, etc.) and re-exported from a single entry.
* D1 binding exposed via `event.platform.env.DB` (typed via `wrangler types`).
* Local development uses `wrangler d1` with a local SQLite replica; production uses the real D1 binding.
* Migrations managed by Drizzle Kit. Scripts:
  * `bun db:generate` — emit SQL migrations.
  * `bun db:migrate` — apply to configured remote (via Drizzle proxy).
  * `bun db:push:local` / `bun db:migrate:local` — apply to the local wrangler D1.
  * `bun db:studio` / `db:studio:local` — inspect.
* Every query path must go through Drizzle; raw `DB.prepare` is reserved for migrations and admin scripts.
* Schema should be normalized but not over-engineered.

## 8.3 API / Server Requirements

Implemented with SvelteKit `+server.ts` endpoints and form actions. Must cover:

* Better Auth endpoints (mounted per the Better Auth SvelteKit integration).
* Session validation via `hooks.server.ts`.
* User read / update within scope; admin user management.
* Blog CRUD (admin-only for writes).
* Regeneration / cache-purge triggers after blog writes.
* Shared request-validation layer.
* Consistent structured error responses (`{ code, message, details? }`).

## 8.4 Validation

* Shared validators under `src/lib/validators/**`, usable on both client (TanStack Form) and server (`+server.ts`, form actions).
* Form errors are field-level and user-friendly.
* Server always re-validates, even when the client already did.

## 8.5 Design System (shadcn-svelte + Tailwind v4)

* shadcn-svelte components installed into `src/lib/components/ui/**` and composed into higher-level app primitives under `src/lib/components/**`.
* Tailwind v4 config drives theme tokens (colors, spacing, typography); dark mode supported.
* `@tailwindcss/forms` for form control baselines; `@tailwindcss/typography` for blog prose.
* Utility helpers: `cn` (clsx + tailwind-merge) and `cva` for variant-heavy components.
* Reusable patterns required: button, input, select, combobox, dialog, drawer, dropdown, sheet, tabs, table, toast, alert, card, skeleton, form field, badge.
* No DaisyUI. No ad-hoc component libraries.

## 8.6 i18n

* Paraglide JS as the single source of translated strings.
* Compiled messages imported per locale; route-level locale resolution in `hooks.server.ts` (cookie / Accept-Language) with a fallback.
* All user-facing copy in marketing, auth flows, and app shell goes through Paraglide.

## 8.7 Observability on Cloudflare

* Use Workers logs (wrangler tail) in development.
* In production, forward selected events (auth failures, admin mutations, publish actions) to a logging sink (e.g. Logpush / analytics engine) — exact target decided at deploy time.
* Never log secrets, session tokens, or raw passwords.

---

# 9. Information Architecture

## 9.1 Route Map (SvelteKit route groups)

```
src/routes/
  (public)/
    +layout.svelte
    +page.svelte                 → /
    features/+page.svelte
    pricing/+page.svelte
    about/+page.svelte
    contact/+page.svelte
    privacy/+page.svelte
    terms/+page.svelte
  (blog)/
    blog/
      +page.svelte               → /blog
      [slug]/+page.svelte        → /blog/[slug]
      tag/[tag]/+page.svelte     (optional)
      category/[category]/+page.svelte (optional)
  (auth)/
    login/+page.svelte
    register/+page.svelte
    forgot-password/+page.svelte
    reset-password/+page.svelte
  (app)/
    +layout.server.ts            (auth guard)
    +layout.svelte               (csr=true, ssr=false)
    app/
      +page.svelte               → /app
      dashboard/+page.svelte
      settings/+page.svelte
      profile/+page.svelte
  (admin)/
    +layout.server.ts            (auth + role guard)
    +layout.svelte               (csr=true, ssr=false)
    admin/
      +page.svelte               → /admin
      dashboard/+page.svelte
      users/+page.svelte
      users/[id]/+page.svelte
      blog/+page.svelte
      blog/new/+page.svelte
      blog/[id]/edit/+page.svelte
      settings/+page.svelte
  api/
    auth/[...better-auth]/+server.ts
    blog/+server.ts
    blog/[id]/+server.ts
    users/+server.ts
    users/[id]/+server.ts
```

Exact group names are conventions; the important thing is that `(public)` and `(blog)` are prerender-friendly while `(app)` and `(admin)` are CSR-only and auth-gated.

---

# 10. Data Model (Initial, D1 / Drizzle)

## 10.1 Users
* id (text, ULID/UUID)
* email (unique)
* display_name
* password_hash / auth provider refs (managed via Better Auth tables)
* role: `user` | `admin`
* status: `active` | `suspended`
* created_at, updated_at, last_login_at

## 10.2 Sessions / Auth Tables
Generated by Better Auth (`bun auth:schema`) into `src/lib/server/db/auth.schema.ts`. Do not edit by hand.

## 10.3 Blog Posts
* id
* title
* slug (unique)
* excerpt
* content_body (markdown or sanitized HTML — decide in impl)
* cover_image_url (nullable)
* seo_title (nullable)
* seo_description (nullable)
* status: `draft` | `published` | `archived`
* author_id → users.id
* published_at (nullable)
* created_at, updated_at

## 10.4 Blog Tags
* id, name, slug (unique)

## 10.5 Blog Post Tags (join)
* post_id, tag_id (PK composite)

## 10.6 Audit Log (recommended)
* id
* actor_user_id
* action_type
* entity_type
* entity_id
* metadata_json
* created_at

---

# 11. Permissions Model

## 11.1 Roles

### User
* Access `/app/*`.
* Manage own profile / settings.
* No access to `/admin/*` or admin endpoints.

### Admin
* All user capabilities.
* Access `/admin/*`.
* Manage blog posts and inspect users.

## 11.2 Authorization Rules
* UI gating is never sufficient; server-side authorization is mandatory.
* Every admin `+server.ts` handler re-checks `role === 'admin'`.
* Every user-scoped query filters by `event.locals.user.id` unless admin override is explicitly intended.

---

# 12. Blog Editing Requirements

## 12.1 Editor Capabilities
* Create draft, edit all fields, save draft.
* Publish, unpublish / revert to draft.
* Preview mode (recommended).

## 12.2 Slug Rules
* Unique.
* Normalized (lowercase, kebab-case, ASCII-folded).
* Changing a published slug is deliberate; consider redirects later.

## 12.3 Publishing Rules
* Only admins can publish.
* Minimum required fields must pass validation before publishing.
* Publishing sets `published_at` on first publish; subsequent re-publishes do not overwrite it unless explicitly requested.
* Publish / unpublish / update trigger regeneration for affected public routes.

---

# 13. UX and UI Requirements

## 13.1 General
* Desktop-first responsive design, mobile-friendly where practical.
* Accessibility-conscious forms and controls (shadcn-svelte primitives cover most a11y baselines).
* Clear empty, loading, error states.
* Destructive actions require confirmation (shadcn `AlertDialog`).
* Long-running actions show progress (spinners, skeletons, disabled states).

## 13.2 Dashboard UX
* Persistent shell: sidebar + topbar (shadcn-svelte patterns).
* Search / filter on tables.
* Reusable data table via TanStack Svelte Table + shadcn styling.
* Toasts for mutation feedback (shadcn `Sonner` or equivalent).

## 13.3 Admin UX
* High-density layouts permitted.
* Tables with pagination / filter / sort / virtualization for long lists.
* Blog form with inline field validation via TanStack Form.
* Publish state visibly differentiated (badges).

---

# 14. Non-Functional Requirements

## 14.1 Performance
* Prerendered pages ship minimal JS (favor `csr = false` where interactivity is not needed).
* Blog pages are cache-friendly (Cloudflare cache, cache headers, cache tags where used).
* CSR shells avoid unnecessary bundle bloat — prefer dynamic imports for heavy admin-only screens.
* Tables use pagination and virtualization for large result sets.

## 14.2 Reliability
* Idempotency on critical mutations where feasible.
* Structured error responses.
* Deterministic migration workflow for both local and remote D1.

## 14.3 Security
* Passwords hashed by Better Auth; never stored plaintext.
* Sessions follow Better Auth defaults (secure, httpOnly, SameSite).
* CSRF handled per Better Auth + SvelteKit recommendations.
* Validate every input; encode every output.
* Admin surfaces require real authorization — hidden links are not a control.
* Secrets live in Wrangler secrets / env vars, never in source.

## 14.4 Maintainability
* Clear route-group and module boundaries.
* Shared UI primitives (shadcn-svelte).
* Shared validators (client + server).
* Tests over core workflows.

---

# 15. Observability and Operational Requirements

## 15.1 Logging
* Log auth failures, admin actions, publish actions, and server errors through a centralized `logger`.
* Never log secrets or session tokens.

## 15.2 Monitoring
* Track failed requests, auth failures, and publish failures via Cloudflare analytics / logs.
* Surface a simple health-check endpoint.

## 15.3 Backups
* Document the D1 backup / export procedure (`wrangler d1 export`).
* Migrations reversible where feasible; irreversible migrations require a documented runbook.

---

# 16. Analytics Requirements (Optional but Recommended)

## 16.1 Public
* Page views, CTA clicks, blog post views, referral sources (where legal).

## 16.2 App
* Sign-up completion, login success/failure, feature usage events.

## 16.3 Admin
* Posts created / published, user growth, key moderation actions.

---

# 17. MVP Definition

MVP is complete when:

* Static marketing pages exist, prerendered, and are navigable.
* Public blog exists with index and detail pages plus regeneration on publish.
* Admin can create / edit / publish blog posts.
* Authentication works for users and admins via Better Auth.
* `/app/*` is CSR-only, auth-guarded, and functional.
* `/admin/*` is CSR-only, role-gated, and functional.
* Basic user management for admins.
* Core tests pass (Vitest).
* Setup, migration, and deployment docs exist (local dev, `wrangler`, D1 migrations).

---

# 18. Delivery Phases

## Phase 0 — Foundations
* Confirm SvelteKit + adapter-cloudflare setup.
* Tailwind v4 + shadcn-svelte installed with base theme + tokens.
* Drizzle ORM + Drizzle Kit wired to D1 (local + remote).
* Better Auth configured; `bun auth:schema` generating auth tables.
* Paraglide JS configured with a minimum of one locale.
* Route groups `(public)`, `(blog)`, `(app)`, `(admin)` scaffolded.
* Shared validators + `cn`/`cva` helpers in place.
* `hooks.server.ts` session + guard scaffolding.
* Vitest baseline.

## Phase 1 — Public Site
* Prerendered marketing routes + shared layout, nav, footer.
* Contact / lead form (form action + D1).
* SEO metadata helper + JSON-LD support.

## Phase 2 — Blog
* Blog Drizzle schema + migrations.
* Admin blog CRUD `+server.ts` endpoints.
* Public `/blog` + `/blog/[slug]` routes.
* Draft / publish workflow.
* Regeneration / cache invalidation hook.

## Phase 3 — Auth + User App
* Register / login / logout via Better Auth.
* Session restoration on cold loads.
* Protected `/app/*` shell with CSR + TanStack Query hydration.
* User settings + profile screens.
* First dashboard views.

## Phase 4 — Admin Panel
* Protected `/admin/*` shell with role gate.
* User management screens (TanStack Table + Virtual).
* Blog management screens (list + editor with TanStack Form).
* Publish workflow polish.
* Audit-friendly logging.

## Phase 5 — Hardening
* E2E tests (suite TBD — Playwright is a likely pick).
* Security review.
* Performance + bundle size review.
* Accessibility pass.
* Deployment + backup docs.

---

# 19. Implementation Checklist

## 19.1 Foundations
* [ ] Bun workspace verified
* [ ] TypeScript baseline (`svelte-check` clean)
* [ ] oxlint + oxfmt configs
* [ ] Tailwind v4 + theme tokens
* [ ] shadcn-svelte CLI set up; base components installed
* [ ] Drizzle ORM + Drizzle Kit configured for local + remote D1
* [ ] `wrangler.jsonc` D1 binding verified; `wrangler types` generating typed env
* [ ] Better Auth configured with Drizzle adapter
* [ ] `bun auth:schema` produces `src/lib/server/db/auth.schema.ts`
* [ ] Paraglide JS configured
* [ ] Route groups `(public)`, `(blog)`, `(app)`, `(admin)` scaffolded
* [ ] `hooks.server.ts` session + guard scaffold
* [ ] Shared validators module
* [ ] `cn` + `cva` helpers
* [ ] Vitest smoke test passing

## 19.2 Auth
* [ ] Registration
* [ ] Login
* [ ] Logout
* [ ] Session persistence + refresh
* [ ] `/app/*` route guard (hooks + layout)
* [ ] `/admin/*` role guard (hooks + layout + endpoint)
* [ ] Password reset (if in scope)
* [ ] 401 / 403 UI states

## 19.3 Public Site
* [ ] Home
* [ ] Features
* [ ] Pricing
* [ ] About
* [ ] Contact
* [ ] Legal pages
* [ ] Shared SEO helper
* [ ] CTA placement review
* [ ] Responsive QA

## 19.4 Blog
* [ ] Blog schema + migration
* [ ] Tag / category schema (if included)
* [ ] `/blog` index route
* [ ] `/blog/[slug]` detail route
* [ ] Slug uniqueness validation
* [ ] Draft save
* [ ] Publish
* [ ] Update
* [ ] Unpublish / archive
* [ ] SEO fields support
* [ ] Regeneration / cache invalidation on publish and update
* [ ] Public cache strategy documented

## 19.5 App
* [ ] App shell layout (shadcn-svelte)
* [ ] Dashboard
* [ ] Profile
* [ ] Settings
* [ ] Protected data fetching via TanStack Query
* [ ] Forms via TanStack Form + shared validators
* [ ] Loading / error / empty states
* [ ] Reusable table / form primitives

## 19.6 Admin
* [ ] Admin shell layout
* [ ] Admin dashboard
* [ ] User list (table + virtual)
* [ ] User detail view
* [ ] Blog list
* [ ] Blog create/edit form
* [ ] Publish / unpublish actions
* [ ] Search / filter / pagination
* [ ] Destructive action confirmations
* [ ] Audit log hooks

## 19.7 Quality
* [ ] Unit tests for utilities and validators
* [ ] Integration tests for auth and blog endpoints
* [ ] E2E tests for critical flows
* [ ] Accessibility checks on forms/nav
* [ ] Performance / bundle review for public pages
* [ ] Deployment checklist
* [ ] Backup + migration docs

---

# 20. Test Strategy

## 20.1 Levels

### Unit (Vitest)
* Validators
* Slug generation + normalization
* Role checks
* Pure utilities
* Content state transitions (draft → published → archived)

### Integration (Vitest)
* Better Auth flows against an in-memory / local D1
* Session validation + route guards
* Protected endpoint access
* Blog CRUD endpoints
* Publish / unpublish workflow
* Admin-only authorization
* Drizzle queries and migrations

### End-to-End (Playwright recommended)
* Visitor browses public site
* Visitor reads blog post
* User registration / login
* User reaches `/app/*`
* Non-admin denied from `/admin/*`
* Admin logs in
* Admin creates / edits / publishes a post
* Published post appears publicly
* User logout

## 20.2 Coverage Areas

### Auth
* Valid registration succeeds
* Duplicate email fails cleanly
* Valid login succeeds
* Invalid credentials fail
* Expired / invalid session rejected
* Admin endpoint rejects regular user

### Blog
* Draft not visible publicly
* Published visible publicly
* Duplicate slug rejected
* Update propagates after regeneration
* Archived / unpublished removed from public listing

### App
* Unauthenticated user blocked from `/app/*`
* Authenticated user can reach `/app/dashboard`
* User cannot access another user's records

### Admin
* Unauthenticated visitor blocked from `/admin/*`
* Regular user blocked from `/admin/*`
* Admin reaches `/admin/dashboard`
* Admin creates/updates/publishes content
* Admin lists users

### Regression
* Public routes still work after auth changes
* Blog publishing does not break prerendered marketing pages
* `/app/*` and `/admin/*` guards remain enforced after routing changes

---

# 21. Acceptance Test Matrix

## Public Site
* [ ] All public pages render correctly
* [ ] Nav and footer links work
* [ ] SEO metadata present in prerendered HTML
* [ ] Contact form validates input

## Blog
* [ ] Index lists only published posts
* [ ] Detail resolves by slug
* [ ] Drafts hidden
* [ ] Updates propagate via regeneration

## App
* [ ] Unauthenticated access denied
* [ ] Authenticated access granted
* [ ] User data loads correctly
* [ ] Forms validate and save

## Admin
* [ ] Non-admin access denied
* [ ] Admin access granted
* [ ] Blog CRUD works
* [ ] User listing works
* [ ] Publish / unpublish works

---

# 22. Risks and Tradeoffs

## 22.1 D1 Constraints
* D1 is SQLite with Cloudflare-specific write throughput and region semantics. Acceptable for v1; revisit if write volume grows significantly.
* Long-running transactions and large batch writes are not D1's strong suit — prefer batch APIs via Drizzle.

## 22.2 CSR-Only for App + Admin
* Simplifies SSR/session juggling on authenticated surfaces, relies more on client bundle.
* Acceptable because SEO is not required for these surfaces.

## 22.3 shadcn-svelte Maturity
* shadcn-svelte is a port of shadcn/ui and evolves alongside Svelte 5. Occasionally expect rough edges; prefer the registry's current components over hand-rolled variants.

## 22.4 Cloudflare Workers Runtime
* Not Node.js: no `fs`, limited APIs, sized bundles. Server modules must be Workers-compatible. Keep server-only deps under `src/lib/server/**` and off client imports.

## 22.5 Paraglide Adoption
* Adding strings after the fact is tedious. Route copy through Paraglide from day one for any surface likely to be translated.

---

# 23. Future Enhancements

* Rich text / markdown editor improvements
* Scheduled publishing
* Image upload + media library (Cloudflare R2 + Images)
* Full-text search across blog content (D1 FTS or external)
* Multi-role permissions beyond `user` / `admin`
* Team / organization support
* Billing / subscriptions
* Notification center
* Feature flags
* API tokens / webhooks
* Impersonation for admins (audit-logged)
* Soft deletion for users + posts

---

# 24. Open Questions

* What are the core domain modules inside `/app/*` beyond dashboard / profile / settings?
* Blog content format: markdown, MDX-like, rich text JSON, or sanitized HTML?
* Is image upload required in v1, or can we start with external URLs?
* Do we need social auth in addition to email/password?
* Should admins be able to impersonate users (with audit)?
* Do we want soft deletion for users + posts?
* What analytics stack will we standardize on?
* Exact regeneration strategy: cache tag purge, manual invalidation, or a combination?
* E2E test runner: Playwright (recommended) vs. alternatives?

---

# 25. Final Recommendation

Preserve these boundaries through implementation:

* **Public web concern**: prerendered + SEO + blog regeneration.
* **Application concern**: authenticated CSR product surface, TanStack Query over `+server.ts`.
* **Administration concern**: privileged CSR management surface, server-enforced role checks.
* **Server concern**: Better Auth, Drizzle/D1 persistence, authorization, blog operations, user management, regeneration hooks.

Keep server-only code under `src/lib/server/**` and never import it from client modules. Keep UI primitives centralized in shadcn-svelte components. Route all mutations through validated endpoints. Treat D1 migrations as first-class deliverables, not afterthoughts.

---

# 26. Definition of Done

The project is done for v1 when:

* Route groups are implemented per the rendering strategy.
* Auth and authorization flows are complete and server-enforced.
* Blog publishing + public rendering + regeneration work end-to-end.
* `/app/*` and `/admin/*` are protected and functional.
* D1 schema and migrations are stable (local + remote).
* Test suite covers critical workflows.
* Setup, migration, and deployment documentation is complete.
* No critical security or data integrity issues remain open.
