# Organizations & Teams — Implementation Plan

## Overview

Add organization CRUD, membership management with roles, org settings, and ownership transfer. Keep scope focused — no billing integration yet (separate phase).

## Schema Design

### `organization` table

- `id` (text PK, uuidv7)
- `name` (text, not null)
- `slug` (text, unique, not null)
- `description` (text, nullable)
- `ownerId` (text FK -> user.id, not null)
- `createdAt`, `updatedAt`, `deletedAt`

### `organization_member` table

- `id` (text PK, uuidv7)
- `organizationId` (text FK -> organization.id, cascade)
- `userId` (text FK -> user.id, cascade)
- `role` (text enum: owner/admin/member/viewer, default member)
- `joinedAt` (timestamp)
- Unique constraint on (organizationId, userId)

### `organization_invitation` table

- `id` (text PK, uuidv7)
- `organizationId` (text FK -> organization.id, cascade)
- `email` (text, not null)
- `role` (text enum: admin/member/viewer, default member)
- `invitedBy` (text FK -> user.id, cascade)
- `token` (text, unique, not null) — for invite link
- `expiresAt` (timestamp)
- `acceptedAt` (timestamp, nullable)
- `createdAt`

## API Endpoints

### Org CRUD (under `/api/orgs`)

- `GET /api/orgs` — list user's organizations
- `POST /api/orgs` — create org (creator becomes owner)
- `GET /api/orgs/:orgId` — get org details (members only)
- `PATCH /api/orgs/:orgId` — update org (admin+ only)
- `DELETE /api/orgs/:orgId` — soft-delete org (owner only)

### Members (under `/api/orgs/:orgId/members`)

- `GET /api/orgs/:orgId/members` — list members
- `PATCH /api/orgs/:orgId/members/:memberId` — change role (admin+ only)
- `DELETE /api/orgs/:orgId/members/:memberId` — remove member (admin+ only)
- `POST /api/orgs/:orgId/members/invite` — send invite (admin+ only)
- `POST /api/orgs/:orgId/transfer-ownership` — transfer owner (owner only)

### Invitations (under `/api/invitations`)

- `GET /api/invitations` — list user's pending invitations
- `POST /api/invitations/:token/accept` — accept invitation
- `POST /api/invitations/:token/decline` — decline invitation

## Middleware

- `withOrgMembership` — verify current user is member, set org context
- `requireOrgAdmin` — verify user has owner/admin role in org
- `requireOrgOwner` — verify user is org owner

## Pages

- `/app/organizations` — list user's orgs, create new
- `/app/organizations/[id]` — org detail, members list, settings
- `/app/organizations/[id]/settings` — org settings, danger zone
- Sidebar: add "Organizations" nav item

## File List

- `src/lib/server/db/schema.ts` — add organization tables + relations
- `src/lib/server/hono/middleware.ts` — org middleware
- `src/lib/server/hono/index.ts` — org API routes
- `src/lib/validators/organization.ts` — Zod schemas
- `src/routes/(app)/app/organizations/+page.svelte` — org list
- `src/routes/(app)/app/organizations/[id]/+page.svelte` — org detail
- `src/routes/(app)/app/organizations/[id]/settings/+page.svelte` — settings
- `src/routes/(app)/+layout.svelte` — add nav item
- `tests/unit/organization.test.ts`
- `tests/e2e/organization.spec.ts`
