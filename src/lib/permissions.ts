export const ORG_ACTIONS = [
  'org.delete',
  'org.leave',
  'org.members.invite',
  'org.members.manage',
  'org.members.read',
  'org.members.remove',
  'org.read',
  'org.settings.read',
  'org.settings.update',
  'org.transfer',
  'org.update',
] as const

export type OrgAction = (typeof ORG_ACTIONS)[number]

export type OrgRole = 'admin' | 'member' | 'owner' | 'viewer'

const ALL_ACTIONS = new Set<OrgAction>(ORG_ACTIONS)

const ORG_PERMISSIONS: Record<OrgRole, Set<OrgAction>> = {
  admin: new Set([
    'org.leave',
    'org.members.invite',
    'org.members.manage',
    'org.members.read',
    'org.members.remove',
    'org.read',
    'org.settings.read',
    'org.settings.update',
    'org.update',
  ]),
  member: new Set(['org.leave', 'org.members.read', 'org.read']),
  owner: ALL_ACTIONS,
  viewer: new Set(['org.leave', 'org.members.read', 'org.read']),
}

export function hasPermission(role: OrgRole, action: OrgAction): boolean {
  return ORG_PERMISSIONS[role].has(action)
}

export function getPermissions(role: OrgRole): OrgAction[] {
  return [...ORG_PERMISSIONS[role]]
}

const ROLE_LEVELS: Record<OrgRole, number> = {
  admin: 3,
  member: 2,
  owner: 4,
  viewer: 1,
}

export function getRoleLevel(role: OrgRole): number {
  return ROLE_LEVELS[role]
}

// Team-level permissions
export const TEAM_ACTIONS = [
  'team.create',
  'team.delete',
  'team.members.add',
  'team.members.manage',
  'team.members.read',
  'team.read',
  'team.settings.read',
  'team.settings.update',
  'team.update',
] as const

export type TeamAction = (typeof TEAM_ACTIONS)[number]

export type TeamRole = 'lead' | 'member'

const ALL_TEAM_ACTIONS = new Set<TeamAction>(TEAM_ACTIONS)

const ORG_TEAM_PERMISSIONS: Record<OrgRole, Set<TeamAction>> = {
  admin: ALL_TEAM_ACTIONS,
  member: new Set(['team.create', 'team.members.read', 'team.read']),
  owner: ALL_TEAM_ACTIONS,
  viewer: new Set(['team.members.read', 'team.read']),
}

const TEAM_ROLE_PERMISSIONS: Record<TeamRole, Set<TeamAction>> = {
  lead: new Set([
    'team.members.add',
    'team.members.manage',
    'team.members.read',
    'team.read',
    'team.settings.read',
    'team.settings.update',
    'team.update',
  ]),
  member: new Set(['team.members.read', 'team.read']),
}

export function hasTeamPermission(
  orgRole: OrgRole,
  teamRole: TeamRole | null,
  action: TeamAction
): boolean {
  if (ORG_TEAM_PERMISSIONS[orgRole].has(action)) return true
  if (teamRole && TEAM_ROLE_PERMISSIONS[teamRole].has(action)) return true
  return false
}

export function getTeamPermissions(orgRole: OrgRole, teamRole: TeamRole | null): TeamAction[] {
  const orgPerms = ORG_TEAM_PERMISSIONS[orgRole]
  if (!teamRole) return [...orgPerms]
  const combined = new Set<TeamAction>(orgPerms)
  for (const action of TEAM_ROLE_PERMISSIONS[teamRole]) {
    combined.add(action)
  }
  return [...combined]
}
