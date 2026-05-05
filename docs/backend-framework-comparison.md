# Backend Framework Comparison: SvelteKit-only vs SvelteKit + Hono

Decision context for Vibekit: dual-runtime app running on VPS (Bun + SQLite) and Cloudflare Workers (D1 + R2). Better Auth is integrated natively with SvelteKit. The question is whether to add Hono as a dedicated API layer inside SvelteKit.

---

## Option 1: SvelteKit-only (current)

Keep using SvelteKit hooks, `+server.ts` API routes, and `event.locals` for all backend logic.

### What the stack looks like

```
src/
  hooks.server.ts           ← sequence(handleParaglide, handleBetterAuth)
  routes/
    api/
      users/+server.ts      ← manual GET/POST, manual zod parse, per-route try/catch
    (app)/                  ← CSR SPA, TanStack Query fetches the above
```

### Pros

1. **Zero new dependencies** — no framework to learn, no version skew, no integration surface.

2. **Better Auth is fully native** — `svelteKitHandler` populates `event.locals.user` and `event.locals.session` automatically. Every `+server.ts` and `+page.server.ts` has the authenticated user in scope with no extra work.

   ```ts
   // hooks.server.ts
   import { auth } from '$lib/server/auth'
   import { svelteKitHandler } from 'better-auth/svelte-kit'
   import { building } from '$app/environment'

   export async function handle({ event, resolve }) {
     return svelteKitHandler({ event, resolve, auth, building })
   }
   ```

3. **Middleware-like chaining already exists** — `sequence(handleParaglide, handleBetterAuth)` handles the lifecycle. Adding rate limiting, logging, or IP filtering is another `handle` function.

4. **Deployment is already solved** — `adapter-node` (VPS/Bun) and `adapter-cloudflare` (Workers) are wired with the `__ADAPTER__` build-time constant. No secondary process or routing delegation.

5. **Remote Functions (experimental)** — SvelteKit's native typesafe RPC layer. Write server logic in `.remote.ts` files and call them from Svelte components as regular `async` functions — SvelteKit transforms them into optimized fetch requests with full TypeScript inference. As of late 2025: supports `query.batch` for request batching, lazy discovery, and form schema support. **Not semver-stable** — gated behind `experimental.remoteFunctions`, can change or be removed at any time.

### Cons

1. **No stable typesafe API client today** — Remote Functions are experimental. Until they stabilize, all TanStack Query calls to `+server.ts` endpoints are plain untyped fetches. Issue [#12645](https://github.com/sveltejs/kit/issues/12645) (Typed API Routes) is still open on the SvelteKit repo.

2. **Manual validation per route** — every `+server.ts` individually calls `z.parse()` or `safeParse()`. No centralized schema pipeline, no compile-time guarantee that all routes validate consistently.

3. **Ad-hoc error handling** — each route has its own `try/catch` and `json({ error }, { status: 422 })`. No global error middleware to normalize error shapes across the API.

4. **No OpenAPI output** — route definitions produce no machine-readable spec. Relevant if the API is ever exposed to external consumers or third-party tooling.

### When to stay here

- API surface is small and purely internal.
- Team wants zero cognitive overhead from a secondary framework.
- Willing to wait for Remote Functions to stabilize.

---

## Option 2: SvelteKit + Hono

Add Hono as the API layer inside SvelteKit. SvelteKit still owns all page rendering, the Better Auth hook, and both deployment adapters. Hono owns all structured API routes under `/api/`.

**Current state**: Hono v4.12.16 (April 30, 2026). ~14KB bundle (`hono/tiny` preset under 12KB). GA on Cloudflare Workers since April 2025 per the official Cloudflare changelog.

---

### Integration: hooks.server.ts intercept

Intercept requests in `hooks.server.ts` before SvelteKit's router sees them. SvelteKit's internal `fetch` resolves Hono handlers in-process — no network round-trip.

```ts
// src/hooks.server.ts
import { sequence } from '@sveltejs/kit/hooks'
import type { Handle } from '@sveltejs/kit'
import { handleParaglide } from '$lib/paraglide/server'
import { handleBetterAuth } from '$lib/server/auth'
import { app } from '$lib/server/hono'

const handleHono: Handle = async ({ event, resolve }) => {
  if (event.url.pathname.startsWith('/api/')) {
    // Passes Cloudflare bindings (DB, KV, R2) into Hono's c.env
    // On VPS (adapter-node): event.platform is undefined, falls back to {}
    return app.fetch(
      event.request,
      event.platform?.env ?? {},
      event.platform?.ctx,
    )
  }
  return resolve(event)
}

// handleBetterAuth still runs for page routes — populates event.locals
export const handle = sequence(handleParaglide, handleBetterAuth, handleHono)
```

`handleHono` is placed after `handleBetterAuth` in the sequence. For `/api/` requests, `handleBetterAuth` runs first then `handleHono` short-circuits to Hono — so Hono fully owns the response. Session validation inside Hono middleware (below) is still needed because `event.locals` is not forwarded into Hono's context.

---

### The Hono app

```ts
// src/lib/server/hono/index.ts
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { createAuth } from '$lib/server/auth'
import { getDb } from '$lib/server/db'
import type { D1Database } from '@cloudflare/workers-types'

// Matches Cloudflare bindings from wrangler.jsonc
// On VPS: whatever object is passed to app.fetch(req, env)
type Bindings = { DB: D1Database }

type Variables = {
  user: ReturnType<typeof createAuth>['$Infer']['Session']['user'] | null
  session: ReturnType<typeof createAuth>['$Infer']['Session']['session'] | null
}

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>()

// CORS — must be before all routes
app.use('*', cors())

// Better Auth handler — same /api/auth/* path the auth client already calls
app.on(['POST', 'GET'], '/api/auth/*', (c) => {
  return createAuth(c.env.DB).handler(c.req.raw)
})

// Session middleware — Hono equivalent of event.locals.user
app.use('/api/*', async (c, next) => {
  const session = await createAuth(c.env.DB).api.getSession({
    headers: c.req.raw.headers,
  })
  c.set('user', session?.user ?? null)
  c.set('session', session?.session ?? null)
  await next()
})

// Global error handler
app.onError((err, c) => {
  console.error(err)
  return c.json({ error: 'Internal Server Error' }, 500)
})

// Routes — chained so AppType captures full inferred type
const routes = app
  .get('/api/users', async (c) => {
    const user = c.get('user')
    if (!user) return c.json({ error: 'Unauthorized' }, 401)
    const db = getDb(c.env.DB)
    const users = await db.query.users.findMany()
    return c.json(users)
  })
  .post(
    '/api/users',
    zValidator('json', z.object({ name: z.string().min(1), email: z.string().email() })),
    async (c) => {
      const user = c.get('user')
      if (!user) return c.json({ error: 'Unauthorized' }, 401)
      const body = c.req.valid('json')   // typed as { name: string; email: string }
      // ...
      return c.json({ ok: true }, 201)
    },
  )

// hc<AppType> reads this to build the typed client
export type AppType = typeof routes
export { app }
```

**Why chain routes**: `AppType` inference walks the chained return type of each `.get()` / `.post()`. Chaining is the explicit pattern in Hono's official RPC docs. `typeof app` also works in v4 but is less precise.

---

### Typesafe RPC client

```ts
// src/lib/api.ts
import { hc } from 'hono/client'
import type { AppType } from '$lib/server/hono'

// location is undefined during SSR — fall back to localhost for dev
const origin = typeof location !== 'undefined' ? location.origin : 'http://localhost:5173'

export const api = hc<AppType>(origin, {
  init: { credentials: 'include' },   // forwards session cookie on every request
})
```

```ts
// In a Svelte component — fully typed, autocompletion works
const res = await api.api.users.$get()
const users = await res.json()   // type inferred from the route's return
```

No code generation, no schema sync. Types come from `AppType` at compile time. Renaming a route or changing its response breaks the client at the TypeScript level before it can break at runtime.

---

### Validation

`@hono/zod-validator` uses the same Zod the project already has. `c.req.valid('json')` returns the typed, validated body. Validation failures return 400 automatically — no try/catch needed.

```ts
app.post(
  '/api/invites',
  zValidator('json', z.object({ email: z.string().email() })),
  (c) => {
    const { email } = c.req.valid('json')   // string, guaranteed
    // ...
  },
)
```

Supported targets: `'json'`, `'form'`, `'query'`, `'param'`, `'header'`, `'cookie'`.

---

### OpenAPI (optional)

`@hono/zod-openapi` is a drop-in replacement for `Hono` that emits a valid OpenAPI 3.0 spec + Swagger UI from the same route definitions — no extra annotation.

```ts
import { OpenAPIHono, createRoute } from '@hono/zod-openapi'

const app = new OpenAPIHono<{ Bindings: Bindings; Variables: Variables }>()

const getUserRoute = createRoute({
  method: 'get',
  path: '/api/users/{id}',
  request: { params: z.object({ id: z.string() }) },
  responses: {
    200: {
      content: { 'application/json': { schema: z.object({ name: z.string() }) } },
      description: 'User found',
    },
  },
})

app.openapi(getUserRoute, (c) => {
  const { id } = c.req.valid('param')
  return c.json({ name: 'Alice' })
})

app.doc('/doc', { openapi: '3.0.0', info: { title: 'Vibekit API', version: '1.0.0' } })
```

All existing `app.use()` middleware and `app.onError()` continue to work unchanged on `OpenAPIHono`.

---

### Gains over SvelteKit-only

| Gap in SvelteKit-only | Hono solution |
|---|---|
| No stable typesafe client | `hc<AppType>()` — stable, no codegen |
| Manual Zod parse per route | `zValidator('json', schema)` — centralized, auto-400 |
| Per-route try/catch | `app.onError((err, c) => ...)` — global handler |
| No OpenAPI | `@hono/zod-openapi` — from same route definitions |
| No CF-native rate limiting | `@hono-rate-limiter/cloudflare` middleware |
| API coupled to SvelteKit | Portable `fetch` handler — extract later if needed |

---

### Honest cons

1. **Two routing systems** — SvelteKit owns pages and `load()` functions. Hono owns `/api/*`. Everyone needs to know the split. The namespace convention must be enforced by discipline.

2. **`createAuth(c.env.DB)` called per request** — the factory is invoked in both the session middleware and the auth route handler per request, matching what SvelteKit does today. Negligible on Workers. On VPS, memoize if it becomes a hot path.

3. **`event.platform` is undefined on VPS** — `adapter-node` does not populate `event.platform`, so `event.platform?.env` falls back to `{}` in the hook. VPS-specific bindings (SQLite path, secrets) need to be injected through a separate module-level env object merged into the `app.fetch` call.

4. **Better Auth mounted twice** — `svelteKitHandler` stays in `hooks.server.ts` for page-route session hydration. Hono also mounts `auth.handler` at `/api/auth/*` for actual auth endpoints. Both use the same `createAuth` factory and config — one extra `app.on(...)` line, not a real burden.

---

## Summary

| Concern | SvelteKit-only | SvelteKit + Hono |
|---|---|---|
| Typesafe API client | Experimental (Remote Functions) | Stable — `hc<AppType>()`, no codegen |
| Validation | Manual Zod per route | `@hono/zod-validator`, centralized |
| Error handling | Per-route try/catch | `app.onError()` global handler |
| OpenAPI | No | `@hono/zod-openapi` |
| Rate limiting (CF) | None / manual | `@hono-rate-limiter/cloudflare` |
| Better Auth | Native `svelteKitHandler` | Native `auth.handler(c.req.raw)` — same factory |
| Session access | `event.locals.user` | `c.get('user')` — equivalent |
| D1/R2 in API | `event.platform.env.DB` | `c.env.DB` (passed from `event.platform.env`) |
| CF Workers maturity | GA (April 2025) | GA (April 2025) |
| Bun / VPS | `adapter-node` | Same adapter — Hono runs inside it |
| Bundle overhead | None | ~14KB |
| Routing systems | One | Two (SvelteKit pages + Hono `/api/*`) |
| API portability | Coupled to SvelteKit | Portable `fetch` handler |
| Operational complexity | Low | Low — same single process |

**Stay SvelteKit-only** if the API surface is small and internal. Watch `experimental.remoteFunctions` for a native typesafe solution.

**Add Hono** if you want a typesafe API client today, the API surface is growing, or you want centralized validation and error handling. Runs inside the same SvelteKit process — no ops change.

---

## Sources

- [Better Auth — Hono integration](https://better-auth.com/docs/integrations/hono)
- [Better Auth — SvelteKit integration](https://better-auth.com/docs/integrations/svelte-kit)
- [Better Auth — Cloudflare D1 config](https://better-auth.com/docs/concepts/database)
- [Hono — RPC / hc client](https://hono.dev/docs/guides/rpc)
- [Hono — zod-openapi example](https://hono.dev/examples/zod-openapi)
- [Hono — error handling API](https://hono.dev/docs/api/hono)
- [Hono — Cloudflare Workers guide (official CF docs)](https://developers.cloudflare.com/workers/framework-guides/web-apps/more-web-frameworks/hono/)
- [Full-stack frameworks GA on Cloudflare Workers — April 2025](https://developers.cloudflare.com/changelog/post/2025-04-08-fullstack-on-workers/)
- [SvelteKit + Hono RPC — Tolu Blog](https://www.tolu.se/blog/sveltekit-rpc-hono/)
- [SvelteKit Remote Functions docs](https://svelte.dev/docs/kit/remote-functions)
- [Typed API Routes issue #12645](https://github.com/sveltejs/kit/issues/12645)
