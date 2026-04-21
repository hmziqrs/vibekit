# Phase 3 — Auth + User App

**Status:** Complete
**PRD Reference:** §18 Phase 3, §19.2 Auth Checklist, §19.5 App Checklist

---

## What's Already Done

- [x] Better Auth configured with Drizzle adapter + D1
- [x] Auth database schema (user, session, account, verification tables)
- [x] Auth validators (login, register, forgot-password, reset-password schemas)
- [x] Route groups `(auth)`, `(app)`, `(admin)` scaffolded
- [x] Auth guards in hooks.server.ts (HTTP-level) and layout.server.ts (layout-level)
- [x] Admin role guard in hooks.server.ts and layout.server.ts
- [x] App layout with sidebar (basic)
- [x] Admin layout with sidebar (basic)
- [x] 5 auth page stubs (login, register, forgot-password, reset-password, verify-email)
- [x] 3 app page stubs (dashboard, profile, settings)
- [x] TanStack libraries installed (Query, Form, Table, Virtual, DB)
- [x] shadcn-svelte components: button, card, input, label, separator

---

## Remaining Work

### 3.1 Auth Client Setup

Create `src/lib/auth-client.ts` with Better Auth client SDK:

- Use `createAuthClient` from `better-auth/client`
- Configure base URL from env
- Export typed `authClient` for use in Svelte components
- Export convenience hooks: `useSession()` wrapper

**Files:**

- `src/lib/auth-client.ts`

---

### 3.2 Login Page

Replace placeholder with functional login form:

- Email + password form using shadcn-svelte Input/Button
- Client-side validation via `loginSchema`
- Call `authClient.signIn.email()` on submit
- Error display (invalid credentials, network errors)
- "Forgot password?" link
- "Create account" link to register
- Support `?next=` redirect param
- On success redirect to `/app` or `next` param

**Files:**

- `src/routes/(auth)/login/+page.svelte`

---

### 3.3 Register Page

Replace placeholder with functional registration form:

- Name + email + password + confirm password form
- Client-side validation via `registerSchema`
- Call `authClient.signUp.email()` on submit
- Error display (email taken, weak password)
- "Already have an account?" link to login
- On success redirect to `/app` or email verification page

**Files:**

- `src/routes/(auth)/register/+page.svelte`

---

### 3.4 Forgot Password Page

Replace placeholder with functional form:

- Email input form
- Client-side validation via `forgotPasswordSchema`
- Call `authClient.forgetPassword()` on submit
- Success message ("Check your email")
- Error display
- Link back to login

**Files:**

- `src/routes/(auth)/forgot-password/+page.svelte`

---

### 3.5 Reset Password Page

Replace placeholder with functional form:

- Token extracted from URL query param
- New password + confirm password form
- Client-side validation via `resetPasswordSchema`
- Call `authClient.resetPassword()` on submit
- Success message with redirect to login
- Error display (invalid/expired token)

**Files:**

- `src/routes/(auth)/reset-password/+page.svelte`

---

### 3.6 Verify Email Page

Replace placeholder with email verification flow:

- Accept `token` and `email` from URL query params
- Auto-call `authClient.verifyEmail()` on mount if token present
- Show success state with link to login
- Show error state (invalid/expired token)
- Show "check your inbox" state if no token (after registration)
- "Resend verification" button

**Files:**

- `src/routes/(auth)/verify-email/+page.svelte`

---

### 3.7 Auth-Aware Nav Component

Update `src/lib/components/nav.svelte`:

- Accept optional `user` prop or use auth client session
- If logged in: show "Dashboard" link + user avatar/name + logout dropdown
- If logged out: show "Log in" + "Get started" (current behavior)
- Logout calls `authClient.signOut()` then redirects to `/`

**Files:**

- `src/lib/components/nav.svelte`

---

### 3.8 Auth Error Pages

Create proper 401/403 error states:

- Update `src/routes/(app)/+layout.svelte` to handle auth errors
- Create `src/routes/(public)/401/+page.svelte` or use SvelteKit error page

**Files:**

- `src/routes/+error.svelte` (if not exists)

---

### 3.9 Items Database Schema

Add Items table to `src/lib/server/db/schema.ts`:

- `item` — id (UUID v7), userId, name, description, status (active/archived), createdAt, updatedAt, deletedAt
- This is the canonical example CRUD entity for the SaaS template

**Files:**

- `src/lib/server/db/schema.ts` — add item table
- `drizzle/0004_*.sql` — new migration
- `src/lib/validators/item.ts` — createItemSchema, updateItemSchema

---

### 3.10 Items API Endpoints

Create CRUD endpoints for Items:

- `POST /api/items` — create item
- `GET /api/items` — list user's items (with status filter)
- `GET /api/items/[id]` — get single item
- `PATCH /api/items/[id]` — update item
- `DELETE /api/items/[id]` — soft-delete item

All endpoints verify authenticated user + ownership.

**Files:**

- `src/routes/api/items/+server.ts`
- `src/routes/api/items/[id]/+server.ts`

---

### 3.11 TanStack Query Setup

Create TanStack Query provider for CSR app routes:

- QueryClient provider in `(app)` layout
- QueryClient configuration (staleTime, retry)
- Custom hooks for items: `useItems()`, `useItem(id)`

**Files:**

- `src/lib/query-client.ts`
- `src/routes/(app)/+layout.svelte` — add QueryClient provider

---

### 3.12 App Shell Enhancement

Enhance the app layout:

- Improve sidebar with active link indicator
- Add mobile-responsive sidebar (hamburger menu)
- Add user info in sidebar footer
- Update header with breadcrumb or page title

**Files:**

- `src/routes/(app)/+layout.svelte`

---

### 3.13 Dashboard Page

Replace stub with functional dashboard:

- Welcome message with user name
- Quick stats (item count, recent activity)
- Quick action links (create item, view profile)
- Use TanStack Query to fetch data

**Files:**

- `src/routes/(app)/app/dashboard/+page.svelte`

---

### 3.14 Profile Page

Replace stub with functional profile:

- Display user info (name, email, role, joined date)
- Edit display name
- Email change (with verification)
- Avatar upload placeholder

**Files:**

- `src/routes/(app)/app/profile/+page.svelte`

---

### 3.15 Settings Page

Replace stub with functional settings:

- Password change form
- Session management (view active sessions, revoke)
- Account deletion (soft-delete with confirmation)
- Notification preferences placeholder

**Files:**

- `src/routes/(app)/app/settings/+page.svelte`

---

### 3.16 Items List Page

Create items listing with TanStack Table:

- Table view of user's items (name, status, created date)
- Status filter (active/archived/trash)
- Search input
- TanStack Virtual for large lists
- Empty state when no items
- Links to create/edit

**Files:**

- `src/routes/(app)/app/items/+page.svelte`

---

### 3.17 Items Create/Edit Pages

Create item forms with TanStack Form:

- Create page with name + description fields
- Edit page with pre-filled data
- Shared validation via item validators
- Loading/error states
- Redirect to items list on success

**Files:**

- `src/routes/(app)/app/items/new/+page.svelte`
- `src/routes/(app)/app/items/[id]/edit/+page.svelte`

---

### 3.18 Auth + App Tests

Write tests for auth and app functionality:

- Auth validators tests (extend existing `auth.test.ts`)
- Item validators tests
- Items API endpoint integration tests
- Auth client utility tests
- Query client configuration tests

**Files:**

- `src/lib/validators/item.test.ts`
- `src/routes/api/items/+server.test.ts` (if feasible with D1 mocking)

---

## Implementation Order

1. Auth client setup (3.1)
2. Login page (3.2)
3. Register page (3.3)
4. Forgot password page (3.4)
5. Reset password page (3.5)
6. Verify email page (3.6)
7. Auth-aware Nav (3.7)
8. Auth error pages (3.8)
9. Items database schema + migration (3.9)
10. Items API endpoints (3.10)
11. TanStack Query setup (3.11)
12. App shell enhancement (3.12)
13. Dashboard page (3.13)
14. Profile page (3.14)
15. Settings page (3.15)
16. Items list page (3.16)
17. Items create/edit pages (3.17)
18. Write tests (3.18)
19. Run full test suite + type check

---

## Acceptance Criteria

- [ ] User can register with email + password
- [ ] User can log in and be redirected to /app
- [ ] User can log out from any authenticated page
- [ ] Forgot password sends reset email (or logs token in dev)
- [ ] Reset password works with valid token
- [ ] Email verification flow works
- [ ] Nav shows authenticated state (Dashboard link, user info)
- [ ] Unauthenticated /app/* redirects to /login?next=...
- [ ] /app dashboard shows welcome message with user data
- [ ] Profile page shows and allows editing user info
- [ ] Settings page allows password change
- [ ] Items can be created, listed, edited, and soft-deleted
- [ ] Items API endpoints enforce user ownership
- [ ] TanStack Query used for all app data fetching
- [ ] TanStack Form used for item create/edit
- [ ] All forms use shared Zod validators
- [ ] Mobile-responsive app layout
- [ ] `bun run check` passes clean (no source errors)
- [ ] `bun run test` passes
