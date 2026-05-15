---
phase: 'Organizations & Teams'
date: '2026-05-15'
auditor: 'automated'
status: 'complete'
---

# Organizations & Teams Audit

## Summary

The Organizations & Teams phase covers org CRUD, member management with roles/permissions, org settings, org billing, and team collaboration features. The implementation is **solid on the CRUD and permissions front** but has notable gaps in transfer ownership, org-level billing, invitation management UI, and @mentions. Overall readiness: **~70%**.

---

## Claimed vs. Actual

| #   | Claimed Feature                                     | Status      | Verdict                                                                                                                                                                                                                                                                                                                                                                                                                  |
| --- | --------------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Organization CRUD                                   | Implemented | Create org (name, description), view org detail, update org settings (name, description), soft delete org (with 30-day recovery via `deletedAt`). All backed by validators and Hono API routes.                                                                                                                                                                                                                          |
| 2   | Team member management (invite, roles, permissions) | Partial     | Member invite works (email + role selection). Role change and member removal work. RBAC permission checks via `hasPermission()` and `requirePermission()` middleware. **No invitation list/management UI** -- sent invitations cannot be viewed, cancelled, or re-sent from the UI. **No invitation acceptance flow** in the org detail page (the API endpoint exists but there is no UI to accept pending invitations). |
| 3   | Organization settings                               | Implemented | Org settings page at `/organizations/[id]/settings` with name/description editing and delete org (danger zone). Slug is auto-generated and read-only.                                                                                                                                                                                                                                                                    |
| 4   | Organization billing (separate billing per org)     | Partial     | The `subscription` table has an `organizationId` column. The Stripe webhook handler maps subscriptions to orgs. **No org-level billing UI** -- users cannot manage billing from within an organization context. The billing settings page at `/app/settings/billing` is user-scoped only.                                                                                                                                |
| 5   | Activity feed per organization                      | Partial     | Team-level activity feed exists at `/organizations/[id]/teams/[teamId]` (shows team member adds/removes/role changes). **No organization-level activity feed** -- the org detail page shows members but no activity timeline.                                                                                                                                                                                            |

### From ROADMAP sub-items (lines 115-120)

| #   | Claimed Feature                                                                                                            | Status  | Verdict                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| --- | -------------------------------------------------------------------------------------------------------------------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 6   | RBAC & permissions system (role definitions, permission granularity, role hierarchy, custom roles, permission inheritance) | Partial | Permission system implemented in `src/lib/server/permissions.ts` with `OrgRole` (owner/admin/member/viewer) and `TeamRole` (lead/member). `hasPermission()` and `hasTeamPermission()` functions check role-based access. **No custom roles** -- roles are hardcoded enums. **No role hierarchy** beyond owner > admin > member > viewer (implicit, not configurable). **Permission inheritance in org hierarchy** is not implemented (org roles do not automatically grant team permissions). |
| 7   | Organization billing (org-level subscriptions, seat-based pricing, billing owner transfer, split billing across teams)     | Minimal | `subscription.organizationId` column exists. **No seat-based pricing UI**. **No billing owner transfer**. **No split billing across teams**. Org billing is infrastructure-only with no user-facing management.                                                                                                                                                                                                                                                                               |
| 8   | Team collaboration features (shared workspaces, resource ownership, activity feed per-team, @mentions, team settings)      | Partial | Shared workspaces via org/team membership. Resource ownership on items is user-scoped, not team-scoped. Activity feed per-team is implemented. **No @mentions** anywhere in the codebase. Team settings page exists (name, description, delete).                                                                                                                                                                                                                                              |

---

## Critical Gaps

### HIGH

1. **No invitation management UI** ~~: Users can send invitations from the org detail page, but there is no way to view pending invitations, cancel them, or re-send expired ones.~~ ✅ FIXED: Added `GET /api/orgs/:orgId/invitations` and `DELETE /api/orgs/:orgId/invitations/:id` endpoints. Pending invitations now shown on org detail page with revoke buttons.

2. **No invitation acceptance UI**: When a user receives an org invitation, there is no UI to view and accept/decline it. The API supports accepting via token, but no user-facing page exists for this flow.

3. **No org-level billing management**: The billing page (`/app/settings/billing`) is user-scoped. There is no way to view or manage subscriptions from within an organization context. The infrastructure supports org-scoped subscriptions (the `subscription.organizationId` column) but the UI does not expose this.

4. **No transfer ownership** ~~: The ROADMAP claims "transfer ownership" but there is no API endpoint or UI to transfer org ownership from one user to another.~~ ✅ FIXED: Transfer ownership UI added to org settings page. Owner selects a member from dropdown and confirms. API `POST /api/orgs/:orgId/transfer-ownership` already existed.

### MEDIUM

5. **No custom roles**: Roles are hardcoded as enums (`owner`, `admin`, `member`, `viewer` for orgs; `lead`, `member` for teams). Users cannot create custom roles with specific permission combinations.

6. **No organization-level activity feed**: The org detail page at `/organizations/[id]` shows members and a link to teams/settings, but has no activity timeline. Only teams have activity feeds.

7. **No @mentions**: Claimed in "team collaboration features" but completely absent from the codebase. No mention syntax parsing, no user search popup, no notification on mention.

8. **Items are user-scoped, not org/team-scoped**: Items belong to individual users (`item.userId`). There is no concept of org-owned or team-owned items. This limits collaborative use cases.

9. **No leave organization confirmation** ~~: The API endpoint `POST /:orgId/leave` exists but there is no UI button to leave an organization from the org detail page.~~ ✅ FIXED: "Leave" button added to org detail page (non-owners only) with confirmation dialog.

### LOW

10. **Org slug is auto-generated but not editable**: Slugs are derived from the org name at creation. Users cannot customize the slug after creation. The settings page shows the slug as read-only.

11. **No org avatar/logo upload**: Organizations have no image field in the schema. The org detail page shows a text-based initial.

12. **No member search/filter**: The members list on the org detail page has no search or filter capability. This will be problematic for large organizations.

---

## Files

### Routes (UI)

- `src/routes/(app)/app/organizations/+page.svelte` -- Org list + create form
- `src/routes/(app)/app/organizations/[id]/+page.svelte` -- Org detail (members, invite, role management)
- `src/routes/(app)/app/organizations/[id]/settings/+page.svelte` -- Org settings (name, description, delete)
- `src/routes/(app)/app/organizations/[id]/teams/+page.svelte` -- Teams list + create
- `src/routes/(app)/app/organizations/[id]/teams/[teamId]/+page.svelte` -- Team detail (members, activity feed)
- `src/routes/(app)/app/organizations/[id]/teams/[teamId]/settings/+page.svelte` -- Team settings (name, description, delete)

### API Routes (Hono)

- `src/lib/server/hono/index.ts` lines 4440-5000 -- Organization routes (CRUD, members, invite, leave)
- `src/lib/server/hono/index.ts` lines 5003-5400 -- Team routes (CRUD, members, activity)

### Schema

- `src/lib/server/db/schema.ts` -- `organization` (lines 244-270), `organizationMember` (lines 272-296), `organizationInvitation` (lines 298-326), `team` (lines 328-349), `teamMember` (lines 351-375), `teamActivity` (lines 479-500)

### Permissions

- `src/lib/server/permissions.ts` -- `hasPermission()`, `hasTeamPermission()`, role definitions

### Validators

- `src/lib/validators/organization.ts` -- `createOrganizationSchema`, `updateOrganizationSchema`, `inviteMemberSchema`
- `src/lib/validators/team.ts` -- `createTeamSchema`, `updateTeamSchema`, `addTeamMemberSchema`

### Middleware

- `src/lib/server/hono/middleware.ts` -- `withOrgMembership`, `requirePermission`, `requireTeamPermission`, `withTeamMembership`

### Tests

- `tests/unit/organization-validator.test.ts` -- Org validator tests
- `tests/unit/organization-leave.test.ts` -- Leave org tests

---

## Recommendations

1. Build an invitation management UI (list pending invitations, cancel, re-send).
2. Build an invitation acceptance page (accessible via email link with token).
3. Add org-scoped billing UI (view/manage subscription from org settings).
4. Implement transfer ownership API + UI (with confirmation and re-authentication).
5. Add an activity feed to the org detail page (similar to team activity).
6. Consider adding org/team-scoped items or a "shared items" concept for collaboration.
7. Add a "Leave Organization" button to the org detail page.
8. Add member search/filter for large organizations.
