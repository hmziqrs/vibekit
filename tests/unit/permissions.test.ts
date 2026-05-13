import {
  getPermissions,
  getRoleLevel,
  getTeamPermissions,
  hasPermission,
  hasTeamPermission,
  ORG_ACTIONS,
  TEAM_ACTIONS,
  type OrgRole,
} from '$lib/permissions'
import { describe, expect, it } from 'vitest'

const ROLES: OrgRole[] = ['owner', 'admin', 'member', 'viewer']

describe('permission matrix completeness', () => {
  it('owner has a permission set', () => {
    expect(getPermissions('owner').length).toBeGreaterThan(0)
  })

  it('admin has a permission set', () => {
    expect(getPermissions('admin').length).toBeGreaterThan(0)
  })

  it('member has a permission set', () => {
    expect(getPermissions('member').length).toBeGreaterThan(0)
  })

  it('viewer has a permission set', () => {
    expect(getPermissions('viewer').length).toBeGreaterThan(0)
  })

  it('owner has all actions', () => {
    expect(getPermissions('owner')).toHaveLength(ORG_ACTIONS.length)
  })

  it('admin has more permissions than member', () => {
    expect(getPermissions('admin').length).toBeGreaterThan(getPermissions('member').length)
  })

  it('member and viewer have same permission count', () => {
    expect(getPermissions('member')).toHaveLength(getPermissions('viewer').length)
  })
})

describe('owner permissions', () => {
  it('can read org', () => {
    expect(hasPermission('owner', 'org.read')).toBe(true)
  })

  it('can update org', () => {
    expect(hasPermission('owner', 'org.update')).toBe(true)
  })

  it('can delete org', () => {
    expect(hasPermission('owner', 'org.delete')).toBe(true)
  })

  it('can transfer ownership', () => {
    expect(hasPermission('owner', 'org.transfer')).toBe(true)
  })

  it('can manage members', () => {
    expect(hasPermission('owner', 'org.members.manage')).toBe(true)
  })

  it('can invite members', () => {
    expect(hasPermission('owner', 'org.members.invite')).toBe(true)
  })

  it('can remove members', () => {
    expect(hasPermission('owner', 'org.members.remove')).toBe(true)
  })

  it('can read members', () => {
    expect(hasPermission('owner', 'org.members.read')).toBe(true)
  })

  it('can read settings', () => {
    expect(hasPermission('owner', 'org.settings.read')).toBe(true)
  })

  it('can update settings', () => {
    expect(hasPermission('owner', 'org.settings.update')).toBe(true)
  })

  it('can leave org', () => {
    expect(hasPermission('owner', 'org.leave')).toBe(true)
  })
})

describe('admin permissions', () => {
  it('can update org', () => {
    expect(hasPermission('admin', 'org.update')).toBe(true)
  })

  it('can manage members', () => {
    expect(hasPermission('admin', 'org.members.manage')).toBe(true)
  })

  it('can invite members', () => {
    expect(hasPermission('admin', 'org.members.invite')).toBe(true)
  })

  it('can remove members', () => {
    expect(hasPermission('admin', 'org.members.remove')).toBe(true)
  })

  it('cannot delete org', () => {
    expect(hasPermission('admin', 'org.delete')).toBe(false)
  })

  it('cannot transfer ownership', () => {
    expect(hasPermission('admin', 'org.transfer')).toBe(false)
  })

  it('can read org and members', () => {
    expect(hasPermission('admin', 'org.read')).toBe(true)
  })

  it('can leave org', () => {
    expect(hasPermission('admin', 'org.leave')).toBe(true)
  })
})

describe('member permissions', () => {
  it('can read org', () => {
    expect(hasPermission('member', 'org.read')).toBe(true)
  })

  it('can read members', () => {
    expect(hasPermission('member', 'org.members.read')).toBe(true)
  })

  it('can leave org', () => {
    expect(hasPermission('member', 'org.leave')).toBe(true)
  })

  it('cannot update org', () => {
    expect(hasPermission('member', 'org.update')).toBe(false)
  })

  it('cannot delete org', () => {
    expect(hasPermission('member', 'org.delete')).toBe(false)
  })

  it('cannot manage members', () => {
    expect(hasPermission('member', 'org.members.manage')).toBe(false)
  })

  it('cannot invite members', () => {
    expect(hasPermission('member', 'org.members.invite')).toBe(false)
  })

  it('cannot remove members', () => {
    expect(hasPermission('member', 'org.members.remove')).toBe(false)
  })

  it('cannot access settings', () => {
    expect(hasPermission('member', 'org.settings.read')).toBe(false)
  })

  it('cannot transfer ownership', () => {
    expect(hasPermission('member', 'org.transfer')).toBe(false)
  })
})

describe('viewer permissions', () => {
  it('can read org', () => {
    expect(hasPermission('viewer', 'org.read')).toBe(true)
  })

  it('can read members', () => {
    expect(hasPermission('viewer', 'org.members.read')).toBe(true)
  })

  it('can leave org', () => {
    expect(hasPermission('viewer', 'org.leave')).toBe(true)
  })

  it('cannot update org', () => {
    expect(hasPermission('viewer', 'org.update')).toBe(false)
  })

  it('cannot manage members', () => {
    expect(hasPermission('viewer', 'org.members.manage')).toBe(false)
  })

  it('cannot invite members', () => {
    expect(hasPermission('viewer', 'org.members.invite')).toBe(false)
  })

  it('cannot remove members', () => {
    expect(hasPermission('viewer', 'org.members.remove')).toBe(false)
  })

  it('cannot update settings', () => {
    expect(hasPermission('viewer', 'org.settings.update')).toBe(false)
  })

  it('cannot transfer ownership', () => {
    expect(hasPermission('viewer', 'org.transfer')).toBe(false)
  })

  it('cannot delete org', () => {
    expect(hasPermission('viewer', 'org.delete')).toBe(false)
  })
})

describe('role hierarchy', () => {
  it('owner has highest level', () => {
    expect(getRoleLevel('owner')).toBeGreaterThan(getRoleLevel('admin'))
  })

  it('admin has higher level than member', () => {
    expect(getRoleLevel('admin')).toBeGreaterThan(getRoleLevel('member'))
  })

  it('member has higher level than viewer', () => {
    expect(getRoleLevel('member')).toBeGreaterThan(getRoleLevel('viewer'))
  })

  it('viewer has lowest non-zero level', () => {
    expect(getRoleLevel('viewer')).toBeGreaterThan(0)
  })

  it('owner has level 4', () => {
    expect(getRoleLevel('owner')).toBe(4)
  })
})

describe(getPermissions, () => {
  it('returns valid actions for admin', () => {
    const perms = getPermissions('admin')
    expect(perms.length).toBeGreaterThan(0)
  })

  it('returns only known actions', () => {
    const perms = getPermissions('admin')
    const knownSet = new Set(ORG_ACTIONS)
    expect(perms.every((p) => knownSet.has(p))).toBe(true)
  })
})

describe('team permission checks', () => {
  it('org owner can perform any team action without team role', () => {
    const results = TEAM_ACTIONS.map((action) => hasTeamPermission('owner', null, action))
    expect(results.every(Boolean)).toBe(true)
  })

  it('org admin can perform any team action without team role', () => {
    const results = TEAM_ACTIONS.map((action) => hasTeamPermission('admin', null, action))
    expect(results.every(Boolean)).toBe(true)
  })

  it('org member can create and read teams without team role', () => {
    expect(hasTeamPermission('member', null, 'team.read')).toBe(true)
    expect(hasTeamPermission('member', null, 'team.members.read')).toBe(true)
    expect(hasTeamPermission('member', null, 'team.create')).toBe(true)
    expect(hasTeamPermission('member', null, 'team.update')).toBe(false)
    expect(hasTeamPermission('member', null, 'team.delete')).toBe(false)
  })

  it('team lead can manage team settings', () => {
    expect(hasTeamPermission('member', 'lead', 'team.settings.update')).toBe(true)
    expect(hasTeamPermission('member', 'lead', 'team.update')).toBe(true)
    expect(hasTeamPermission('member', 'lead', 'team.members.manage')).toBe(true)
    expect(hasTeamPermission('member', 'lead', 'team.members.add')).toBe(true)
  })

  it('team member can only read', () => {
    expect(hasTeamPermission('member', 'member', 'team.read')).toBe(true)
    expect(hasTeamPermission('member', 'member', 'team.members.read')).toBe(true)
    expect(hasTeamPermission('member', 'member', 'team.update')).toBe(false)
    expect(hasTeamPermission('member', 'member', 'team.settings.update')).toBe(false)
  })

  it('org viewer has minimal team permissions', () => {
    expect(hasTeamPermission('viewer', null, 'team.read')).toBe(true)
    expect(hasTeamPermission('viewer', null, 'team.members.read')).toBe(true)
    expect(hasTeamPermission('viewer', null, 'team.create')).toBe(false)
    expect(hasTeamPermission('viewer', null, 'team.delete')).toBe(false)
  })

  it('team lead role adds permissions on top of org member', () => {
    expect(hasTeamPermission('member', 'lead', 'team.delete')).toBe(false)
    expect(hasTeamPermission('member', 'lead', 'team.settings.read')).toBe(true)
  })
})

describe('team permission listing', () => {
  it('combines org and team role permissions', () => {
    const perms = getTeamPermissions('member', 'lead')
    expect(perms).toContain('team.settings.update')
    expect(perms).toContain('team.read')
    expect(perms).not.toContain('team.delete')
  })

  it('returns only org permissions when no team role', () => {
    const perms = getTeamPermissions('member', null)
    expect(perms).toContain('team.read')
    expect(perms).toContain('team.create')
    expect(perms).not.toContain('team.update')
  })

  it('returns all for org owner with no team role', () => {
    const perms = getTeamPermissions('owner', null)
    expect(perms).toHaveLength(TEAM_ACTIONS.length)
  })
})
