# Team Collaboration Features — Implementation Plan

## Scope

Build team collaboration within organizations: teams as sub-groups, team-scoped resources, activity feeds, @mentions, and team settings.

## Sub-Bullets

### 1. Database Schema — Team & TeamMember Tables

**File:** `src/lib/server/db/schema.ts`

Add two new tables:

- `team`: id, name, description, organizationId (FK → organization.id, CASCADE), createdAt, updatedAt
- `teamMember`: id, teamId (FK → team.id, CASCADE), userId (FK → user.id, CASCADE), role (`lead` | `member`), joinedAt, UNIQUE(teamId, userId)

Add Drizzle relations:

- `teamRelations`: organization (one), members (many teamMember)
- `teamMemberRelations`: team (one), user (one)
- Add `teams` to `organizationRelations`
- Add `teamMemberships` to `userOrgMemberRelations`

Generate migration and push to local D1.

### 2. Team Permission Extensions

**File:** `src/lib/server/permissions.ts` + `src/lib/permissions.ts`

Add team-level actions:

- `team.create`, `team.read`, `team.update`, `team.delete`
- `team.members.read`, `team.members.manage`, `team.members.invite`
- `team.settings.read`, `team.settings.update`

Org-level roles imply team permissions:

- Owner/Admin of org: all team actions within their org
- Member of org: team.read, team.members.read
- Team lead: team.update, team.members.manage, team.settings.update within their team

Add `hasTeamPermission()` function that checks org role + team role.

### 3. API Endpoints — Team CRUD

**File:** `src/lib/server/hono/index.ts`

New routes mounted under `/api/orgs/:orgId/teams`:

- `GET /` — List teams in org (paginated)
- `POST /` — Create team (require org membership, admin+ can create)
- `GET /:teamId` — Get team details + members
- `PATCH /:teamId` — Update team name/description (team lead or org admin+)
- `DELETE /:teamId` — Soft-delete team (org owner only)

### 4. API Endpoints — Team Members

- `GET /:teamId/members` — List team members with user info
- `POST /:teamId/members` — Add org member to team (team lead or org admin+)
- `DELETE /:teamId/members/:memberId` — Remove from team
- `PATCH /:teamId/members/:memberId` — Change team role (lead ↔ member)

### 5. UI — Team Pages

**New routes:**

- `src/routes/(app)/app/organizations/[id]/teams/+page.svelte` — Team list with create form
- `src/routes/(app)/app/organizations/[id]/teams/[teamId]/+page.svelte` — Team detail with members, activity
- `src/routes/(app)/app/organizations/[id]/teams/[teamId]/settings/+page.svelte` — Team settings

Design follows existing org page patterns:

- Card grid for teams, inline create form
- Member list with role badges, add/remove controls
- Permission-gated visibility (respect team.read, team.members.manage etc.)
- Uses TanStack Svelte Query for data fetching

### 6. Activity Feed Per Team

**New table:** `teamActivity`

- id, teamId (FK), actorId (FK → user.id), action (text), entityType, entityId, metadata (text/JSON), createdAt
- Index on (teamId, createdAt DESC)

**API endpoint:** `GET /api/orgs/:orgId/teams/:teamId/activity` — paginated, last 50

**Write path:** Insert on team mutations (member added/removed, team created/updated, resource shared)

**UI:** Activity timeline on team detail page, showing avatar, action verb, entity, relative timestamp

### 7. @Mentions System

**New table:** `mention`

- id, contentId, contentType (text), mentionedUserId (FK), mentionedByUserId (FK), teamId (FK nullable), createdAt

**Parsing:** Regex-based extraction on content save (`/@(\w+)/g` pattern)

- Resolve usernames to user IDs within the org scope
- Skip self-mentions
- Store extracted mentions in the mention table

**API endpoint:** `GET /api/orgs/:orgId/members/search?q=xxx` — for mention autocomplete (search by name/email within org)

**UI integration:** Add mention autocomplete dropdown to text inputs in team context (member search, filter by org membership)

### 8. Team Settings

**Settings stored on team row:** name, description
**Future-extensible:** JSON settings column for notification preferences, default visibility, etc.

**Settings page:**

- Edit name/description (team lead or org admin+)
- Danger zone: archive/delete team (org owner only)

### 9. Resource Ownership — Team-Scoped Items

Add `teamId` column to `item` table (nullable FK → team.id).

- Items with teamId are visible to team members
- Items without teamId remain personal (user-scoped)

**API changes:**

- `GET /api/orgs/:orgId/teams/:teamId/items` — list team items
- `POST /api/orgs/:orgId/teams/:teamId/items` — create item in team

**UI:** Items tab on team detail page

## Implementation Order

1. Schema (team, teamMember tables + migration)
2. Permission extensions (team-level actions)
3. API endpoints (team CRUD + member management)
4. Activity feed (table + endpoint + UI)
5. @mentions (table + parsing + autocomplete)
6. UI pages (team list, detail, settings)
7. Resource ownership (team-scoped items)

## Quality Gates

- All new code passes `bun run check`, `bun run lint`, `bun run format:check`
- Unit tests for permission checks, API handlers
- E2E tests for team CRUD workflow
- Browser verification of all team pages
