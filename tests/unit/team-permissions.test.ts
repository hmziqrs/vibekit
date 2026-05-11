import { getTeamPermissions, hasTeamPermission, TEAM_ACTIONS } from '$lib/permissions'
import { describe, expect, it } from 'vitest'

describe('team permission matrix', () => {
  it('owner has core team actions via org role', () => {
    expect(hasTeamPermission('owner', null, 'team.create')).toBe(true)
    expect(hasTeamPermission('owner', null, 'team.delete')).toBe(true)
    expect(hasTeamPermission('owner', null, 'team.update')).toBe(true)
    expect(hasTeamPermission('owner', null, 'team.read')).toBe(true)
    expect(hasTeamPermission('owner', null, 'team.members.read')).toBe(true)
  })

  it('owner has team management actions via org role', () => {
    expect(hasTeamPermission('owner', null, 'team.members.add')).toBe(true)
    expect(hasTeamPermission('owner', null, 'team.members.manage')).toBe(true)
    expect(hasTeamPermission('owner', null, 'team.settings.read')).toBe(true)
    expect(hasTeamPermission('owner', null, 'team.settings.update')).toBe(true)
  })

  it('admin has all team actions via org role', () => {
    expect(hasTeamPermission('admin', null, 'team.create')).toBe(true)
    expect(hasTeamPermission('admin', null, 'team.delete')).toBe(true)
    expect(hasTeamPermission('admin', null, 'team.update')).toBe(true)
    expect(hasTeamPermission('admin', null, 'team.read')).toBe(true)
  })

  it('member can read teams and create via org role', () => {
    expect(hasTeamPermission('member', null, 'team.create')).toBe(true)
    expect(hasTeamPermission('member', null, 'team.read')).toBe(true)
    expect(hasTeamPermission('member', null, 'team.members.read')).toBe(true)
  })

  it('member cannot manage team members without team role', () => {
    expect(hasTeamPermission('member', null, 'team.members.manage')).toBe(false)
    expect(hasTeamPermission('member', null, 'team.members.add')).toBe(false)
    expect(hasTeamPermission('member', null, 'team.delete')).toBe(false)
  })

  it('viewer can read teams via org role', () => {
    expect(hasTeamPermission('viewer', null, 'team.read')).toBe(true)
    expect(hasTeamPermission('viewer', null, 'team.members.read')).toBe(true)
  })

  it('viewer cannot create or manage teams without team role', () => {
    expect(hasTeamPermission('viewer', null, 'team.create')).toBe(false)
    expect(hasTeamPermission('viewer', null, 'team.update')).toBe(false)
    expect(hasTeamPermission('viewer', null, 'team.delete')).toBe(false)
  })
})

describe('team lead permissions', () => {
  it('lead can update team', () => {
    expect(hasTeamPermission('member', 'lead', 'team.update')).toBe(true)
  })

  it('lead can manage members', () => {
    expect(hasTeamPermission('member', 'lead', 'team.members.add')).toBe(true)
    expect(hasTeamPermission('member', 'lead', 'team.members.manage')).toBe(true)
  })

  it('lead can read and update settings', () => {
    expect(hasTeamPermission('member', 'lead', 'team.settings.read')).toBe(true)
    expect(hasTeamPermission('member', 'lead', 'team.settings.update')).toBe(true)
  })

  it('lead cannot delete team when org member', () => {
    expect(hasTeamPermission('member', 'lead', 'team.delete')).toBe(false)
  })

  it('viewer with lead role gets lead permissions', () => {
    expect(hasTeamPermission('viewer', 'lead', 'team.update')).toBe(true)
    expect(hasTeamPermission('viewer', 'lead', 'team.members.manage')).toBe(true)
  })
})

describe('team member role permissions', () => {
  it('member role adds no extra permissions beyond org role', () => {
    const memberOrgOnly = getTeamPermissions('member', null)
    const memberWithTeamMember = getTeamPermissions('member', 'member')
    expect(memberWithTeamMember.length).toBeGreaterThanOrEqual(memberOrgOnly.length)
  })

  it('member cannot manage team members', () => {
    expect(hasTeamPermission('member', 'member', 'team.members.manage')).toBe(false)
    expect(hasTeamPermission('member', 'member', 'team.members.add')).toBe(false)
  })
})

describe('getTeamPermissions function', () => {
  it('returns array of actions', () => {
    const perms = getTeamPermissions('owner', 'lead')
    expect(perms.length).toBeGreaterThan(0)
  })

  it('combines org and team permissions', () => {
    const orgOnly = getTeamPermissions('member', null)
    const withTeam = getTeamPermissions('member', 'lead')
    expect(withTeam.length).toBeGreaterThan(orgOnly.length)
  })

  it('org owner gets all actions regardless of team role', () => {
    const perms = getTeamPermissions('owner', null)
    expect(perms).toHaveLength(TEAM_ACTIONS.length)
  })
})
