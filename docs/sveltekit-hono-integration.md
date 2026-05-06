# SvelteKit Integration with Hono

This document describes how to integrate Hono as the API layer inside the existing Vibekit SvelteKit project. SvelteKit continues to own all page rendering, the deployment adapters, the i18n hook, and the Better Auth hook for non-API requests. Hono owns every route under `/api/*`.

The integration runs in-process: `handle` short-circuits API requests to `app.fetch(...)`, so there is no secondary server, no extra HTTP hop, and no change to the deployment story (`adapter-node` on VPS/Bun, `adapter-cloudflare` on Workers).

---

## Why Hono

The current API surface under `src/routes/api/` (admin, blog, health, items, seed-test-user) repeats the same four patterns in every `+server.ts`:

1. `if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 })`
2. Role checks for admin endpoints
3. `schema.safeParse(body)` plus a manual 422 response
4. Per-route `try/catch` returning `json({ error }, { status })`

Hono replaces all four with middleware applied once per route group. It also provides:

- A stable typesafe RPC client (`hc<AppType>()`) — no codegen, no schema drift.
- Centralized validation via `@hono/zod-validator` using the Zod the project already has.
- A global `app.onError()` handler instead of per-route `try/catch`.
- Optional OpenAPI generation via `@hono/zod-openapi` and Swagger UI via `@hono/swagger-ui`.
- ~20 built-in middlewares (Logger, ETag, Cache, Compress, Secure Headers, Body Limit, JWT, Bearer Auth, etc.).
- GA on Cloudflare Workers since April 2025; ~14KB bundle (`hono/tiny`).

---

## Architecture

```
Request
  │
  ▼
handleParaglide        ← i18n
  │
handleSecurityHeaders  ← already skips /api/*
  │
handleHono ────────────┐ if /api/* → app.fetch(...)  ← Hono owns it
  │                    │
  ▼                    ▼
handleBetterAuth     Hono middleware chain
  │                    ├─ secureHeaders
handleRouteGuards      ├─ withServices  (createServices({ platform: { env: c.env } }))
  │                    ├─ withSession
  ▼                    ├─ /api/auth/* → Better Auth handler
SvelteKit page         ├─ requireUser / requireAdmin (per group)
                       └─ Route handler with c.req.valid(...)
```

Single process. SvelteKit's adapter sees one app. Hono runs inside the same Worker/Node runtime.

---

## Prerequisites

The integration assumes the project already has:

- `createServices(event)` in `src/lib/server/services/index.ts` — resolves `db`, `storage`, `email`, `cache` for both adapters. It accepts `{ platform?: { env?: { DB?: unknown } } }`, which is exactly what Hono's `c` can provide.
- `createAuth(d1)` factory in `src/lib/server/auth.ts` — Better Auth instance scoped to a per-request DB.
- The hook chain in `src/hooks.server.ts`: `sequence(handleParaglide, handleSecurityHeaders, handleBetterAuth, handleRouteGuards)`.
- `handleSecurityHeaders` already skips `/api/*`, and `handleRouteGuards` only touches page paths — so adding Hono requires no changes to either.

---

## Step 1 — Install

```bash
bun add hono @hono/zod-validator
# Optional add-ons
bun add @hono/zod-openapi @hono/swagger-ui
```

`@cloudflare/workers-types` is already a dev dependency.

---

## Step 2 — Types

```ts
// src/lib/server/hono/types.ts
import type { createAuth } from '$lib/server/auth'
import type { AppServices } from '$lib/server/services/types'
import type { D1Database, R2Bucket } from '@cloudflare/workers-types'

// Mirror the bindings declared in wrangler.jsonc
export type Bindings = {
  DB?: D1Database
  R2_BLOG_MEDIA?: R2Bucket
}

export type Variables = {
  services: AppServices
  auth: ReturnType<typeof createAuth>
  user: ReturnType<typeof createAuth>['$Infer']['Session']['user'] | null
  session: ReturnType<typeof createAuth>['$Infer']['Session']['session'] | null
}

export type Env = { Bindings: Bindings; Variables: Variables }

// Variant for protected sub-apps where requireUser has already run
export type ProtectedVariables = Omit<Variables, 'user' | 'session'> & {
  user: NonNullable<Variables['user']>
  session: NonNullable<Variables['session']>
}

export type ProtectedEnv = { Bindings: Bindings; Variables: ProtectedVariables }
```

`Bindings` are typed as optional because `event.platform?.env` is `{}` on `adapter-node`. This forces handlers (or the middleware that wraps them) to acknowledge both runtimes.

---

## Step 3 — Middleware

```ts
// src/lib/server/hono/middleware.ts
import { createMiddleware } from 'hono/factory'
import { createAuth } from '$lib/server/auth'
import { createServices } from '$lib/server/services'
import { rateLimit } from '$lib/server/rate-limit'
import type { Env, ProtectedEnv } from './types'

// Resolves DB / storage / email / cache for both runtimes via the existing factory.
// Cloudflare: c.env.DB is the D1 binding.
// adapter-node: c.env is {} and createServices falls through to createNodeServices().
export const withServices = createMiddleware<Env>(async (c, next) => {
  const services = await createServices({ platform: { env: c.env } })
  if (!services) return c.json({ error: 'Service unavailable' }, 503)
  c.set('services', services)
  c.set('auth', createAuth(services.db))
  await next()
})

export const withSession = createMiddleware<Env>(async (c, next) => {
  const session = await c.get('auth').api.getSession({ headers: c.req.raw.headers })
  c.set('user', session?.user ?? null)
  c.set('session', session?.session ?? null)
  await next()
})

export const requireUser = createMiddleware<Env>(async (c, next) => {
  if (!c.get('user')) return c.json({ error: 'Unauthorized' }, 401)
  await next()
})

export const requireAdmin = createMiddleware<Env>(async (c, next) => {
  const user = c.get('user')
  if (!user) return c.json({ error: 'Unauthorized' }, 401)
  if (user.role !== 'admin') return c.json({ error: 'Forbidden' }, 403)
  await next()
})

// Factory for per-route rate limiting. Replaces the two-line pattern currently
// duplicated in upload + blog routes.
export const withRateLimit = (prefix: string, limit = 20, windowMs = 60_000) =>
  createMiddleware<ProtectedEnv>(async (c, next) => {
    const { allowed } = rateLimit(`${prefix}:${c.get('user').id}`, limit, windowMs)
    if (!allowed) return c.json({ error: 'Too many requests' }, 429)
    await next()
  })
```

Each middleware is written once. Routes never repeat session lookups, role checks, or rate-limit boilerplate.

---

## Step 4 — App definition

```ts
// src/lib/server/hono/index.ts
import { Hono } from 'hono'
import { secureHeaders } from 'hono/secure-headers'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import {
  withServices,
  withSession,
  requireUser,
  requireAdmin,
  withRateLimit,
} from './middleware'
import type { Bindings, Variables, ProtectedEnv } from './types'

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>()
  // secureHeaders fills the gap left by handleSecurityHeaders skipping /api/*
  .use('*', secureHeaders(), withServices, withSession)
  // Better Auth — same path the existing auth client already calls
  .on(['POST', 'GET'], '/api/auth/*', (c) => c.get('auth').handler(c.req.raw))
  // Global error handler replaces every per-route try/catch
  .onError((err, c) => {
    console.error(err)
    return c.json({ error: 'Internal Server Error' }, 500)
  })

// Public routes — services available, user may be null
const publicRoutes = app
  .get('/api/health', (c) => c.json({ ok: true }))

// Protected sub-app — narrower Variables type so c.get('user') is non-null
const protectedApp = new Hono<ProtectedEnv>()
  .use('*', requireUser)
  .get('/items', async (c) => {
    const { db } = c.get('services')
    const user = c.get('user') // typed as User, not User | null
    const items = await db.query.items.findMany({
      where: (t, { eq }) => eq(t.userId, user.id),
    })
    return c.json({ items })
  })
  .post(
    '/items',
    withRateLimit('items.create', 30, 60_000),
    zValidator('json', z.object({ name: z.string().min(1) })),
    async (c) => {
      const body = c.req.valid('json') // typed + validated
      const { db } = c.get('services')
      // ...
      return c.json({ ok: true }, 201)
    },
  )

const adminApp = new Hono<ProtectedEnv>()
  .use('*', requireAdmin)
  .get(
    '/users',
    zValidator('query', z.object({
      page: z.coerce.number().min(1).default(1),
      limit: z.coerce.number().min(1).max(100).default(20),
    })),
    async (c) => {
      const { page, limit } = c.req.valid('query')
      const { db } = c.get('services')
      const offset = (page - 1) * limit
      // ...
      return c.json({ users: [], page, limit })
    },
  )

const routes = app
  .route('/api', protectedApp)
  .route('/api/admin', adminApp)

export type AppType = typeof routes
export { app }
```

### Why route chaining matters

`AppType` inference follows the exact value you export. Chaining `.get(...).post(...)` and exporting `typeof routes` is what allows `hc<AppType>()` on the client to know every endpoint, its inputs, and its responses. Splitting into separate `app.get(...)` statements drops that inference.

### Sub-app type narrowing

After `requireUser` runs, the runtime guarantees `user` is non-null, but TypeScript can't see that on the parent app. Defining `protectedApp` with `ProtectedEnv` reflects the guarantee at the type level — handlers see `c.get('user')` as `User`, not `User | null`. The same pattern applies to `adminApp`.

---

## Step 5 — Wire into hooks.server.ts

```ts
// src/hooks.server.ts
import { sequence } from '@sveltejs/kit/hooks'
import type { Handle } from '@sveltejs/kit'
import { app } from '$lib/server/hono'
// ...existing imports for handleParaglide, handleSecurityHeaders,
// handleBetterAuth, handleRouteGuards

const handleHono: Handle = ({ event, resolve }) => {
  if (event.url.pathname.startsWith('/api/')) {
    return app.fetch(
      event.request,
      event.platform?.env ?? {},
      event.platform?.ctx,
    )
  }
  return resolve(event)
}

export const handle = sequence(
  handleParaglide,
  handleSecurityHeaders, // already skips /api/* — no change needed
  handleHono,            // short-circuits /api/* before SvelteKit's router
  handleBetterAuth,      // runs only for non-API requests
  handleRouteGuards,     // page-only — unchanged
)
```

`handleHono` must come before `handleBetterAuth` so that API requests bypass the SvelteKit auth wiring entirely (Hono runs its own session middleware). Any global hook that must also affect Hono responses must run earlier in the chain than `handleHono`.

---

## Step 6 — Typesafe RPC client

```ts
// src/lib/api.ts
import { hc } from 'hono/client'
import type { AppType } from '$lib/server/hono'

// Precompute the heavy client type once. In larger apps this reduces
// tsserver / editor type-instantiation cost when every component imports `api`.
export type Client = ReturnType<typeof hc<AppType>>
const hcWithType = (...args: Parameters<typeof hc>): Client => hc<AppType>(...args)

export const api = hcWithType(
  typeof location !== 'undefined' ? location.origin : 'http://localhost:5173',
  { init: { credentials: 'include' } }, // forwards the session cookie
)
```

Usage in a Svelte component or TanStack Query call:

```ts
const res = await api.api.items.$get()
const { items } = await res.json() // type inferred from the route's return

const created = await api.api.items.$post({
  json: { name: 'New item' }, // type-checked — z.string().min(1)
})
```

No code generation. Renaming a route or changing its response shape produces a TypeScript error in every caller before it can break at runtime.

---

## Step 7 — Migrating existing routes

The migration from `src/routes/api/**/*+server.ts` to Hono is mechanical. For each existing endpoint:

1. Pick the right group: public (`app`), protected (`protectedApp`), or admin (`adminApp`).
2. Convert `locals.services` → `c.get('services')`.
3. Convert `locals.user` → `c.get('user')` (typed non-null inside protected groups).
4. Replace manual `safeParse` with `zValidator(target, schema)` and read `c.req.valid(target)`.
5. Delete the per-route auth/role check — middleware handles it.
6. Delete the per-route `try/catch` — `app.onError()` handles it.
7. Delete the original `+server.ts` file.

Boilerplate eliminated:

| Pattern in every current `+server.ts` | Replaced by |
|---|---|
| `if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 })` | `requireUser` on the sub-app |
| `if (user.role !== 'admin') ...` | `requireAdmin` on the sub-app |
| `schema.safeParse(body)` + manual 422 | `zValidator('json', schema)` |
| Per-route `try/catch` + error JSON | `app.onError()` |
| `rateLimit(...)` + `if (!allowed) return 429` | `withRateLimit(prefix, limit, windowMs)` |
| Manual `searchParams.get('page')` + clamp | `zValidator('query', paginationSchema)` |

### Shared validators

Move pagination and other reusable schemas next to the rest of the validators so they can be imported from both Hono routes and any remaining SvelteKit form actions:

```ts
// src/lib/validators/common.ts
import { z } from 'zod'

export const paginationSchema = z.object({
  page:  z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
})
export type PaginationQuery = z.infer<typeof paginationSchema>
```

### Resource ownership pattern

GET, PATCH, and DELETE on `:id` routes typically all run the same find-or-404 ownership check. A single middleware does it once for all three handlers:

```ts
// src/lib/server/hono/middleware.ts
import { and, eq } from 'drizzle-orm'
import { item } from '$lib/server/db/schema'
import type { Bindings, ProtectedVariables } from './types'
import type { Item } from '$lib/server/types'

type ProtectedItemEnv = {
  Bindings: Bindings
  Variables: ProtectedVariables & { resource: Item }
}

export const withOwnedItem = createMiddleware<ProtectedItemEnv>(async (c, next) => {
  const { db } = c.get('services')
  const id = c.req.param('id')
  const userId = c.get('user').id
  const resource = await db
    .select()
    .from(item)
    .where(and(eq(item.id, id), eq(item.userId, userId)))
    .get()
  if (!resource) return c.json({ error: 'Not found' }, 404)
  c.set('resource', resource)
  await next()
})
```

Applied to every `:id` handler:

```ts
protectedApp
  .get('/items/:id', withOwnedItem, (c) => c.json({ item: c.get('resource') }))
  .patch('/items/:id', withOwnedItem, zValidator('json', updateItemSchema), async (c) => {
    /* ... */
  })
  .delete('/items/:id', withOwnedItem, async (c) => { /* ... */ })
```

---

## Optional — OpenAPI + Swagger UI

`@hono/zod-openapi` reuses Zod schemas to emit a spec. `@hono/swagger-ui` mounts the docs as a Hono route.

```ts
import { OpenAPIHono, createRoute } from '@hono/zod-openapi'
import { swaggerUI } from '@hono/swagger-ui'

const app = new OpenAPIHono<{ Bindings: Bindings; Variables: Variables }>()

const getItemRoute = createRoute({
  method: 'get',
  path: '/api/items/{id}',
  request: { params: z.object({ id: z.string() }) },
  responses: {
    200: {
      content: { 'application/json': { schema: z.object({ name: z.string() }) } },
      description: 'Item found',
    },
  },
})

app.openapi(getItemRoute, (c) => {
  const { id } = c.req.valid('param')
  return c.json({ name: 'Example' })
})

app.doc('/api/openapi.json', {
  openapi: '3.0.0',
  info: { title: 'Vibekit API', version: '1.0.0' },
})

app.get('/api/docs', swaggerUI({ url: '/api/openapi.json' }))
```

All existing `app.use(...)` middleware and `app.onError(...)` continue to work on `OpenAPIHono`.

---

## Alternative integration: catch-all route

If modifying `hooks.server.ts` is undesirable, the same delegation can happen via a catch-all SvelteKit endpoint:

```ts
// src/routes/api/[...rest]/+server.ts
import { app } from '$lib/server/hono'
import type { RequestHandler } from './$types'

export const fallback: RequestHandler = ({ request, platform }) =>
  app.fetch(request, platform?.env ?? {}, platform?.ctx)
```

The hook approach is preferred because Hono handles `/api/*` before SvelteKit's router runs, and it keeps the entire API entry point in one place.

---

## Gotchas

1. **Two routing systems.** SvelteKit owns pages and `load()` functions; Hono owns `/api/*`. The split is enforced by discipline. Existing `src/routes/api/**` files are deleted during migration, not kept alongside.

2. **`event.platform` is undefined on `adapter-node`.** The hook passes `event.platform?.env ?? {}` and `withServices` calls `createServices({ platform: { env: c.env } })`. The existing `createServices` already handles both runtimes — no new adapter code needed.

3. **SvelteKit hooks don't run on Hono routes.** `handleSecurityHeaders` already skips `/api/*`, so this is mostly a no-op. The one gap (security headers on API responses) is filled by Hono's `secureHeaders()` middleware.

4. **`createAuth` per request.** Naively, the auth handler and the session middleware would each call `createAuth(db)`. `withServices` resolves it once and stores it via `c.set('auth', ...)`; both the `/api/auth/*` handler and `withSession` read it back from context.

5. **RPC IDE performance on very large route trees.** Hono's docs warn that many routes can slow tsserver due to repeated type instantiation. The `hcWithType` pattern in Step 6 precomputes the client type so editors do less work; split very large groups into separate sub-apps if it becomes an issue.

6. **`AppType` follows the value you export.** Always export `typeof routes` from a chained declaration. A spread or re-assignment can collapse the inferred type to `Hono<...>` and break the client.

7. **Better Auth path.** Hono catches `/api/auth/*` first; the SvelteKit `svelteKitHandler` no longer sees those requests. The cookie format and session shape are unchanged because both paths call into the same `createAuth(db).handler(...)`.

---

## Sources

- [Hono — RPC / `hc` client](https://hono.dev/docs/guides/rpc)
- [Hono — middleware factory](https://hono.dev/docs/helpers/factory)
- [Hono — error handling API](https://hono.dev/docs/api/hono)
- [Hono — secure headers middleware](https://hono.dev/docs/middleware/builtin/secure-headers)
- [Hono — `zod-openapi` example](https://hono.dev/examples/zod-openapi)
- [Hono — Cloudflare Workers guide](https://developers.cloudflare.com/workers/framework-guides/web-apps/more-web-frameworks/hono/)
- [Better Auth — Hono integration](https://better-auth.com/docs/integrations/hono)
- [Better Auth — SvelteKit integration](https://better-auth.com/docs/integrations/svelte-kit)
- [SvelteKit Hooks docs](https://svelte.dev/docs/kit/hooks)
- [SvelteKit Routing docs](https://svelte.dev/docs/kit/routing)
- [`@hono-rate-limiter/cloudflare` — npm](https://www.npmjs.com/package/@hono-rate-limiter/cloudflare)
