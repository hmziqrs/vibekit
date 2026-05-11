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

const ROLE_LEVELS: Record<OrgRole, number> = {
  admin: 3,
  member: 2,
  owner: 4,
  viewer: 1,
}

export function hasPermission(role: OrgRole, action: OrgAction): boolean {
  return ORG_PERMISSIONS[role].has(action)
}

export function getPermissions(role: OrgRole): OrgAction[] {
  return [...ORG_PERMISSIONS[role]]
}

export function getRoleLevel(role: OrgRole): number {
  return ROLE_LEVELS[role]
}
