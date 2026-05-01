# Self-Host-First Architecture

Bun + SQLite + S3 (RustFS / R2) on a VPS as the primary deploy target. Cloudflare Workers stays as a plug-and-play adapter — any integration (DB, storage, email, cache) can be swapped independently. No `event.platform!.env.X` in route code; routes import typed singletons that lazy-resolve to the active adapter at first use.

---

## Decisions (locked)

| Concern | Default (self-host) | Cloudflare adapter |
|---|---|---|
| Runtime | Bun | Workers |
| DB | `bun:sqlite` + `drizzle-orm@1.0.0-rc.1/bun-sqlite` | `D1Database` + `drizzle-orm@1.0.0-rc.1/d1` |
| Storage | S3 client (`aws4fetch`) → RustFS or R2 over S3 API | Same S3 client → R2 over S3 API |
| Email | Cloudflare Email Service **REST** | `SEND_EMAIL` binding |
| Cache | None — `Cache-Control` headers via Caddy/Nginx | None — `Cache-Control` headers via Cloudflare |
| Static assets | `adapter-node` built-in | `adapter-cloudflare`'s auto-emitted entry |
| Client IP | `event.getClientAddress()` (adapter-node defaults) | `event.getClientAddress()` (adapter-cloudflare defaults) |
| Cron | `/api/admin/cleanup` + systemd timer (or external scheduler) | Same endpoint, hit by external scheduler |

Notes:
- **Storage:** one S3 client for both targets. R2 binding is dropped from `wrangler.jsonc`. RustFS is the recommended self-host backend (Apache 2.0, drop-in MinIO replacement). Tradeoff on CF: going through R2's public S3 endpoint costs SigV4 signing per request and counts as Workers→Internet egress. For a small/medium SaaS this is negligible; document it so a reader can revert to the binding-as-second-impl if they care.
- **S3 client choice:** `aws4fetch` over `@aws-sdk/client-s3`. ~6 KB vs ~500 KB; bundle size matters for Workers and we don't use SDK-only features (multipart, native streams). Signed URLs are implementable with aws4fetch in ~20 lines if we ever need them.
- **Email:** Cloudflare Send-Emails REST API (`POST https://api.cloudflare.com/client/v4/accounts/{account_id}/email/sending/send`, Bearer token, 5 MiB cap, Content-Type: application/json). Same provider end-to-end. **Prerequisite:** the `from` domain must be verified in Cloudflare Email Sending (separate product from Email Routing inbound) with the required DNS records. New accounts won't have this set up.
- **Cron:** the existing `/api/admin/cleanup` route + `CRON_SECRET` is the single code path. Both adapters hit it externally (systemd timer, GitHub Actions, cron-job.org). We do not add a `scheduled()` handler and we drop `triggers.crons` from `wrangler.jsonc` — fewer moving parts, identical behavior.
- **Cache:** the worktop cache logic in `worker.ts` is removed. Reverse proxy / Cloudflare cache rules handle HTTP caching via `Cache-Control` and `CDN-Cache-Control` headers everywhere — same headers work for Caddy, Nginx, and Cloudflare.
- **Custom CF entrypoint:** we delete `worker.ts`. `adapter-cloudflare@^7` emits its own entry that handles the manifest + asset routing + `cf-connecting-ip`. We lose nothing we still want.
- **`BETTER_AUTH_URL`:** dropped from env. `auth.ts` already uses `ORIGIN` for `baseURL`; the CF var was unread.

---

## Module layout

```
src/lib/server/
├── adapter/
│   ├── node/
│   │   ├── db.ts        # bun:sqlite + drizzle (lazy Proxy)
│   │   ├── storage.ts   # aws4fetch S3 (RustFS / MinIO / S3)
│   │   ├── email.ts     # CF Send-Emails REST
│   │   └── cache.ts     # noop
│   └── cf/
│       ├── db.ts        # D1 + drizzle (lazy Proxy)
│       ├── storage.ts   # aws4fetch S3 against R2's public S3 endpoint
│       ├── email.ts     # SEND_EMAIL binding wrapper
│       └── cache.ts     # noop (Cache-Control handled by CF cache rules)
├── db/
│   ├── index.ts         # `export { db } from '$adapter/db'`
│   ├── schema.ts        # unchanged
│   └── auth.schema.ts   # unchanged (better-auth CLI output)
├── storage/index.ts     # `export { storage } from '$adapter/storage'`
├── email/index.ts       # `export { email } from '$adapter/email'`
├── cache/index.ts       # `export { cache } from '$adapter/cache'`
└── env.ts               # zod-validated env (Node path)
```

`$adapter` is a vite alias resolved from `process.env.ADAPTER` at build time. Single source of truth: each integration has one consumer-facing module that re-exports from the active adapter.

### Vite + Svelte config

```ts
// vite.config.ts
const ADAPTER = process.env.ADAPTER ?? 'node'

export default defineConfig({
  resolve: {
    alias: {
      $adapter: fileURLToPath(new URL(`./src/lib/server/adapter/${ADAPTER}`, import.meta.url)),
    },
  },
  // ...existing plugins
})
```

```js
// svelte.config.js
const ADAPTER = process.env.ADAPTER ?? 'node'
const { default: adapter } = ADAPTER === 'cloudflare'
  ? await import('@sveltejs/adapter-cloudflare')
  : await import('@sveltejs/adapter-node')

export default {
  kit: {
    adapter: adapter(),
    alias: { $adapter: `src/lib/server/adapter/${ADAPTER}` },
    // ...existing
  },
}
```

### `package.json` scripts (delta)

```json
{
  "dev": "ADAPTER=node vite dev",
  "build:node": "ADAPTER=node vite build",
  "build:cf": "ADAPTER=cloudflare wrangler types --check && ADAPTER=cloudflare vite build",
  "start": "bun ./build/index.js",
  "preview:cf": "ADAPTER=cloudflare wrangler dev --config wrangler.jsonc --port 4173",
  "auth:schema": "DATABASE_URL=:memory: ADAPTER=node better-auth generate --config src/lib/server/auth.ts --output src/lib/server/db/auth.schema.ts --yes"
}
```

The `build` script gets split into `build:node` and `build:cf`. Inner-loop dev is always Bun + Node adapter — `wrangler dev` only runs for CF-deploy validation.

---

## The lazy Proxy pattern

Each adapter exports a Proxy-wrapped singleton. Module *load* is side-effect-free; the first method call binds resources. This is the only pattern that survives prerender (no env at module init), CF Workers (bindings only resolve at request time on some build phases), and CLI tools (`better-auth generate` doesn't invoke DB methods).

```ts
// adapter/node/db.ts
import { Database } from 'bun:sqlite'
import { drizzle, type BunSQLiteDatabase } from 'drizzle-orm/bun-sqlite'
import * as schema from '../../db/schema'

type DB = BunSQLiteDatabase<typeof schema>

let cached: DB | undefined

function resolve(): DB {
  if (cached) return cached
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL required at runtime')
  const sqlite = new Database(url)
  sqlite.exec('PRAGMA journal_mode = WAL')
  sqlite.exec('PRAGMA foreign_keys = ON')
  cached = drizzle(sqlite, { schema })
  return cached
}

export const db: DB = new Proxy({} as DB, {
  get: (_, prop, recv) => Reflect.get(resolve(), prop, recv),
})
```

```ts
// adapter/cf/db.ts
import { env } from 'cloudflare:workers'
import { drizzle, type DrizzleD1Database } from 'drizzle-orm/d1'
import * as schema from '../../db/schema'

type DB = DrizzleD1Database<typeof schema>

let cached: DB | undefined

function resolve(): DB {
  if (cached) return cached
  const binding = (env as { DB: D1Database }).DB
  if (!binding) throw new Error('D1 binding "DB" not present in worker env')
  cached = drizzle(binding, { schema })
  return cached
}

export const db: DB = new Proxy({} as DB, {
  get: (_, prop, recv) => Reflect.get(resolve(), prop, recv),
})
```

Same pattern for `storage`, `email`, `cache`. The consumer-facing union widens at the re-export site:

```ts
// db/index.ts
import type { BunSQLiteDatabase } from 'drizzle-orm/bun-sqlite'
import type { DrizzleD1Database } from 'drizzle-orm/d1'
import type * as schema from './schema'

export type DrizzleDB =
  | BunSQLiteDatabase<typeof schema>
  | DrizzleD1Database<typeof schema>

export { db } from '$adapter/db'
```

---

## `env.ts` (Node path, zod 4 idioms)

```ts
import { z } from 'zod'

export const envSchema = z.object({
  ORIGIN: z.url(),
  BETTER_AUTH_SECRET: z.string().min(32),
  CRON_SECRET: z.string().min(16),

  DATABASE_URL: z.string().default(':memory:'),

  S3_ENDPOINT: z.url(),
  S3_REGION: z.string().default('auto'),
  S3_ACCESS_KEY_ID: z.string(),
  S3_SECRET_ACCESS_KEY: z.string(),
  S3_BUCKET: z.string(),
  S3_PUBLIC_URL: z.url(),
  S3_FORCE_PATH_STYLE: z.coerce.boolean().default(false),

  CF_ACCOUNT_ID: z.string(),
  CF_API_TOKEN: z.string(),
  EMAIL_FROM: z.email(),
  CONTACT_NOTIFICATION_EMAIL: z.email().optional(),

  PUBLIC_CF_WEB_ANALYTICS_TOKEN: z.string().optional(),
  PUBLIC_FIREBASE_CONFIG: z.string().optional(),
})

export type Env = z.infer<typeof envSchema>
export const env: Env = envSchema.parse(process.env)
```

`DATABASE_URL` defaults to `:memory:` so build / `auth:schema` / type-check passes without configuration. Production sets a real path. CF env (D1, SEND_EMAIL bindings) lives in `cloudflare:workers` `env` — not in this schema.

`S3_FORCE_PATH_STYLE` covers RustFS / MinIO (path-style: `https://endpoint/bucket/key`) vs R2 (vhost-style: `https://bucket.endpoint/key`).

---

## Interfaces

```ts
// storage/types.ts
export interface PutOptions {
  contentType?: string
  cacheControl?: string
  metadata?: Record<string, string>
}

export interface PutResult {
  key: string
  url: string         // public URL via S3_PUBLIC_URL
  size: number
  contentType: string
}

export interface StorageClient {
  put(key: string, body: ReadableStream | Uint8Array | Blob, opts?: PutOptions): Promise<PutResult>
  get(key: string): Promise<ReadableStream | null>
  delete(key: string): Promise<void>
  signedUrl?(key: string, ttlSeconds: number): Promise<string>
}
```

```ts
// email/types.ts
export interface EmailMessage {
  to: string | string[]
  from: string
  subject: string
  html?: string
  text?: string
  replyTo?: string
  cc?: string[]
  bcc?: string[]
}

export type EmailResult =
  | { ok: true; delivered: string[]; queued: string[] }
  | { ok: false; reason: string; bounced?: string[] }

export interface EmailClient {
  send(msg: EmailMessage): Promise<EmailResult>
}
```

```ts
// cache/types.ts — kept minimal; both adapters export `noopCache`
export interface CacheClient {
  match(req: Request): Promise<Response | null>
  put(req: Request, res: Response): Promise<void>
}

export const noopCache: CacheClient = {
  match: async () => null,        // intentional: cache lives in HTTP headers
  put: async () => {},
}
```

No `RuntimeAdapter` interface. `event.getClientAddress()` is provided by both adapters; `waitUntil` is unused (the only consumer was the worktop cache, which is gone).

---

## Phases

### Phase 1 — Adapter scaffolding + DB

- [ ] Bump `drizzle-orm` to `1.0.0-rc.1` and `drizzle-kit` to `1.0.0-rc.1`. Re-run `bun run db:generate` and verify migrations parse.
- [ ] Add `$adapter` vite alias + svelte alias (so SvelteKit's TS path generation picks it up)
- [ ] Create `src/lib/server/adapter/node/{db,storage,email,cache}.ts` (storage/email/cache as stubs first)
- [ ] Create `src/lib/server/adapter/cf/{db,storage,email,cache}.ts` mirroring the structure
- [ ] Implement Node + CF db adapters with the lazy-Proxy pattern shown above
- [ ] `src/lib/server/db/index.ts` becomes `export { db } from '$adapter/db'` plus the `DrizzleDB` type union
- [ ] Refactor `src/lib/server/auth.ts`:
  - [ ] `auth` is a singleton wired from `db`. Delete the `createAuth(null!)` workaround — better-auth CLI works because Proxy `db` doesn't throw at construction.
  - [ ] Drop the `createAuth(d1)` factory.
- [ ] Update `hooks.server.ts`:
  - [ ] Drop the `event.platform.env.DB` try/catch and `if (!db) return` short-circuit.
  - [ ] Keep `if (building)` only if any prerendered route imports `auth` transitively (it does — paraglide hook chains into auth). Actually unnecessary now: Proxy `db` is never invoked during prerender unless a prerendered route does DB work, which none do.
  - [ ] Construct session: `event.locals.auth = auth` directly.
- [ ] Update `src/lib/server/audit.ts`: change `writeAuditLog(d1: D1Database, …)` → `writeAuditLog(entry: …)`. The body already uses Drizzle (`db.insert(auditLog).values(...)`); the only delta is dropping the parameter and importing `db` from `$lib/server/db`.
- [ ] Replace ~32 route call sites: `getDb(platform!.env.DB)` → `import { db } from '$lib/server/db'`. Mechanical.
- [ ] Update `drizzle.config.local.ts` — point `dbCredentials.url` at `$DATABASE_URL`.
- [ ] Verify `bun run auth:schema` regenerates `auth.schema.ts` cleanly.

### Phase 2 — Storage (S3 everywhere)

- [ ] Add `aws4fetch` dependency
- [ ] Implement `adapter/{node,cf}/storage.ts` against the `StorageClient` interface (lazy Proxy). Both read S3 config from their respective env source (`process.env` vs `cloudflare:workers env`).
- [ ] Refactor `src/lib/server/upload.ts`: drop `bucket: R2Bucket` param, drop `uploadToR2` name → `uploadToStorage(file)`. Body uses the `storage` singleton.
- [ ] Update `src/routes/api/admin/upload/+server.ts` and `src/routes/cdn/blog/[...key]/+server.ts` — drop `platform?.env?.R2_BLOG_MEDIA`, use the singleton.
- [ ] Drop `r2_buckets` from `wrangler.jsonc`. Set S3 vars as Worker secrets (`wrangler secret put S3_…`).
- [ ] Document RustFS docker-compose for local self-host dev (path-style addressing → `S3_FORCE_PATH_STYLE=true`).

### Phase 3 — Email

- [ ] Implement `adapter/node/email.ts` — POSTs to `https://api.cloudflare.com/client/v4/accounts/${env.CF_ACCOUNT_ID}/email/sending/send` with `Authorization: Bearer ${env.CF_API_TOKEN}` and `Content-Type: application/json`. Maps `{ delivered, permanent_bounces, queued }` → `EmailResult`.
- [ ] Implement `adapter/cf/email.ts` — wraps `env.SEND_EMAIL` from `cloudflare:workers`. Returns `{ ok: true, delivered: [...recipients], queued: [] }` on success.
- [ ] Refactor `src/routes/(public)/contact/+page.server.ts` and the better-auth `sendResetPassword` / `sendVerificationEmail` callbacks in `auth.ts` to use the `email` singleton.
- [ ] Document the Cloudflare Email Sending domain-verification prerequisite (DNS records, sender verification — distinct from Email Routing inbound).

### Phase 4 — Server entrypoint

- [ ] Install `@sveltejs/adapter-node`
- [ ] Update `svelte.config.js` to pick adapter from `ADAPTER` env (snippet above)
- [ ] **Delete `worker.ts`.** adapter-cloudflare@^7 emits its own entry; the worktop cache and manifest scanning in the current file go away with it.
- [ ] Update `wrangler.jsonc`:
  - [ ] Drop `main: "worker.ts"` (let adapter-cloudflare configure it)
  - [ ] Drop `r2_buckets` (storage now via S3)
  - [ ] Drop `triggers.crons` (cron is external HTTP)
  - [ ] Keep `d1_databases` (CF adapter still uses D1)
  - [ ] Keep or drop `send_email` depending on whether the CF adapter uses the binding (Phase 3 default: keep it; Workers path uses the binding for zero-overhead)
  - [ ] Drop `BETTER_AUTH_URL` from `vars`
- [ ] Update `bun run check` — `wrangler types --check` only runs for CF builds, not the inner loop. Move into `build:cf` and `check:cf`.
- [ ] Update `package.json` scripts per the snippet above.

### Phase 5 — Cron + cleanup

- [ ] Document systemd unit + timer for self-host (or recommend GitHub Actions / cron-job.org for VPS-less testing). The unit just `curl -H "X-Cron-Secret: $CRON_SECRET" $ORIGIN/api/admin/cleanup`.
- [ ] Update CSP in `handleSecurityHeaders` (`hooks.server.ts`) — make `script-src` whitelisting of `static.cloudflareinsights.com` conditional on `PUBLIC_CF_WEB_ANALYTICS_TOKEN` being non-empty. Drop the entry on self-host so CSP isn't artificially permissive.

### Phase 6 — Tests + deploy docs

- [ ] Run e2e suite against `bun run build:node && bun run start` (real Bun runtime, real SQLite file, real S3 against a local RustFS container).
- [ ] CI matrix: `ADAPTER=node` (default Playwright run) + `ADAPTER=cloudflare` (smoke against `wrangler dev`).
- [ ] Document VPS setup: `Caddyfile` (HTTPS + reverse proxy + static asset cache + gzip/brotli), `vibekit.service` systemd unit, `vibekit-cron.timer`.
- [ ] Document a `docker-compose.yml` with RustFS + the Bun app (single-machine dev / self-host quickstart).
- [ ] Update `README.md` with both deploy paths (no Cloudflare account required for self-host minus email; document SMTP fallback as optional future work if a reader doesn't want a CF account at all).

---

## File-by-file changes

| File | Action | Notes |
|---|---|---|
| `src/lib/server/env.ts` | **New** | zod 4 schema, parsed at module init for the Node path |
| `src/lib/server/adapter/node/{db,storage,email,cache}.ts` | **New** | lazy-Proxy singletons, read from `process.env` |
| `src/lib/server/adapter/cf/{db,storage,email,cache}.ts` | **New** | lazy-Proxy singletons, read from `cloudflare:workers` `env` |
| `src/lib/server/db/index.ts` | **Edit** | `export { db } from '$adapter/db'` + `DrizzleDB` union |
| `src/lib/server/db/schema.ts` | **Keep** | no changes |
| `src/lib/server/storage/index.ts` | **New** | re-export + `StorageClient` types |
| `src/lib/server/email/index.ts` | **New** | re-export + `EmailClient` / `EmailResult` types |
| `src/lib/server/cache/index.ts` | **New** | re-export + `CacheClient` interface, `noopCache` |
| `src/lib/server/auth.ts` | **Edit** | drop `createAuth` factory; `auth` is a singleton wired to the `db` Proxy. Delete `createAuth(null!)`. Wire reset/verify email callbacks to the `email` singleton. |
| `src/lib/server/upload.ts` | **Edit** | `uploadToR2(bucket, file)` → `uploadToStorage(file)` |
| `src/lib/server/audit.ts` | **Edit** | drop `d1: D1Database` param; uses `db` singleton (one-line change — already on Drizzle) |
| `src/hooks.server.ts` | **Edit** | drop the env-access try/catch and the `if (!db) return`; conditionalize the CSP `cloudflareinsights.com` entry |
| All `+server.ts` / `+page.server.ts` (~32 routes) | **Edit** | replace `platform!.env.DB` / `platform?.env?.R2_BLOG_MEDIA` / `platform?.env?.SEND_EMAIL` with module imports |
| `worker.ts` | **Delete** | adapter-cloudflare emits its own entry |
| `svelte.config.js` | **Edit** | adapter selected from `ADAPTER` env; declare `$adapter` alias for SvelteKit's TS path generation |
| `vite.config.ts` | **Edit** | `$adapter` alias resolution |
| `wrangler.jsonc` | **Edit** | drop `main`, `r2_buckets`, `triggers.crons`, `BETTER_AUTH_URL` var; keep `d1_databases`, `send_email` (if CF email uses the binding) |
| `drizzle.config.ts` / `drizzle.config.local.ts` | **Edit** | local config points at `$DATABASE_URL`; remote config unchanged |
| `package.json` | **Edit** | add `aws4fetch`, `@sveltejs/adapter-node`, `zod` (already present); bump `drizzle-orm` and `drizzle-kit` to `1.0.0-rc.1`; split `build` → `build:node` / `build:cf`; add `start`, `preview:cf`; update `auth:schema` to set `DATABASE_URL=:memory:` |
| `Caddyfile` | **New** | reverse-proxy + HTTPS + static cache config |
| `vibekit.service`, `vibekit-cron.timer` | **New** | systemd unit examples |
| `docker-compose.yml` | **New** | RustFS + Bun app for local self-host dev |

---

## TypeScript guarantees

- No `any`, no `as unknown as`, no non-null assertions in module boundaries.
- `env.ts` is fully typed; access is `env.ORIGIN`, `env.S3_BUCKET`, etc. — no `process.env.X!`.
- `DrizzleDB` is a union of `BunSQLiteDatabase<typeof schema> | DrizzleD1Database<typeof schema>`. The Proxy's target type is the concrete adapter type; at the consumer site, the union widens. Drizzle's query builder API is identical across both, so call sites need no narrowing.
- Route code never sees `D1Database`, `R2Bucket`, or `cloudflare:workers` — those are confined to `adapter/cf/*`.
- `event.platform` is unreferenced in app code. SvelteKit's per-request types stay clean.
- The Proxy pattern preserves types: the exported `db: DrizzleDB` reads as a Drizzle instance; method calls dispatch through `Reflect.get`. No type assertions needed at call sites.
- `EmailResult` is a discriminated union; consumers narrow via `if (result.ok)`.

---

## Risks & mitigations

| Risk | Mitigation |
|---|---|
| `drizzle-orm@1.0.0-rc.1` is pre-stable | Pin exact version; pin `drizzle-kit@1.0.0-rc.1` to match. Validate with the existing test suite before merging. Fallback: drop to `0.45.2` if RC ships a regression. |
| `bun:sqlite` Drizzle support quality | Drizzle's `bun-sqlite` driver is stable in RC. Verify schema gen and full e2e. Fallback: `better-sqlite3` (Node native module, well-tested but slower under Bun). |
| Lazy Proxy + Drizzle transactions | `db.transaction(fn)` is property access → goes through Proxy.get → returns the bound method. Tested pattern; confirm with one transaction test. |
| Auth cookies parity between Workers and Node | better-auth is runtime-agnostic. Same `BETTER_AUTH_SECRET` and same `ORIGIN` across deploys. Test login + session refresh + reset-password on both adapters. |
| R2-via-S3 from inside CF Workers | Outbound through the public R2 S3 endpoint costs SigV4 signing per request and Workers→Internet egress. Negligible at small scale. If it matters, add a third adapter: `adapter/cf/storage-binding.ts` using R2Bucket directly, swappable per-deploy via build flag. |
| RustFS / MinIO addressing style | RustFS path-style (likely default), R2 vhost-style. `S3_FORCE_PATH_STYLE` env covers both. Test multipart upload paths if files >5 MB. |
| CF Email Sending domain verification | One-time prereq: verify the `from` domain in CF dashboard with DNS records. Separate product from Email Routing. Document in the deploy guide; prod won't work until DNS is set. |
| CF Email Sending API rate limits | 429 with code 10004. Add exponential backoff in the REST client. Binding has its own quota; both share the account-level limit. |
| File upload streaming under Bun vs Workers | `File.stream()` is web-standard; both adapters consume `ReadableStream`. aws4fetch handles streaming uploads. Verify with the existing 5 MB upload limit. |
| Prerender + asset paths | adapter-node serves prerendered HTML from `build/client`; adapter-cloudflare emits its own asset routing. Both work without manual manifest scanning. Validate `/`, `/features`, `/pricing`, `/about`, `/privacy`, `/terms` under both. |
| CSP whitelists `cloudflareinsights.com` unconditionally today | Make conditional on `PUBLIC_CF_WEB_ANALYTICS_TOKEN`. Drops the artificial whitelist on self-host. |
| `wrangler types` becomes optional | `bun run gen` only runs in `build:cf` / `check:cf`. Inner loop doesn't touch wrangler. Document this so contributors don't get tripped up by missing types. |
| `cloudflare:workers` import in dev | adapter-cloudflare's vite plugin handles it during `wrangler dev`. The Node adapter never imports `cloudflare:workers` (vite alias resolves to `adapter/node/*` which doesn't reference it). No leakage. |
