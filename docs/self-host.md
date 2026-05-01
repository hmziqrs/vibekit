# Self-Host-First Adapter Plan

Primary target: run Vibekit on a VPS with Bun, SQLite, and self-hosted storage. Secondary target: keep the current Cloudflare Workers integration working by moving D1/R2/cache access behind adapter wrappers and moving email to a shared REST adapter.

This is a planning document. The first implementation goal is not to delete Cloudflare code. The first implementation goal is to stop route code from depending directly on `event.platform.env`.

---

## Direction

| Concern | Self-host default | Cloudflare adapter |
|---|---|---|
| Runtime | Bun running SvelteKit adapter-node output | Workers via adapter-cloudflare/current worker path |
| DB | SQLite via `bun:sqlite` + Drizzle | Existing `D1Database` binding + Drizzle |
| Storage | Filesystem first, S3/RustFS as production-capable backend | Existing `R2_BLOG_MEDIA` binding |
| Email | Cloudflare Email Service REST, or later SMTP/provider adapter | Cloudflare Email Service REST; existing `SEND_EMAIL` binding kept only as rollback during migration |
| Cache | HTTP cache headers + Caddy/Nginx; app purge is no-op or proxy-specific | Existing Cloudflare Cache API behavior wrapped |
| Static assets | adapter-node static serving or Caddy/Nginx | Existing Cloudflare asset path remains until proven replacement |
| Client IP | `event.getClientAddress()` with proxy env configured | `event.getClientAddress()` or Cloudflare adapter equivalent |
| Cron | `/api/admin/cleanup` called by systemd timer or external scheduler | Same endpoint; Cloudflare trigger can stay until external scheduler is proven |

Locked principles:

- Self-host is the default development and production path we prove first.
- Cloudflare support is preserved, not removed.
- App routes must not import or reference `D1Database`, `R2Bucket`, `SEND_EMAIL`, `cloudflare:workers`, or `event.platform.env`.
- Cloudflare-specific code is allowed only in Cloudflare adapter modules, hooks wiring, and the Cloudflare entrypoint.
- Do not upgrade Drizzle, swap storage strategy, or delete `worker.ts` as part of the first wrapper pass. Those are separate decisions after parity is proven.

---

## Current Problem

Cloudflare bindings are spread through route code today:

- `getDb(platform!.env.DB)` is used across page loads and API routes.
- Uploads call `uploadToR2(bucket, file)` with an `R2Bucket`.
- Contact form uses `platform.env.SEND_EMAIL`.
- Cleanup reads `platform.env.CRON_SECRET`.
- Blog cache purge accepts a Cloudflare cache-like platform object.
- `src/app.d.ts` types `App.Platform` around Cloudflare.

That means the app is Cloudflare-shaped even though the production infrastructure is not proven. The fix is to move runtime-specific behavior behind service wrappers before trying to operate two deploy targets.

---

## Target Shape

Use request-scoped services, not raw module-level Cloudflare globals.

```ts
// src/lib/server/services/types.ts
export interface AppServices {
  db: AppDb
  storage: StorageClient
  email: EmailClient
  cache: CacheClient
  env: RuntimeEnv
}
```

Routes consume services through `event.locals.services`:

```ts
export const POST = async ({ locals, request }) => {
  const { db, storage } = locals.services
  // no platform.env here
}
```

Why request-scoped instead of global singletons:

- Cloudflare bindings are request/runtime-provided and are safest when wrapped from `event.platform.env`.
- Better Auth with D1 should not depend on a global DB initialized outside the request path.
- Self-host can still cache expensive resources inside the Node/Bun adapter implementation.
- Tests can inject fake services without mocking Cloudflare globals.

Proposed layout:

```txt
src/lib/server/
  services/
    types.ts
    index.ts                  # createServices(event)
  adapter/
    node/
      services.ts             # self-host AppServices factory
      db.ts                   # bun:sqlite + drizzle, internally cached
      storage-filesystem.ts   # first self-host storage backend
      storage-s3.ts           # optional RustFS/S3 backend
      email-rest.ts           # Cloudflare Email REST/provider adapter
      cache.ts                # no-op or reverse-proxy-aware cache hooks
      env.ts                  # zod-validated self-host env
    cloudflare/
      services.ts             # AppServices from event.platform.env
      db.ts                   # wraps existing D1 binding
      storage-r2.ts           # wraps existing R2 binding
      email-rest.ts           # Cloudflare Email REST adapter
      email-binding.ts        # temporary rollback wrapper for existing SEND_EMAIL binding
      cache.ts                # wraps existing Cache API purge behavior
```

`src/hooks.server.ts` is the boundary:

```ts
event.locals.services = createServices(event)
event.locals.auth = createAuth(event.locals.services.db)
```

App code sees `AppServices`; adapter code sees Cloudflare or Bun details.

---

## Interfaces

### DB

Keep the current Drizzle version for the first pass.

```ts
export type AppDb = ReturnType<typeof createNodeDb> | ReturnType<typeof createCloudflareDb>
```

Do not require a Drizzle RC upgrade in Phase 1. If `bun:sqlite` support in the current Drizzle version works, stay there. If it does not, evaluate an ORM upgrade as a separate migration.

### Storage

The storage interface must preserve the metadata the current CDN route needs.

```ts
export interface StoredObject {
  body: ReadableStream
  contentType: string
  cacheControl?: string
  size?: number
  etag?: string
}

export interface PutOptions {
  contentType?: string
  cacheControl?: string
  metadata?: Record<string, string>
}

export interface PutResult {
  key: string
  url: string
  size: number
  contentType: string
}

export interface StorageClient {
  put(key: string, body: ReadableStream | Uint8Array | Blob, opts?: PutOptions): Promise<PutResult>
  get(key: string): Promise<StoredObject | null>
  delete(key: string): Promise<void>
}
```

Cloudflare implementation wraps the existing `R2_BLOG_MEDIA` binding first. Do not force Workers to use R2's public S3 API in the initial migration.

Self-host implementation can start with filesystem storage under `/data/uploads`. Add RustFS/S3 after the filesystem path is deployed and tested, unless object storage is required before first VPS launch.

Canonical public URL should remain `/cdn/blog/{key}` during the migration so existing blog content and UI assumptions stay stable.

### Email

```ts
export interface EmailMessage {
  to: string | string[]
  from: string
  subject: string
  html?: string
  text?: string
  replyTo?: string
}

export type EmailResult =
  | { ok: true; delivered: string[]; queued?: string[] }
  | { ok: false; reason: string }

export interface EmailClient {
  send(message: EmailMessage): Promise<EmailResult>
}
```

Both self-host and Cloudflare Workers should use Cloudflare Email Service REST as the target implementation. This keeps email behavior identical across runtimes and avoids MIME/binding differences leaking into the app.

The existing `SEND_EMAIL` binding should be preserved only as a temporary rollback adapter while the REST path is validated. It is not the target Cloudflare email implementation.

Document the Cloudflare Email Service product constraints:

- domain/sender verification is required;
- DNS must be configured;
- service availability and quotas are Cloudflare-account dependent;
- if "no Cloudflare account" becomes a hard requirement, add an SMTP/Resend/Postmark adapter.

### Cache

```ts
export interface CacheClient {
  purgeBlog(slug?: string): Promise<void>
}
```

Cloudflare implementation keeps the existing Cache API purge behavior. Self-host implementation can be a no-op initially because Caddy/Nginx and browser/CDN behavior should be driven by `Cache-Control` headers.

Do not delete current Cloudflare cache code until Cloudflare preview has passed with the wrapper.

### Runtime Env

```ts
export interface RuntimeEnv {
  origin: string
  betterAuthSecret: string
  cronSecret: string
  contactNotificationEmail?: string
  publicCfWebAnalyticsToken?: string
  publicFirebaseConfig?: string
}
```

Email REST config should be validated by the email adapter, not by global app env:

```ts
export interface EmailRestEnv {
  cfAccountId: string
  cfApiToken: string
  emailFrom: string
}
```

Self-host env is validated with zod in `adapter/node/env.ts`, but validation should be split by concern. Importing auth should not require S3 credentials, and importing storage should not require email credentials.

Cloudflare env is read from existing `event.platform.env` inside `adapter/cloudflare/services.ts`. The REST email adapter reads `CF_ACCOUNT_ID`, `CF_API_TOKEN`, and `EMAIL_FROM` from the active runtime env. In Workers these should be Worker secrets/vars; in self-host they are process env.

---

## Config Strategy

Use an adapter selector, but keep the Cloudflare path conservative.

```txt
ADAPTER=node         # default
ADAPTER=cloudflare  # Cloudflare validation/deploy
```

Svelte/Vite aliases can point service internals at the selected adapter, but the safer first pass is:

- `createServices(event)` chooses Node vs Cloudflare at runtime/build-time.
- Node-specific files must not import `cloudflare:workers`.
- Cloudflare-specific files must not be imported during Node builds.

Package scripts should eventually split:

```json
{
  "dev": "ADAPTER=node vite dev",
  "build:node": "ADAPTER=node vite build",
  "start": "bun ./build/index.js",
  "check:node": "ADAPTER=node svelte-kit sync && svelte-check --tsconfig ./tsconfig.json",
  "build:cf": "ADAPTER=cloudflare wrangler types --check && ADAPTER=cloudflare vite build",
  "preview:cf": "bun run build:cf && wrangler dev --config wrangler.jsonc --port 4173",
  "check:cf": "ADAPTER=cloudflare wrangler types --check && ADAPTER=cloudflare svelte-kit sync && svelte-check --tsconfig ./tsconfig.json"
}
```

Notes:

- Add `@sveltejs/adapter-node` only when implementation starts.
- Keep `@sveltejs/adapter-cloudflare`.
- Keep `wrangler.jsonc` Cloudflare bindings initially: `d1_databases`, `r2_buckets`, `send_email`, and `triggers.crons`. `send_email` is temporary rollback while REST email is validated.
- Keep `worker.ts` initially. Once Cloudflare wrappers pass, decide separately whether to shrink it or move to adapter-cloudflare's generated `_worker.js` entry.
- If moving to generated Cloudflare entry later, `wrangler.main` should point to `.svelte-kit/cloudflare/_worker.js`; do not simply drop `main`.

---

## Phases

### Phase 0 - Freeze Intent

- [ ] Keep this document as the source of truth before runtime code changes.
- [ ] Decide whether first self-host storage backend is filesystem or RustFS/S3.
- [ ] Decide whether self-host email must avoid Cloudflare entirely. If not, use Cloudflare Email Service REST for both self-host and Workers.
- [ ] Decide whether custom `worker.ts` stays long term or only during migration.

### Phase 1 - Service Boundary, Cloudflare Still Works

Goal: no route code reads `event.platform.env`, but behavior remains Cloudflare-compatible.

- [ ] Add `AppServices` and service interfaces.
- [ ] Add Cloudflare service wrappers around existing D1, R2, cache, and env bindings.
- [ ] Add Cloudflare Email REST wrapper for both self-host and Workers; keep `SEND_EMAIL` binding wrapper only as rollback.
- [ ] Add email REST env requirements: `CF_ACCOUNT_ID`, `CF_API_TOKEN`, and `EMAIL_FROM`.
- [ ] Add Node service wrappers with minimal self-host behavior.
- [ ] Inject `event.locals.services` in `hooks.server.ts`.
- [ ] Keep `createAuth(db)` as a factory for now; pass `locals.services.db`.
- [ ] Update `src/app.d.ts` for `locals.services` and the new auth type.
- [ ] Replace route usage of `getDb(platform!.env.DB)` with `locals.services.db`.
- [ ] Replace upload usage of `R2Bucket` with `locals.services.storage`.
- [ ] Replace contact email usage with `locals.services.email`.
- [ ] Replace cleanup secret usage with `locals.services.env.cronSecret`.
- [ ] Replace blog cache purge calls with `locals.services.cache.purgeBlog(slug)`.

Exit gate:

- [ ] `rg "platform\\??\\.?|event\\.platform|env\\.DB|R2_BLOG_MEDIA|SEND_EMAIL|D1Database|R2Bucket" src` shows no route/app-layer leaks, except allowed adapter files and type declarations.
- [ ] Existing Cloudflare local preview still passes smoke tests.

### Phase 2 - Self-Host Runtime

Goal: the app runs outside Cloudflare with real SQLite and self-host storage.

- [ ] Add `@sveltejs/adapter-node`.
- [ ] Make `ADAPTER=node` the default SvelteKit adapter.
- [ ] Implement `adapter/node/db.ts` with SQLite and Drizzle.
- [ ] Use a real SQLite file in dev/test, not `:memory:` for app smoke tests.
- [ ] Enable WAL and foreign keys for SQLite connections.
- [ ] Implement filesystem storage under `/data/uploads` or the chosen RustFS/S3 backend.
- [ ] Implement Cloudflare Email REST adapter for self-host, plus explicit no-op/dev email behavior when REST credentials are absent in local development.
- [ ] Add self-host `.env.example` entries for `CF_ACCOUNT_ID`, `CF_API_TOKEN`, `EMAIL_FROM`, and `CONTACT_NOTIFICATION_EMAIL`.
- [ ] Configure `ADDRESS_HEADER`/`XFF_DEPTH` or equivalent when running behind Caddy/Nginx.
- [ ] Add `.env.example` entries for self-host runtime variables.

Exit gate:

- [ ] `bun run build:node && bun run start` works.
- [ ] Login/register/session flows work on the self-host runtime.
- [ ] Blog CRUD, upload, CDN image serving, contact form, and cleanup endpoint work.

### Phase 3 - Cloudflare Adapter Validation

Goal: Cloudflare remains a supported wrapper, not the primary architecture driver.

- [ ] Keep existing D1/R2 bindings in `wrangler.jsonc`; keep `SEND_EMAIL` only until REST email has passed Cloudflare smoke tests.
- [ ] Add Worker secrets/vars for REST email: `CF_ACCOUNT_ID`, `CF_API_TOKEN`, and `EMAIL_FROM`.
- [ ] Build with `ADAPTER=cloudflare`.
- [ ] Run Cloudflare smoke test with D1, R2, Email REST, cache purge, and cleanup.
- [ ] Only after this passes, decide whether to remove custom worker cache logic, externalize cron, or switch to generated `_worker.js`.

Exit gate:

- [ ] Cloudflare preview/deploy path works with no route-level platform access.
- [ ] Any change to `worker.ts` is covered by a before/after Cloudflare smoke test.

### Phase 4 - Deployment Docs

Goal: one boring production path.

- [ ] Add VPS runbook: directories, env, Bun install, build/start, service user.
- [ ] Add `Caddyfile` or Nginx config.
- [ ] Add `systemd` service and timer examples.
- [ ] Add backup/restore runbook for SQLite and uploaded media.
- [ ] Add Cloudflare deploy appendix for the secondary adapter.

---

## Files Expected To Change Later

Planning only; do not treat this as an implementation checklist until Phase 0 is accepted.

| File | Expected change |
|---|---|
| `src/lib/server/services/types.ts` | New service interfaces |
| `src/lib/server/services/index.ts` | New `createServices(event)` boundary |
| `src/lib/server/adapter/node/*` | New self-host implementations |
| `src/lib/server/adapter/cloudflare/*` | New wrappers around current Cloudflare bindings |
| `src/hooks.server.ts` | Inject `locals.services`; construct auth from service DB |
| `src/app.d.ts` | Type `locals.services`; remove hard app dependency on Cloudflare platform in route code |
| `src/lib/server/db/index.ts` | Move from `getDb(d1)` as public route API to service-owned DB creation |
| `src/lib/server/auth.ts` | Keep factory initially; accept adapter DB |
| `src/lib/server/upload.ts` | Move R2-specific code into Cloudflare storage adapter |
| `src/lib/server/cache.ts` | Turn platform cache helper into `CacheClient` wrapper |
| Routes and server loads | Use `locals.services`, not `platform.env` |
| `svelte.config.js` / `vite.config.ts` | Select adapter path when implementation starts |
| `package.json` | Split node/cloudflare scripts when implementation starts |
| `wrangler.jsonc` | Preserve existing bindings initially; only adjust after Cloudflare validation |
| `worker.ts` | Preserve initially; shrink or replace only after wrapper parity |

---

## Risks To Keep Visible

| Risk | Plan |
|---|---|
| Cloudflare bindings initialized globally break D1/auth | Use request-scoped Cloudflare services from `event.platform.env`; keep auth factory |
| Self-host env validation blocks unrelated commands | Split env validation by concern; no one global parse that requires every integration |
| Bun-only DB makes Node execution invalid | State Bun is the self-host runtime; add a separate `better-sqlite3` adapter only if Node runtime becomes required |
| Storage URL mismatch breaks existing blog content | Keep `/cdn/blog/{key}` as canonical URL during migration |
| R2 binding behavior regresses | Preserve R2 binding adapter first; do not switch Workers to public R2 S3 API in Phase 1 |
| Email REST credentials or Cloudflare Email product setup are missing | Adapter returns a clear configuration error outside dev; local dev may use explicit no-op/logging behavior |
| Existing SEND_EMAIL binding masks REST regressions | Keep binding only as rollback during migration; Cloudflare smoke tests must exercise REST before binding removal |
| Proxy/client IP is wrong on VPS | Configure trusted proxy headers explicitly in deploy docs |
| Cloudflare cache/worker behavior is accidentally removed | Keep `worker.ts` and Cloudflare cache wrapper until Cloudflare smoke tests pass |
| Two adapters drift | Add `check:node`, `check:cf`, node e2e, and Cloudflare smoke validation |

---

## Immediate Recommendation

Do not start with dependency installs or adapter-node config. Start by accepting the service boundary and the phase gates above.

Once accepted, Phase 1 should be implemented as the smallest safe code change: add `AppServices`, wrap current Cloudflare behavior, add minimal Node stubs, and refactor routes off `event.platform.env` without changing deployment behavior.
