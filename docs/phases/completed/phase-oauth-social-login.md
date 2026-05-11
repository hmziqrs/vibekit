# Phase: OAuth & Social Login Hardening

## Status: In Progress

## Current State

The project has **zero OAuth/social login implementation**. However, the infrastructure is well-prepared:

- `account` table in auth schema already supports OAuth columns (providerId, accessToken, refreshToken, etc.)
- `better-auth` v1.6 has 35+ built-in social providers
- Client `signIn.social()` API works without additional plugins
- PKCE flow is handled automatically by Better Auth

## Implementation Plan

### 1. Server Configuration (`src/lib/server/auth.ts`)

Add `socialProviders` config for Google and GitHub (most common for SaaS):

- `google`: clientId/secret from env vars, `prompt: "select_account"`, scope: `openid email profile`
- `github`: clientId/secret from env vars, scope: `user:email`

Add `account` configuration:

- `encryptOAuthTokens: true` — encrypt tokens stored in DB
- `accountLinking.enabled: true` — enable auto-linking
- `accountLinking.trustedProviders: ["google", "github", "email-password"]`
- `accountLinking.allowDifferentEmails: false` — require email match

### 2. Environment Variables

Add to `.env.example`:

- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`

Add to `wrangler.jsonc` secrets (documented, not set locally):

- Same four vars as Cloudflare secrets

### 3. Login Page (`src/routes/(auth)/login/+page.svelte`)

Add social login buttons above the email form:

- "Continue with Google" button with Google SVG icon
- "Continue with GitHub" button with GitHub SVG icon
- Each calls `signIn.social({ provider, callbackURL: '/app' })`
- Error state for social login failures

### 4. Register Page (`src/routes/(auth)/register/+page.svelte`)

Add same social buttons above the registration form:

- "Continue with Google" and "Continue with GitHub"
- Same callback pattern as login

### 5. Settings Page — Connected Accounts (`src/routes/(app)/app/settings/+page.svelte`)

Add "Connected Accounts" section:

- List linked providers (Google, GitHub, email/password)
- Link button for unlinked providers (`authClient.linkSocial()`)
- Unlink button for linked providers (`authClient.unlinkAccount()`)
- Guard: cannot unlink last account
- Status indicator per provider (linked/unlinked)

### 6. Error Page (`src/routes/(auth)/auth-error/+page.svelte`)

Create dedicated OAuth error page:

- Displays OAuth error message from URL params
- Link back to login page
- Common error explanations (account linking conflict, etc.)

## Files to Modify

- `src/lib/server/auth.ts` — add socialProviders + account config
- `src/routes/(auth)/login/+page.svelte` — add social buttons
- `src/routes/(auth)/register/+page.svelte` — add social buttons
- `src/routes/(app)/app/settings/+page.svelte` — add connected accounts section
- `.env.example` — add OAuth env vars

## Files to Create

- `src/routes/(auth)/auth-error/+page.svelte` — OAuth error page

## Tests

### Unit Tests

- Verify socialProviders config in auth.ts
- Verify account linking config
- Verify login/register pages have social buttons
- Verify settings has connected accounts section
- Verify error page exists

### E2E Tests

- Social buttons visible on login page
- Social buttons visible on register page
- Connected accounts section in settings
- Error page renders with error message

## Quality Gates

- `bun run test`: All tests pass
- `bun run check`: Clean (no new type errors)
- `bun run lint`: 0 errors
- `bun run format:check`: Clean
