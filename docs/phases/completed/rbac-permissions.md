# RBAC & Permissions System — Implementation Plan

## Overview

Build a proper RBAC layer on top of the existing organization roles. Define a permission matrix, centralize role checks into reusable functions, and enforce permissions consistently across all org-scoped API routes.

## What Exists

- Global roles: `user.role` = `user | admin` (in `auth.schema.ts`)
- Org member roles: `owner | admin | member | viewer` (in `schema.ts`)
- Middleware: `withOrgMembership`, `requireOrgAdmin`, `requireOrgOwner`
- All role checks are inline string comparisons — no centralized permission matrix

## What's Missing

- No permission/capability abstraction (`can(user, action, resource)`)
- No granular permission definitions per role
- No formalized role hierarchy (owner > admin > member > viewer)
- No resource-level permissions within orgs
- `membership.role` typed as `string` — loses enum safety

## Implementation

### 1. Permission Definitions

Create `src/lib/server/permissions.ts`:

- Define `OrgAction` const array with inferred union type
- Define `OrgRole` type: `'owner' | 'admin' | 'member' | 'viewer'`
- Define `ORG_PERMISSIONS: Record<OrgRole, Set<OrgAction>>` — explicit permission matrix
- Actions: `org.read`, `org.update`, `org.delete`, `org.members.read`, `org.members.manage`, `org.members.invite`, `org.members.remove`, `org.settings.read`, `org.settings.update`, `org.transfer`, `org.leave`
- Permission matrix (explicit):
  - `owner`: ALL actions
  - `admin`: all except `org.delete`, `org.transfer`
  - `member`: `org.read`, `org.members.read`, `org.leave`
  - `viewer`: `org.read`, `org.members.read`, `org.leave`
- Viewers CAN see members list (needed for collaboration awareness), but CANNOT manage/invite/remove
- Role hierarchy: `getRoleLevel(owner=4 > admin=3 > member=2 > viewer=1)`

### 2. Permission Check Function

In same file:

- `hasPermission(role: OrgRole, action: OrgAction): boolean` — checks the matrix
- `getPermissions(role: OrgRole): OrgAction[]` — returns all permissions for a role
- `getRoleLevel(role: OrgRole): number` — returns hierarchy level for comparison

### 3. Typed Role Middleware

Update `src/lib/server/hono/types.ts`:

- Add `OrgRole` type import, use it in `OrgMemberContext` instead of `string`

Update `src/lib/server/hono/middleware.ts`:

- `requirePermission(action: OrgAction)` — parameterized middleware factory that checks `hasPermission(membership.role, action)`
- Keep existing `requireOrgAdmin`/`requireOrgOwner` as convenience wrappers that delegate to `requirePermission`

### 4. Apply Permissions to Routes

Update `src/lib/server/hono/index.ts` org routes:

- Replace inline role checks with `requirePermission()` middleware
- `GET /:orgId` → `requirePermission('org.read')` (all members)
- `PATCH /:orgId` → `requirePermission('org.update')`
- `DELETE /:orgId` → `requirePermission('org.delete')` (owner only)
- `GET /:orgId/members` → `requirePermission('org.members.read')`
- `POST /:orgId/members/invite` → `requirePermission('org.members.invite')`
- `PATCH /:orgId/members/:memberId` → `requirePermission('org.members.manage')`
- `DELETE /:orgId/members/:memberId` → `requirePermission('org.members.remove')`
- `POST /:orgId/transfer-ownership` → `requirePermission('org.transfer')`
- **KEEP business-logic guards in handlers** — permission middleware handles role-based access, but handlers still enforce:
  - Cannot change an owner's role
  - Cannot remove an owner
  - Cannot remove yourself (use leave flow instead)
  - Cannot transfer ownership to yourself
  - Self-demotion: admin demoting themselves is allowed (they lose admin access)

### 5. Permission Helpers for Client

Create `src/lib/permissions.ts` (client-safe, no server imports):

- Duplicate the permission matrix and check functions (they're pure data, no DB access)
- Export `hasPermission`, `getPermissions`, `OrgAction`, `OrgRole`
- Client components use for conditional rendering (hide invite form from viewers)

### 6. Update UI Pages

- `src/routes/(app)/app/organizations/[id]/+page.svelte` — use `hasPermission(role, 'org.members.invite')` instead of `isAdmin`
- `src/routes/(app)/app/organizations/[id]/settings/+page.svelte` — use `hasPermission(role, 'org.settings.update')`

## File List

- `src/lib/server/permissions.ts` — NEW: permission matrix and check functions
- `src/lib/permissions.ts` — NEW: client-safe permission exports
- `src/lib/server/hono/types.ts` — UPDATE: typed role in OrgMemberContext
- `src/lib/server/hono/middleware.ts` — UPDATE: `requirePermission` factory
- `src/lib/server/hono/index.ts` — UPDATE: apply permission checks to org routes
- `src/routes/(app)/app/organizations/[id]/+page.svelte` — UPDATE: use permission checks
- `src/routes/(app)/app/organizations/[id]/settings/+page.svelte` — UPDATE: use permission checks
- `tests/unit/permissions.test.ts` — NEW: permission matrix and check tests
- `tests/e2e/rbac.spec.ts` — NEW: E2E tests for role-based access
