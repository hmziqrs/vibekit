# Organizations & Teams — Implementation Audit

**Date:** 2026-05-14
**Status:** Audited with fixes pending

## Phase Coverage

| Phase                                            | Status      | Notes                                                  |
| ------------------------------------------------ | ----------- | ------------------------------------------------------ |
| Org CRUD (create, read, update, delete)          | ✅ Complete | All 4 operations via Hono API, Svelte pages            |
| Member management (invite, remove, role changes) | ✅ Complete | Invite/remove/role-change API + UI                     |
| Role assignment & RBAC                           | ✅ Complete | 4 org roles, 2 team roles, permission matrix           |
| Transfer ownership                               | ✅ Complete | API endpoint with audit log + notification             |
| Organization settings                            | ✅ Complete | Name/description update, slug auto-generated           |
| Organization billing                             | ⚠️ Partial  | Stub only — no real Stripe integration                 |
| Team collaboration                               | ⚠️ Partial  | Teams CRUD done. Missing @mentions, resource ownership |
| Slug validation                                  | ✅ Complete | Auto-generated, uniqueness checked                     |

## Issues Found & Fixed

### HIGH Severity

1. **Missing "Leave Organization" endpoint** — `org.leave` permission defined but no API route exists. Users blocked from self-removal with message "Leave the organization instead" but cannot do so.
2. **No unique constraint on (userId, organizationId)** — `organizationMember` table lacks composite unique, allowing duplicate memberships under race conditions.
3. **No unique constraint on (userId, teamId)** — Same issue for `teamMember` table.
4. **Ownership transfer has no transaction** — Three separate DB operations without wrapping transaction.
5. **Soft-deleted org slug collision** — DB-level unique constraint on `slug` column conflicts with app-level check that excludes soft-deleted orgs.
6. **No rate limiting on org creation/invite** — Authenticated users can spam org creation or invitations.

### MEDIUM Severity

7. **`getRoleLevel()` never used for role change validation** — Admin can change another admin's role without restriction.
8. **Team create uses `org.update` instead of `team.create`** — Members cannot create teams despite RBAC saying they can.
9. **No invitation cancellation endpoint** — Org admins cannot revoke pending invitations.
10. **No invitation list per organization** — Cannot see who has been invited.
11. **Billing checkout/plan-change parse body without Zod validation** — No input validation.
12. **Duplicate permission files** — `$lib/permissions.ts` and `$lib/server/permissions.ts` nearly identical.
13. **Team detail uses `window.location.pathname`** — Should use `$page.params` like org pages.
14. **Invitation decline sets `acceptedAt`** — Semantically incorrect, no `declinedAt` field.
15. **No `emitEvent()` in org/team endpoints** — Webhooks never dispatched for org/team actions.

### LOW Severity (accepted)

- Breadcrumb shows UUID instead of org name
- No notification on org/team deletion for members
- No invitation expiry notification
- `organizationInvitation` has no explicit `status` column

## Key Files

- `src/lib/server/db/schema.ts` — Organization, member, invitation, team tables
- `src/lib/permissions.ts` / `src/lib/server/permissions.ts` — RBAC permission matrix
- `src/lib/server/hono/index.ts` — All org/team API routes
- `src/lib/server/hono/middleware.ts` — Org/team authorization middleware
- `src/lib/validators/organization.ts` / `team.ts` — Zod validation schemas
- `src/routes/(app)/app/organizations/` — All org/team Svelte pages

## Test Coverage

- Unit: `tests/unit/organization.test.ts`, `permissions.test.ts`, `hono-middleware-org-team.test.ts`
- E2E: `tests/e2e/organization.spec.ts`, `tests/e2e/team-collaboration.spec.ts`
- Gaps: No tests for leave org, ownership transfer, invitation decline, role change boundaries
