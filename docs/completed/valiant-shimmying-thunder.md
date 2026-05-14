# Frontend Email Validation & Rate Limit Blocking

## Context

Currently the frontend sends subscribe/unsubscribe requests directly to the backend without any client-side validation or rate limit awareness. This means invalid emails and repeated rate-limited requests all hit the API unnecessarily. We want:

1. Frontend email validation before submitting
2. Backend returns `retryAfter` seconds on 429, frontend blocks further attempts during cooldown

## Changes

### 1. Update `rate-limit.ts` to return cooldown info

**File: `apps/api/src/lib/rate-limit.ts`**

Change `checkAndRecord` return type from `boolean` to `{ allowed: boolean; retryAfterSec?: number }`. When rate-limited, calculate `retryAfterSec` from the oldest timestamp in the window (the window resets when the oldest entry expires).

```ts
interface RateLimitResult {
  allowed: boolean
  retryAfterSec?: number // seconds until the oldest entry expires
}
```

Update `checkSubscribeRateLimit` and `checkUnsubscribeRateLimit` to propagate this. When either IP or email bucket is limited, return the `retryAfterSec` from the blocked bucket.

### 2. Update subscribe route to include `retryAfter` in 429

**File: `apps/api/src/modules/newsletter/routes/subscribe.ts`**

When rate-limited, return:

```json
{ "error": "Too many requests", "retryAfter": 2400 }
```

Also set `Retry-After` response header.

### 3. Update unsubscribe route to include `retryAfter` in 429

**File: `apps/api/src/modules/newsletter/routes/unsubscribe.ts`**

Same pattern as subscribe — return `retryAfter` in the body and `Retry-After` header on 429.

### 4. Update NewsletterForm with validation + rate limit blocking

**File: `apps/web/src/components/NewsletterForm.astro`**

- **Email validation**: Before fetch, validate email with a basic regex. Show inline error if invalid. Normalize (strip +alias) to show the canonical form.
- **Rate limit blocking**: On 429 response, store `retryAfter` timestamp in `localStorage` keyed by form uid. On form init, check if there's an active cooldown — if so, disable the form and show a countdown. Clear the cooldown when it expires.

### 5. Update unsubscribe page with rate limit blocking

**File: `apps/web/src/pages/newsletter/unsubscribe.astro`**

- On 429 response, show the retry time in the error message
- Store cooldown in `sessionStorage` (not localStorage — unsubscribe is a one-shot action per link visit)

## Files

| File                                                    | Action                                             |
| ------------------------------------------------------- | -------------------------------------------------- |
| `apps/api/src/lib/rate-limit.ts`                        | Return `retryAfterSec` in rate limit result        |
| `apps/api/src/modules/newsletter/routes/subscribe.ts`   | Include `retryAfter` + `Retry-After` header on 429 |
| `apps/api/src/modules/newsletter/routes/unsubscribe.ts` | Include `retryAfter` + `Retry-After` header on 429 |
| `apps/web/src/components/NewsletterForm.astro`          | Client-side email validation + rate limit blocking |
| `apps/web/src/pages/newsletter/unsubscribe.astro`       | Rate limit cooldown display                        |

## Verification

1. Submit form with invalid email → blocked on frontend, no API call
2. Submit form 3x rapidly → third blocked by frontend cooldown, shows countdown
3. API 429 response includes `retryAfter` field and `Retry-After` header
4. After cooldown expires, form re-enables
5. Run existing tests: `bun test scripts/__tests__` + `cd apps/api && npx vitest run`
