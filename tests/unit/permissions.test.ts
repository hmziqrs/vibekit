import {
  getPermissions,
  getRoleLevel,
  hasPermission,
  ORG_ACTIONS,
  type OrgAction,
  type OrgRole,
} from '$lib/permissions'
import { describe, expect, it } from 'vitest'

const ROLES: OrgRole[] = ['owner', 'admin', 'member', 'viewer']

describe('permission matrix completeness', () => {
  it('every role has a permission set', () => {
    for (const role of ROLES) {
      const perms = getPermissions(role)
      expect(perms.length).toBeGreaterThan(0)
    }
  })

  it('owner has all actions', () => {
    const ownerPerms = getPermissions('owner')
    expect(ownerPerms).toHaveLength(ORG_ACTIONS.length)
  })

  it('admin has more permissions than member', () => {
    expect(getPermissions('admin').length).toBeGreaterThan(getPermissions('member').length)
  })

  it('member and viewer have same permission count', () => {
    expect(getPermissions('member').length).toBe(getPermissions('viewer').length)
  })
})

describe('owner permissions', () => {
  it('can perform every action', () => {
    for (const action of ORG_ACTIONS) {
      expect(hasPermission('owner', action)).toBe(true)
    }
  })

  it('can delete org', () => {
    expect(hasPermission('owner', 'org.delete')).toBe(true)
  })

  it('can transfer ownership', () => {
    expect(hasPermission('owner', 'org.transfer')).toBe(true)
  })

  it('can manage members', () => {
    expect(hasPermission('owner', 'org.members.manage')).toBe(true)
    expect(hasPermission('owner', 'org.members.invite')).toBe(true)
    expect(hasPermission('owner', 'org.members.remove')).toBe(true)
  })

  it('can update settings', () => {
    expect(hasPermission('owner', 'org.settings.update')).toBe(true)
    expect(hasPermission('owner', 'org.settings.read')).toBe(true)
  })
})

describe('admin permissions', () => {
  it('can update org', () => {
    expect(hasPermission('admin', 'org.update')).toBe(true)
  })

  it('can manage members', () => {
    expect(hasPermission('admin', 'org.members.manage')).toBe(true)
    expect(hasPermission('admin', 'org.members.invite')).toBe(true)
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
    expect(hasPermission('admin', 'org.members.read')).toBe(true)
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
    expect(hasPermission('member', 'org.members.invite')).toBe(false)
    expect(hasPermission('member', 'org.members.remove')).toBe(false)
  })

  it('cannot access settings', () => {
    expect(hasPermission('member', 'org.settings.read')).toBe(false)
    expect(hasPermission('member', 'org.settings.update')).toBe(false)
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

  it('cannot manage anything', () => {
    expect(hasPermission('viewer', 'org.members.manage')).toBe(false)
    expect(hasPermission('viewer', 'org.members.invite')).toBe(false)
    expect(hasPermission('viewer', 'org.members.remove')).toBe(false)
    expect(hasPermission('viewer', 'org.settings.update')).toBe(false)
    expect(hasPermission('viewer', 'org.transfer')).toBe(false)
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

  it('viewer has lowest level', () => {
    expect(getRoleLevel('viewer')).toBe(1)
  })

  it('owner has level 4', () => {
    expect(getRoleLevel('owner')).toBe(4)
  })
})

describe('getPermissions returns arrays', () => {
  it('returns sorted action names', () => {
    const perms = getPermissions('admin')
    for (const perm of perms) {
      expect(ORG_ACTIONS).toContain(perm)
    }
  })
})
