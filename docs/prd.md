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
**Content Pipeline:** GitHub Flavored Markdown via `micromark` + GFM extensions, sanitized with DOMPurify
**Storage / Media:** Cloudflare R2 + Cloudflare Images
**Analytics:** Cloudflare Web Analytics (public) + Firebase Analytics (app/admin)
**Email:** Cloudflare Workers `send_email` binding (Email Routing)
**Rate Limiting:** Cloudflare Rate Limiting rules (dashboard-configured)
**Error Tracking:** Cloudflare Workers Logs + Logpush to R2 (free tier)
**Testing:** Vitest (+ `@vitest/ui`) for unit/integration, Playwright for E2E
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

- Ship a production-ready SaaS platform with a clear boundary between public content and authenticated product surfaces.
- Deliver a static, SEO-friendly marketing experience with minimal JS.
- Deliver a cache-friendly blog with ISR-style regeneration on content updates.
- Deliver fast, client-rendered authenticated surfaces (`/app/*`, `/admin/*`) that load a protected shell and hydrate data via TanStack Query.
- Keep the stack cohesive: Bun + SvelteKit + D1 + Drizzle + Better Auth + shadcn-svelte + TanStack.
- Exploit Cloudflare primitives (Workers, D1, KV/cache) without leaking runtime concerns into app code.

## 2.2 Success Criteria

- Visitors discover the product through the static website and blog.
- Users can register, log in, log out, and access protected routes.
- Admins can manage users and blog content end-to-end.
- Blog posts support draft → publish → update → unpublish with public regeneration.
- `/app/*` and `/admin/*` run fully in CSR mode behind an auth-guarded shell.
- D1 schema is driven by Drizzle, with reproducible migrations for local + remote.
- shadcn-svelte primitives + Tailwind tokens form a single, consistent design system.

## 2.3 Non-Goals

- Native mobile apps.
- Multi-region distributed databases beyond what D1 already provides.
- Real-time collaborative editing in v1.
- Enterprise RBAC beyond `user` / `admin` in v1.
- Multi-tenant billing in v1.
- Editorial workflow approvals or scheduled publishing beyond a minimal mechanism.
- MFA / 2FA in v1 (deferred to post-MVP).
- Social authentication providers in v1 (email/password only).

---

# 3. Product Scope

## 3.1 Public Website (`/`)

Static-first, prerendered:

- Home
- Features
- Pricing
- About
- Contact
- Legal (privacy, terms, cookie notice as needed)
- Shared nav, footer, CTA surfaces
- Contact / lead capture form (SvelteKit form action, optional KV queue)

## 3.2 Blog (`/blog/*`)

Public, SEO-oriented, ISR-style:

- Blog index with pagination
- Blog detail by slug
- Optional tag / category pages
- Related posts
- Author attribution
- SEO metadata + JSON-LD structured data
- Draft / published states
- On-demand regeneration (cache purge / tag-based invalidation) after publish or update

## 3.3 Consumer App (`/app/*`)

CSR-only behind an authenticated shell:

- Dashboard
- Profile
- Settings
- Core product workflows (defined per module)
- Data views (TanStack Table + TanStack Virtual for large sets)
- Forms (TanStack Form + shared validators)
- Server state via TanStack Query over SvelteKit `+server.ts` endpoints
- Session-aware UI

## 3.4 Admin (`/admin/*`)

CSR-only behind an authenticated + role-gated shell:

- Admin login / session validation
- Admin dashboard
- User management
- Blog management (list, create, edit, publish/unpublish)
- Access control for privileged mutations
- Audit-friendly action logging

---

# 4. Rendering Strategy (SvelteKit)

SvelteKit lets us mix strategies per route group via route-level exports (`prerender`, `ssr`, `csr`) and per-request behavior in `load` / `+server.ts`.

## 4.1 Route Class Rules

### `/` and marketing pages — **prerendered static**

- `export const prerender = true`
- `export const csr = false` where no interactivity is needed (progressively enable on interactive pages)
- Minimal JS payload
- Full SEO metadata via `<svelte:head>` + shared SEO helper

### `/blog/*` — **SSR at the edge with tagged cache**

- Rendered on request at the Worker edge; content is sourced from D1 (not build-time prerendered — the slug set is dynamic).
- Cloudflare **Cache API with cache tags**: tag blog responses on render (`blog:index`, `blog:slug:<slug>`, `blog:tag:<tag>`), and purge relevant tags on admin publish / update / unpublish / archive.
- Standard cache headers (`Cache-Control`, `CDN-Cache-Control`) drive edge caching; first request after purge is a cache miss that re-renders from D1.
- No private / user-specific data rendered in blog responses.

### `/app/*` — **CSR only**

- `export const ssr = false` on the `(app)` layout
- `export const csr = true`
- Initial shell served fast; data hydrated with TanStack Query against `+server.ts` endpoints
- Auth guard runs in `hooks.server.ts` + a layout `load` redirect

### `/admin/*` — **CSR only, role-gated**

- Same posture as `/app/*` with an additional `role === 'admin'` check in `hooks.server.ts` and in `+server.ts` handlers

## 4.2 SvelteKit Implementation Requirements

- Route groups: `(public)`, `(blog)`, `(auth)`, `(app)`, `(admin)` with group-level `+layout.ts` / `+layout.server.ts` controlling rendering + auth.
- `src/hooks.server.ts` hosts session loading (Better Auth), top-level auth guards, and security headers.
- Form posture by surface:
  - `(public)` + `(auth)` — SvelteKit **form actions** (progressive enhancement, no JS required, server-driven).
  - `(app)` + `(admin)` — **TanStack Svelte Form** against `+server.ts` endpoints via TanStack Query `createMutation`.
  - Validation runs on both sides — shared Zod schemas from `src/lib/validators/**`.
- Shared server modules live under `src/lib/server/**` (never imported from client code).

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

- Understand product value on the landing page.
- Read blog content without logging in.
- Expect fast, indexable blog pages.
- Sign up from public CTAs.

## 6.2 Authenticated User

- Create an account and log in securely.
- Stay signed in across sessions as appropriate.
- Use a responsive dashboard.
- Edit profile / settings.
- See clear loading, success, and error states.

## 6.3 Admin

- Create, edit, publish, and unpublish blog posts.
- Manage user accounts.
- Search / filter / inspect records.
- Perform role-gated actions only when allowed.
- Work in a reliable admin UI with confirmations and validation.

---

# 7. Functional Requirements

## 7.1 Authentication & Authorization (Better Auth)

### Requirements

- Email/password via Better Auth, backed by the Drizzle D1 adapter.
- **User table strategy**: extend Better Auth's `user` table via `additionalFields` (`role`, `status`, `display_name`, `last_login_at`, `deleted_at`). No parallel `app_users` table. Password hashes and auth-provider refs live in Better Auth's own tables.
- Session creation, validation, refresh, and revocation.
- Server-side session resolution in `hooks.server.ts`, exposing `event.locals.user` / `event.locals.session`.
- Role-based access for `user` and `admin`.
- **Email verification required on signup**: the user may log in before verifying, but sensitive actions (password change, email change) are gated until verified. Verification uses Better Auth's email-token flow, delivered via the Cloudflare Workers `send_email` binding.
- **Password reset**: Better Auth's built-in forgot-password / reset-password flow, delivered via `send_email`.
- Logout flow.
- **Rate limiting** on `/api/auth/*` endpoints via Cloudflare Rate Limiting rules.
- Route guards for `/app/*` and `/admin/*` enforced in `hooks.server.ts` **and** in each protected `+server.ts`.
- `bun run auth:schema` regenerates `src/lib/server/db/auth.schema.ts` from Better Auth config.

### Acceptance Criteria

- Unauthenticated access to `/app/*` or `/admin/*` redirects to `/login` with a `next` hint.
- Non-admin authenticated users are blocked from `/admin/*` pages and admin endpoints with 403.
- Expired or invalid sessions are rejected on the server and cleared on the client.
- Admin role checks occur on the server even if UI already gates the control.

## 7.2 Public Website

### Requirements

- Prerendered top-level public routes.
- Responsive navigation and footer (shadcn-svelte primitives).
- CTA modules reusable across pages.
- Per-page SEO metadata via a shared helper (title, description, canonical, OG, Twitter).
- Contact / lead capture form using a SvelteKit form action; persisted to D1 (or queued via KV).
- Image optimization via Cloudflare Images or `<img>` with explicit dimensions and `loading="lazy"`.
- Paraglide-driven copy for any string expected to be translated.

### Acceptance Criteria

- All public pages render without auth.
- Metadata is configurable per page and present in the prerendered HTML.
- Public forms validate on the **server** via the form action using shared Zod schemas; client-side validation is progressive (native HTML5 constraints plus the same schema re-run inside `use:enhance` for inline errors). No client-side form library required on public pages.

## 7.3 Blog

### Requirements

- Posts persisted in D1 via Drizzle.
- Per-post fields: title, slug, excerpt, body, cover image, author ref, status, timestamps, SEO fields, `deleted_at`.
- **State semantics** (distinct `status` vs `deleted_at`):
  - `status = 'draft'` — not public, editable by admin.
  - `status = 'published'` — public, editable by admin.
  - `status = 'archived'` — not public, still editable by admin, freely restorable to `draft` or `published`.
  - `deleted_at IS NOT NULL` — soft-deleted (trash). Hidden from default admin lists and from public. Restorable for 30 days; a scheduled Cloudflare Cron hard-deletes rows older than 30 days.
- Content format: **GitHub Flavored Markdown** stored raw in `content_body`; rendered via `micromark` (with GFM extensions) and sanitized with **DOMPurify** before serving. Styled with `@tailwindcss/typography`.
- Image upload via **Cloudflare R2 + Images**: admin editor uploads cover images and in-body images to R2, served through Cloudflare Images for transforms.
- **Slug history**: whenever a published post's slug changes, the previous slug is written to `blog_post_slug_history`. `/blog/[slug]` falls back to history on a miss and issues a 301 to the current canonical slug.
- `/blog` index with pagination (cursor or offset).
- `/blog/[slug]` detail page.
- Optional tag / category taxonomy.
- Admin editing UI under `/admin/blog`.
- Cache-tag regeneration: on publish / update / unpublish / archive / delete, the admin endpoint purges the matching cache tags (`blog:index`, `blog:slug:<slug>`, `blog:tag:<tag>`).

### Acceptance Criteria

- Draft posts are not publicly reachable by slug.
- Published posts appear on `/blog` and `/blog/[slug]`.
- Editing a published post reflects publicly after the regeneration hook completes.
- Duplicate slugs are rejected at the DB + API level.

## 7.4 Consumer App (`/app/*`)

### Requirements

- CSR-only shell using shadcn-svelte layout primitives.
- Auth-guarded layout (`+layout.server.ts` redirect + `+layout.ts` checks).
- Dashboard, profile, settings pages.
- **Items module** — a generic, user-scoped resource (list / create / edit / delete) that establishes the canonical TanStack Query + TanStack Form + TanStack Table patterns for all future domain modules. Schema and UX are intentionally simple (name, description, status, timestamps, `deleted_at`).
- Protected data fetching via TanStack Svelte Query against `/app/api/*` or `+server.ts` endpoints.
- Forms via TanStack Svelte Form with shared validators.
- Tables via TanStack Svelte Table, virtualized with TanStack Svelte Virtual for large sets.
- Optional local-first caching / reactive queries via TanStack Svelte DB where it simplifies a feature (not required for every view).
- Loading, empty, success, and error states for every async surface.

### Acceptance Criteria

- App pages can load user-scoped data after login.
- Unauthorized data requests fail safely with a typed error and do not leak cross-user data.
- Forms validate on both client (TanStack Form + shared schema) and server.

## 7.5 Admin Panel (`/admin/*`)

### Requirements

- CSR-only admin shell using shadcn-svelte.
- Role-gated layout (`role === 'admin'`) with server-side enforcement.
- User list with search / filter / sort / pagination (TanStack Table).
- User detail view.
- Blog list with draft/published indicators.
- Blog create / edit form (TanStack Form) with R2-backed image upload.
- Publish / unpublish actions that trigger cache-tag purge.
- **Archive action** (`status = 'archived'`) — hides post from public, keeps it editable and freely restorable by admin.
- **Soft-delete action** (sets `deleted_at`) — moves to trash; hidden from default admin lists and from public. Restorable for 30 days; a scheduled Cron hard-deletes rows past that window.
- Destructive actions use confirmation dialogs.

### Acceptance Criteria

- Admin can create a draft.
- Admin can publish a post and make it visible publicly (after regeneration).
- Admin can update a post and trigger content refresh.
- Admin can list users and inspect basic account data.
- All admin mutations verify role server-side, not only in the UI.

---

# 8. Technical Requirements

## 8.1 Stack Constraints (fixed)

- Package manager: **Bun**.
- Framework: **SvelteKit 2** on **Svelte 5** (runes: `$state`, `$derived`, `$effect`, `$props`, `$bindable`).
- Deploy: **Cloudflare Workers** via `@sveltejs/adapter-cloudflare`.
- Database: **Cloudflare D1** (SQLite).
- ORM: **Drizzle ORM** with Drizzle Kit migrations.
- Auth: **Better Auth** + Drizzle adapter.
- UI: **shadcn-svelte** on **Tailwind CSS v4**, with `class-variance-authority`, `clsx`, `tailwind-merge`.
- Forms: **TanStack Svelte Form** + shared validators.
- Server state: **TanStack Svelte Query**.
- Tables / virtualization: **TanStack Svelte Table** + **TanStack Svelte Virtual**.
- Optional local-first data: **TanStack Svelte DB**.
- i18n: **Paraglide JS**.
- Content pipeline: **micromark (GFM) + DOMPurify**.
- Storage: **Cloudflare R2 + Cloudflare Images**.
- Analytics: **Cloudflare Web Analytics** (public) + **Firebase Analytics** (app/admin).
- Email: **Cloudflare Workers `send_email` binding** via Email Routing.
- Rate limiting: **Cloudflare Rate Limiting rules** (dashboard-configured).
- Error tracking: **Cloudflare Workers Logs + Logpush** to R2 (free tier).
- Testing: **Vitest** (+ `@vitest/ui`), **Playwright** for E2E.
- Lint / format: **oxlint**, **oxfmt**.

## 8.2 Database Requirements (D1 + Drizzle)

- Drizzle schema under `src/lib/server/db/**`, split into domain files (`auth.schema.ts` generated by Better Auth, `blog.schema.ts`, etc.) and re-exported from a single entry.
- D1 binding exposed via `event.platform.env.DB` (typed via `wrangler types`).
- Local development uses `wrangler d1` with a local SQLite replica; production uses the real D1 binding.
- Migrations managed by Drizzle Kit. Scripts:
  - `bun db:generate` — emit SQL migrations via drizzle-kit.
  - `bun db:push` — drizzle-kit push against the configured remote (dev / shadow flows only).
  - `bun db:migrate` — apply generated migrations to remote D1 (via Drizzle proxy).
  - `bun db:push:local` — raw `wrangler d1 execute` of the **latest** migration file against local D1 (quick iteration; **not** a drizzle-kit push).
  - `bun db:migrate:local` — raw `wrangler d1 execute` of **all** migration files in order against local D1.
  - `bun db:studio` / `db:studio:local` — inspect.
- Every query path must go through Drizzle; raw `DB.prepare` is reserved for migrations and admin scripts.
- Schema should be normalized but not over-engineered.

## 8.3 API / Server Requirements

Implemented with SvelteKit `+server.ts` endpoints and form actions. Must cover:

- Better Auth endpoints (mounted per the Better Auth SvelteKit integration).
- Session validation via `hooks.server.ts`.
- User read / update within scope; admin user management.
- Blog CRUD (admin-only for writes).
- Regeneration / cache-purge triggers after blog writes.
- **Audit log write** on every admin mutation (create / update / publish / unpublish / archive / delete / restore / user-suspend).
- **Rate limiting** on `/api/auth/*`, the contact form action, and admin-mutation endpoints (Cloudflare Rate Limiting rules).
- **Shared request-validation layer**: Zod schemas under `src/lib/validators/**`, consumed by form actions, `+server.ts` handlers, and (in `(app)` / `(admin)`) TanStack Form on the client.
- Consistent structured error responses (`{ code, message, details? }`).
- Health-check endpoint `/api/health` returning `{ ok, db, time }` — used by uptime checks and deploy smoke tests.

## 8.4 Validation

- Shared **Zod** schemas under `src/lib/validators/**`, consumed on both sides:
  - `(public)` + `(auth)` — form actions consume the schema directly. Client uses native HTML5 constraints plus the same schema re-run inside `use:enhance` for inline errors.
  - `(app)` + `(admin)` — TanStack Form uses the schema on the client; `+server.ts` handlers re-run the same schema on the server.
- Form errors are field-level and user-friendly.
- Server always re-validates, even when the client already did.

## 8.5 Design System (shadcn-svelte + Tailwind v4)

- shadcn-svelte components installed into `src/lib/components/ui/**` and composed into higher-level app primitives under `src/lib/components/**`.
- Tailwind v4 config drives theme tokens (colors, spacing, typography); dark mode supported.
- `@tailwindcss/forms` for form control baselines; `@tailwindcss/typography` for blog prose.
- Utility helpers: `cn` (clsx + tailwind-merge) and `cva` for variant-heavy components.
- Reusable patterns required: button, input, select, combobox, dialog, drawer, dropdown, sheet, tabs, table, toast, alert, card, skeleton, form field, badge.
- No DaisyUI. No ad-hoc component libraries.

## 8.6 i18n

- Paraglide JS as the single source of translated strings.
- Compiled messages imported per locale; route-level locale resolution in `hooks.server.ts` (cookie / Accept-Language) with a fallback.
- All user-facing copy in marketing, auth flows, and app shell goes through Paraglide.

## 8.7 Observability on Cloudflare

- Use Workers Logs (`wrangler tail`) in development.
- In production, **Cloudflare Workers Logs** is the primary log stream. **Logpush** exports structured logs (auth failures, admin mutations, publish actions, uncaught errors) to R2 for retention beyond the Workers Logs window.
- A minimal **Tail Worker** aggregates error-level events for alerting (webhook or email via `send_email`).
- Never log secrets, session tokens, or raw passwords.

## 8.8 Secrets & Environment

All secrets live in Wrangler secrets (`wrangler secret put`) or Cloudflare dashboard env vars — never committed. Bindings and env vars surface to TypeScript through `wrangler types` into `worker-configuration.d.ts` and `App.Platform.Env`.

| Name                         | Kind               | Purpose                                                                                            |
| ---------------------------- | ------------------ | -------------------------------------------------------------------------------------------------- |
| `DB`                         | Binding            | D1 database                                                                                        |
| `R2_BLOG_MEDIA`              | Binding            | R2 bucket for blog images                                                                          |
| `IMAGES`                     | Binding            | Cloudflare Images                                                                                  |
| `SEND_EMAIL`                 | Binding            | `send_email` (Email Routing) for verification, password reset, contact notifications, error alerts |
| `BETTER_AUTH_SECRET`         | Secret             | Better Auth signing key                                                                            |
| `BETTER_AUTH_URL`            | Env var            | Canonical site URL for Better Auth                                                                 |
| `CF_IMAGES_ACCOUNT_ID`       | Env var            | Cloudflare Images account id                                                                       |
| `FIREBASE_CONFIG_JSON`       | Env var (public)   | Firebase client config for analytics                                                               |
| `ADMIN_BOOTSTRAP_EMAIL`      | Env var (optional) | First admin email auto-promoted on initial migrate                                                 |
| `CONTACT_NOTIFICATION_EMAIL` | Env var            | Recipient for contact-form submissions                                                             |

`wrangler secret put` covers secrets; `[vars]` in `wrangler.jsonc` covers non-secret env vars. Types regenerated via `bun run gen`.

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
    +layout.svelte               (form-action surface, no client form lib required)
    login/+page.svelte
    register/+page.svelte
    forgot-password/+page.svelte
    reset-password/+page.svelte
    verify-email/+page.svelte
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
    health/+server.ts
```

Exact group names are conventions; the important thing is that `(public)` is prerender-friendly, `(blog)` is SSR-at-edge with cache tags, `(auth)` is server-rendered with form actions, and `(app)` / `(admin)` are CSR-only and auth-gated.

---

# 10. Data Model (Initial, D1 / Drizzle)

**ID format**: all primary keys are **UUID v7** (text, 36 chars), generated via the `uuidv7` package and stored as `text`. UUID v7 is time-ordered (lexicographically sortable), which gives better SQLite B-tree performance than random v4. Better Auth's `user.id` and all app tables use the same generator.

## 10.1 Users

The `user` table is owned by **Better Auth** and extended via `additionalFields`. We do **not** maintain a parallel `app_users` table.

Better Auth core fields: `id` (UUID), `email` (unique), `emailVerified`, `name`, `image`, `createdAt`, `updatedAt`.

App-extended fields (added via `additionalFields`):

- `display_name` (nullable — falls back to `name`)
- `role`: `user` | `admin` (default `user`)
- `status`: `active` | `suspended` (default `active`)
- `last_login_at` (nullable)
- `deleted_at` (nullable — soft delete)

Password hashes and auth-provider refs live in Better Auth's own tables (`account`, etc.) and are not modeled in app schema files.

## 10.2 Sessions / Auth Tables

Generated by Better Auth (`bun auth:schema`) into `src/lib/server/db/auth.schema.ts`. Do not edit by hand.

## 10.3 Blog Posts

- id
- title
- slug (unique)
- excerpt
- content_body (GitHub Flavored Markdown, raw)
- cover_image_url (nullable — R2 / Cloudflare Images URL)
- seo_title (nullable)
- seo_description (nullable)
- status: `draft` | `published` | `archived`
- author_id → users.id
- published_at (nullable)
- created_at, updated_at
- deleted_at (nullable — soft delete)

## 10.4 Blog Tags

- id, name, slug (unique)

## 10.5 Blog Post Tags (join)

- post_id, tag_id (PK composite)

## 10.6 Items (App Module)

- id
- user_id → users.id (owner scope)
- name
- description (nullable)
- status: `active` | `archived`
- created_at, updated_at
- deleted_at (nullable — soft delete)

## 10.7 Audit Log (required for v1)

- id
- actor_user_id → users.id
- action_type (e.g. `blog.publish`, `blog.delete`, `blog.restore`, `user.suspend`)
- entity_type (e.g. `blog_post`, `user`)
- entity_id
- metadata_json (nullable — context like previous slug, status change, IP)
- created_at

Written by every admin mutation. Retention is indefinite in v1; archival policy deferred to post-MVP.

## 10.8 Blog Post Slug History

- id
- post_id → blog_posts.id
- old_slug (indexed)
- created_at

Populated whenever a published post's slug changes. `/blog/[slug]` resolves history misses with a 301 redirect to the current canonical slug.

---

# 11. Permissions Model

## 11.1 Roles

### User

- Access `/app/*`.
- Manage own profile / settings.
- No access to `/admin/*` or admin endpoints.

### Admin

- All user capabilities.
- Access `/admin/*`.
- Manage blog posts and inspect users.

## 11.2 Authorization Rules

- UI gating is never sufficient; server-side authorization is mandatory.
- Every admin `+server.ts` handler re-checks `role === 'admin'`.
- Every user-scoped query filters by `event.locals.user.id` unless admin override is explicitly intended.

---

# 12. Blog Editing Requirements

## 12.1 Editor Capabilities

- Create draft, edit all fields, save draft.
- Publish, unpublish / revert to draft.
- Preview mode (recommended).

## 12.2 Slug Rules

- Unique.
- Normalized (lowercase, kebab-case, ASCII-folded).
- Changing a published post's slug writes the previous slug to `blog_post_slug_history`. `/blog/[slug]` resolves history matches with a 301 redirect to the current canonical slug — old links never 404.

## 12.3 Publishing Rules

- Only admins can publish.
- Minimum required fields must pass validation before publishing.
- Publishing sets `published_at` on first publish; subsequent re-publishes do not overwrite it unless explicitly requested.
- Publish / unpublish / update trigger regeneration for affected public routes.

---

# 13. UX and UI Requirements

## 13.1 General

- Responsive posture by surface:
  - `(public)` + `(blog)` — **mobile-first** (SEO + conversion traffic skews mobile).
  - `(app)` — **fluid** (mobile + desktop both common in SaaS usage).
  - `(admin)` — **desktop-first** (dense tables, management workflows).
- Accessibility-conscious forms and controls (shadcn-svelte primitives cover most a11y baselines).
- Clear empty, loading, error states.
- Destructive actions require confirmation (shadcn `AlertDialog`).
- Long-running actions show progress (spinners, skeletons, disabled states).

## 13.2 Dashboard UX

- Persistent shell: sidebar + topbar (shadcn-svelte patterns).
- Search / filter on tables.
- Reusable data table via TanStack Svelte Table + shadcn styling.
- Toasts for mutation feedback (shadcn `Sonner` or equivalent).

## 13.3 Admin UX

- High-density layouts permitted.
- Tables with pagination / filter / sort / virtualization for long lists.
- Blog form with inline field validation via TanStack Form.
- Publish state visibly differentiated (badges).

---

# 14. Non-Functional Requirements

## 14.1 Performance

- Prerendered pages ship minimal JS (favor `csr = false` where interactivity is not needed).
- Blog pages are cache-friendly (Cloudflare cache, cache headers, cache tags where used).
- CSR shells avoid unnecessary bundle bloat — prefer dynamic imports for heavy admin-only screens.
- Tables use pagination and virtualization for large result sets.

## 14.2 Reliability

- Idempotency on critical mutations where feasible.
- Structured error responses.
- Deterministic migration workflow for both local and remote D1.

## 14.3 Security

- Passwords hashed by Better Auth; never stored plaintext.
- Sessions follow Better Auth defaults (secure, httpOnly, SameSite).
- CSRF handled per Better Auth + SvelteKit recommendations.
- Validate every input; encode every output.
- Admin surfaces require real authorization — hidden links are not a control.
- Secrets live in Wrangler secrets / env vars, never in source (see §8.8).
- **Rate limiting** (Cloudflare Rate Limiting rules) on `/api/auth/*`, contact form, and admin mutation endpoints.
- **Security headers** set via `hooks.server.ts`: `Content-Security-Policy`, `Strict-Transport-Security`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`.
- **DOMPurify** runs on rendered blog HTML on the server before dispatch; raw `content_body` is never trusted client-side.

## 14.4 Maintainability

- Clear route-group and module boundaries.
- Shared UI primitives (shadcn-svelte).
- Shared validators (client + server).
- Tests over core workflows.

---

# 15. Observability and Operational Requirements

## 15.1 Logging

- Log auth failures, admin actions, publish actions, and server errors through a centralized `logger`.
- Never log secrets or session tokens.

## 15.2 Monitoring

- **Cloudflare Workers Logs** is the primary log stream; **Logpush** exports to R2 for retention.
- **Cloudflare Web Analytics** covers public-surface metrics; **Firebase Analytics** covers authenticated event tracking (gated behind consent — see §16.4).
- `/api/health` returns `{ ok, db, time }` — used by uptime checks and deploy smoke tests.

## 15.3 Backups

- Document the D1 backup / export procedure (`wrangler d1 export`).
- Migrations reversible where feasible; irreversible migrations require a documented runbook.

---

# 16. Analytics Requirements

Two-stack analytics: **Cloudflare Web Analytics** for privacy-friendly, zero-JS public page metrics, and **Firebase Analytics** for authenticated app / admin event tracking.

## 16.1 Public (Cloudflare Web Analytics)

- Page views, CTA clicks, blog post views, referral sources (where legal).
- Privacy-friendly: cookieless, minimal beacon script only. No third-party analytics JS on public pages.

## 16.2 App (Firebase Analytics)

- Sign-up completion, login success/failure, feature usage events.
- Gated behind user consent where required.

## 16.3 Admin (Firebase Analytics)

- Posts created / published, user growth, key moderation actions.

## 16.4 Consent

A minimal in-house consent banner (shadcn `Dialog`) appears on first visit when region heuristics suggest EU jurisdiction. **Firebase Analytics is not initialized until the user accepts.** Cloudflare Web Analytics remains active regardless (cookieless, no consent required). Consent state persists in `localStorage`; users can revisit consent from a footer link.

---

# 17. MVP Definition

MVP is complete when:

- Static marketing pages exist, prerendered, and are navigable.
- Public blog exists with index and detail pages, with cache-tag regeneration on publish.
- Admin can create / edit / publish / archive / soft-delete blog posts.
- Blog slug history + 301 redirect resolution is implemented.
- Authentication works: registration (with email verification), login, logout, password reset.
- `/app/*` is CSR-only, auth-guarded, and functional.
- `/admin/*` is CSR-only, role-gated, and functional.
- **Items module** demonstrates the canonical TanStack Query + Form + Table patterns.
- Basic user management for admins.
- Audit log written on every admin mutation.
- Rate limiting active on auth + contact + admin mutation endpoints.
- Paraglide wired with at least one locale; all app-shell + auth copy routed through it.
- Cloudflare Web Analytics beacon live on public surfaces; Firebase Analytics gated behind consent banner on authenticated surfaces.
- `/api/health` endpoint deployed and returns a valid response.
- Core tests pass (Vitest).
- Setup, migration, and deployment docs exist (local dev, `wrangler`, D1 migrations).

---

# 18. Delivery Phases

## Phase 0 — Foundations

- Confirm SvelteKit + adapter-cloudflare setup.
- Tailwind v4 + shadcn-svelte installed with base theme + tokens.
- Drizzle ORM + Drizzle Kit wired to D1 (local + remote).
- Better Auth configured; `bun auth:schema` generating auth tables with `additionalFields`.
- Paraglide JS configured with a minimum of one locale.
- Route groups `(public)`, `(blog)`, `(auth)`, `(app)`, `(admin)` scaffolded.
- Shared Zod validators + `cn`/`cva` helpers in place.
- `hooks.server.ts` session + guard scaffolding + security headers.
- Cloudflare Rate Limiting rules configured for auth + contact endpoints.
- Secrets catalogued in `wrangler.jsonc` bindings + `wrangler secret put` (see §8.8).
- Vitest baseline.

## Phase 1 — Public Site

- Prerendered marketing routes + shared layout, nav, footer (mobile-first).
- Contact / lead form (form action + D1 + rate limit + `send_email` notification).
- SEO metadata helper + JSON-LD support.

## Phase 2 — Blog

- Blog Drizzle schema + migrations (including `deleted_at`, `blog_post_slug_history`).
- Markdown rendering pipeline: `micromark` + GFM + DOMPurify.
- R2 + Cloudflare Images integration for image upload.
- Admin blog CRUD `+server.ts` endpoints (draft / publish / archive / soft-delete / restore).
- Archive and trash UX with 30-day hard-delete Cron.
- Public `/blog` + `/blog/[slug]` routes with slug-history 301 fallback.
- Cache-tag regeneration hook (`blog:index`, `blog:slug:<slug>`, `blog:tag:<tag>`).

## Phase 3 — Auth + User App

- Register / login / logout / email verification / password reset via Better Auth.
- `send_email` wired for verification and reset emails.
- Session restoration on cold loads.
- Protected `/app/*` shell with CSR + TanStack Query hydration.
- User settings + profile screens.
- **Items module** (list / create / edit / soft-delete) establishing the canonical TanStack patterns.
- First dashboard views.

## Phase 4 — Admin Panel

- Protected `/admin/*` shell with role gate.
- User management screens (TanStack Table + Virtual).
- Blog management screens (list + editor with TanStack Form).
- Publish / archive / trash workflow with confirmation dialogs.
- Audit log writes on every admin mutation + minimal read UI (plain table).
- Rate limiting on admin mutation endpoints.

## Phase 5 — Hardening

- E2E tests with **Playwright**.
- Consent banner for Firebase Analytics (EU gate).
- Security review (CSP headers, auth flows, rate limits).
- Performance + bundle size review (public pages, CSR shells).
- Accessibility pass.
- Deployment + backup docs (D1 export, migration runbook).

---

# 19. Implementation Checklist

## 19.1 Foundations

- [x] Bun workspace verified
- [x] TypeScript baseline (`svelte-check` clean)
- [x] oxlint + oxfmt configs
- [x] Tailwind v4 + theme tokens
- [x] shadcn-svelte CLI set up; base components installed
- [x] Drizzle ORM + Drizzle Kit configured for local + remote D1
- [x] `wrangler.jsonc` D1 binding verified; `wrangler types` generating typed env
- [x] All secrets from §8.8 catalogued in `wrangler.jsonc` / `wrangler secret put`
- [x] Better Auth configured with Drizzle adapter + `additionalFields`
- [x] `bun auth:schema` produces `src/lib/server/db/auth.schema.ts`
- [x] Paraglide JS configured
- [x] Route groups `(public)`, `(blog)`, `(auth)`, `(app)`, `(admin)` scaffolded
- [x] `hooks.server.ts` session + guard scaffold + security headers
- [x] Cloudflare Rate Limiting rules configured for auth + contact endpoints
- [x] Shared Zod validators module (`src/lib/validators/**`)
- [x] `cn` + `cva` helpers
- [x] Vitest smoke test passing

## 19.2 Auth

- [ ] Registration with email verification
- [ ] Email verification flow (`verify-email` route + `send_email`)
- [ ] Login
- [ ] Logout
- [ ] Session persistence + refresh
- [ ] Password reset (forgot-password + reset-password + `send_email`)
- [ ] `/app/*` route guard (hooks + layout)
- [ ] `/admin/*` role guard (hooks + layout + endpoint)
- [ ] 401 / 403 UI states

## 19.3 Public Site

- [x] Home
- [x] Features
- [x] Pricing
- [x] About
- [x] Contact
- [x] Legal pages
- [x] Shared SEO helper
- [x] CTA placement review
- [ ] Responsive QA

## 19.4 Blog

- [x] Blog schema + migration (including `deleted_at`, `blog_post_slug_history`)
- [x] Tag / category schema (if included)
- [x] Markdown rendering pipeline (`micromark` + GFM + DOMPurify)
- [ ] R2 + Cloudflare Images upload integration
- [x] `/blog` index route
- [x] `/blog/[slug]` detail route + slug-history 301 fallback
- [x] Slug uniqueness validation
- [x] Draft save
- [x] Publish
- [x] Update
- [x] Archive (`status = 'archived'`)
- [x] Soft-delete (sets `deleted_at`) + restore
- [ ] 30-day hard-delete Cron for trashed posts
- [x] SEO fields support
- [ ] Cache-tag purge on publish / update / archive / delete
- [ ] Public cache strategy documented

## 19.5 App

- [ ] App shell layout (shadcn-svelte)
- [ ] Dashboard
- [ ] Profile
- [ ] Settings
- [ ] Items module (schema + endpoints + list/create/edit/soft-delete UI)
- [ ] Protected data fetching via TanStack Query
- [ ] Forms via TanStack Form + shared validators
- [ ] Loading / error / empty states
- [ ] Reusable table / form primitives

## 19.6 Admin

- [ ] Admin shell layout
- [ ] Admin dashboard
- [ ] User list (table + virtual)
- [ ] User detail view
- [ ] Blog list (with draft / published / archived / trash indicators)
- [ ] Blog create/edit form
- [ ] Publish / unpublish / archive / soft-delete / restore actions
- [ ] Search / filter / pagination
- [ ] Destructive action confirmations
- [ ] Audit log writes on every admin mutation
- [ ] Audit log read UI (minimal table view)
- [ ] Rate limiting on admin mutation endpoints

## 19.7 Quality

- [ ] Unit tests for utilities and validators (Vitest)
- [ ] Integration tests for auth, blog, and items endpoints (Vitest)
- [ ] E2E tests for critical flows (Playwright)
- [ ] Accessibility checks on forms/nav
- [ ] Performance / bundle review for public pages
- [ ] Cloudflare Web Analytics beacon wired on public surfaces
- [ ] Firebase Analytics initialized on authenticated surfaces, gated behind consent banner
- [ ] Consent banner implemented and tested
- [ ] `/api/health` smoke test in deploy pipeline
- [ ] Security headers verified in production responses
- [ ] Deployment checklist
- [ ] Backup + migration docs (D1 export, 30-day trash cron runbook)

---

# 20. Test Strategy

## 20.1 Levels

### Unit (Vitest)

- Validators
- Slug generation + normalization
- Role checks
- Pure utilities
- Content state transitions (draft → published → archived)

### Integration (Vitest)

- Better Auth flows against a miniflare-backed local D1
- Session validation + route guards
- Protected endpoint access
- Blog CRUD endpoints
- Publish / unpublish workflow
- Admin-only authorization
- Drizzle queries and migrations

### End-to-End (Playwright)

- Visitor browses public site
- Visitor reads blog post
- User registration / login
- User reaches `/app/*`
- Non-admin denied from `/admin/*`
- Admin logs in
- Admin creates / edits / publishes a post
- Published post appears publicly
- User logout

## 20.2 Coverage Areas

### Auth

- Valid registration succeeds
- Duplicate email fails cleanly
- Valid login succeeds
- Invalid credentials fail
- Expired / invalid session rejected
- Admin endpoint rejects regular user

### Blog

- Draft not visible publicly
- Published visible publicly
- Duplicate slug rejected
- Update propagates after regeneration
- Archived / unpublished removed from public listing

### App

- Unauthenticated user blocked from `/app/*`
- Authenticated user can reach `/app/dashboard`
- User cannot access another user's records

### Admin

- Unauthenticated visitor blocked from `/admin/*`
- Regular user blocked from `/admin/*`
- Admin reaches `/admin/dashboard`
- Admin creates/updates/publishes content
- Admin lists users

### Regression

- Public routes still work after auth changes
- Blog publishing does not break static marketing pages
- `/app/*` and `/admin/*` guards remain enforced after routing changes

---

# 21. Acceptance Test Matrix

## Public Site

- [ ] All public pages render correctly
- [ ] Nav and footer links work
- [ ] SEO metadata present in prerendered HTML
- [ ] Contact form validates input

## Blog

- [ ] Index lists only published posts
- [ ] Detail resolves by slug
- [ ] Drafts hidden
- [ ] Updates propagate via regeneration

## App

- [ ] Unauthenticated access denied
- [ ] Authenticated access granted
- [ ] User data loads correctly
- [ ] Forms validate and save

## Admin

- [ ] Non-admin access denied
- [ ] Admin access granted
- [ ] Blog CRUD works
- [ ] User listing works
- [ ] Publish / unpublish works

---

# 22. Risks and Tradeoffs

## 22.1 D1 Constraints

- D1 is SQLite with Cloudflare-specific write throughput and region semantics. Acceptable for v1; revisit if write volume grows significantly.
- Long-running transactions and large batch writes are not D1's strong suit — prefer batch APIs via Drizzle.

## 22.2 CSR-Only for App + Admin

- Simplifies SSR/session juggling on authenticated surfaces, relies more on client bundle.
- Acceptable because SEO is not required for these surfaces.
- **Known UX costs**: blank shell on first paint until auth resolves (mitigated with skeleton states); auth-state flicker on cold loads; client bundle growth over time (mitigated with route-level code splitting and dynamic imports for heavy admin screens).
- **Budget discipline**: every new heavy dependency in `(app)` / `(admin)` should be lazy-loaded unless used on every route.

## 22.3 shadcn-svelte Maturity

- shadcn-svelte is a port of shadcn/ui and evolves alongside Svelte 5. Occasionally expect rough edges; prefer the registry's current components over hand-rolled variants.

## 22.4 Cloudflare Workers Runtime

- Not Node.js: no `fs`, limited APIs, sized bundles. Server modules must be Workers-compatible. Keep server-only deps under `src/lib/server/**` and off client imports.

## 22.5 Paraglide Adoption

- Adding strings after the fact is tedious. Route copy through Paraglide from day one for any surface likely to be translated.

---

# 23. Future Enhancements

- Rich text / markdown editor improvements (WYSIWYG, slash menu, etc.)
- Scheduled publishing
- Media library UI over R2 (v1 is upload-only in the editor)
- Full-text search across blog content (D1 FTS or external)
- Social authentication providers
- MFA / 2FA (TOTP, WebAuthn)
- Session management UI (list active sessions, revoke individual sessions)
- Multi-role permissions beyond `user` / `admin`
- Team / organization support
- Billing / subscriptions
- Notification center
- Feature flags
- API tokens / webhooks
- Impersonation for admins (audit-logged)

---

# 24. Resolved Decisions

All open questions resolved for v1 MVP:

| Question                            | Decision                                                                                                                                                    |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Core domain modules inside `/app/*` | **Generic resource module**: Start with a single "Items" module to establish TanStack Query/Form/Table patterns before building domain-specific features.   |
| Blog content format                 | **GitHub Flavored Markdown**: Simple, well-supported, works perfectly with `@tailwindcss/typography`. Render with `micromark` + DOMPurify for sanitization. |
| Blog image handling                 | **Basic image upload**: Implement minimal Cloudflare R2 + Images integration for v1.                                                                        |
| Blog rendering                      | **SSR at the edge with tagged cache**: render on request from D1, not build-time prerendered. Cache API tags drive invalidation.                            |
| Social authentication               | **Email/password only**: Defer social providers to post-MVP.                                                                                                |
| Password reset                      | **In v1**: Better Auth's built-in flow delivered via `send_email`.                                                                                          |
| Email verification                  | **Required for signup**: user can log in pre-verification; sensitive actions gated until verified.                                                          |
| MFA / 2FA                           | **Post-MVP**: Deferred.                                                                                                                                     |
| Admin user impersonation            | **Post-MVP**: Not required for initial launch.                                                                                                              |
| User table ownership                | **Extend Better Auth's `user` via `additionalFields`**: no parallel `app_users` table.                                                                      |
| Public / auth form posture          | **Form actions + shared Zod**: progressive enhancement on `(public)` + `(auth)`; TanStack Form inside `(app)` + `(admin)`. Validation runs on both sides.   |
| Blog status vs soft delete          | **Both, distinct**: `status = 'archived'` = public-hidden, admin-editable. `deleted_at IS NOT NULL` = trash, 30-day retention, cron hard-deletes.           |
| Slug redirects                      | **Slug history table**: previous slugs stored in `blog_post_slug_history`, resolved with 301 on miss.                                                       |
| Analytics stack                     | **Cloudflare Web Analytics + Firebase**: privacy-friendly beacon for public; Firebase gated behind consent banner for app/admin.                            |
| Consent banner                      | **Minimal in-house** (shadcn `Dialog`): blocks Firebase until accepted; CF Web Analytics is cookieless so runs regardless.                                  |
| Blog regeneration strategy          | **Cloudflare Cache API with tags**: tag blog routes on render, purge relevant tags when posts are published/updated/archived.                               |
| Email provider                      | **Cloudflare Workers `send_email` binding** via Email Routing.                                                                                              |
| Rate limiting                       | **Cloudflare Rate Limiting rules** (dashboard-configured) on auth, contact, and admin mutation endpoints.                                                   |
| Error tracking                      | **Cloudflare Workers Logs + Logpush to R2** (free tier); Tail Worker aggregates error-level events.                                                         |
| Audit log                           | **Required in MVP**: schema + writes on every admin mutation + minimal read UI.                                                                             |
| Responsive posture                  | **Split by surface**: mobile-first for `(public)` + `(blog)`, desktop-first for `(admin)`, fluid for `(app)`.                                               |
| ID format                           | **UUID v7** (text, generated via `uuidv7` package). Time-ordered for better SQLite index performance.                                                       |
| E2E test runner                     | **Playwright**: Official SvelteKit default with excellent Workers support.                                                                                  |

---

# 25. Final Recommendation

Preserve these boundaries through implementation:

- **Public web concern**: prerendered + SEO + blog regeneration.
- **Application concern**: authenticated CSR product surface, TanStack Query over `+server.ts`.
- **Administration concern**: privileged CSR management surface, server-enforced role checks.
- **Server concern**: Better Auth, Drizzle/D1 persistence, authorization, blog operations, user management, regeneration hooks.

Keep server-only code under `src/lib/server/**` and never import it from client modules. Keep UI primitives centralized in shadcn-svelte components. Route all mutations through validated endpoints. Treat D1 migrations as first-class deliverables, not afterthoughts.

---

# 26. Definition of Done

The project is done for v1 when:

- Route groups are implemented per the rendering strategy.
- Auth flows complete and server-enforced: registration, email verification, login, logout, password reset.
- Blog publishing + public rendering + cache-tag regeneration work end-to-end.
- Blog archive, soft-delete, restore, and 30-day hard-delete Cron implemented.
- Slug history + 301 redirects implemented for published posts.
- `/app/*` and `/admin/*` are protected and functional.
- Items module demonstrates canonical TanStack patterns.
- Audit log written on every admin mutation.
- Rate limiting active on auth, contact, and admin mutation endpoints.
- D1 schema and migrations are stable (local + remote).
- Secrets catalogued and documented per §8.8.
- Test suite covers critical workflows.
- Consent banner live; Firebase Analytics gated behind it.
- Setup, migration, and deployment documentation is complete.
- No critical security or data integrity issues remain open.
