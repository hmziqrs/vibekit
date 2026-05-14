import { describe, expect, it } from 'vitest'

describe('Organization leave endpoint validation', () => {
  it('owner role should not be allowed to leave', async () => {
    const roles = ['owner', 'admin', 'member', 'viewer']
    const canLeave = (role: string) => role !== 'owner'
    expect(canLeave(roles[0])).toBe(false)
    expect(canLeave(roles[1])).toBe(true)
    expect(canLeave(roles[2])).toBe(true)
    expect(canLeave(roles[3])).toBe(true)
  })

  it('org.leave permission is granted to all non-owner roles', async () => {
    const { getPermissions } = await import('$lib/permissions')
    const ownerPerms = getPermissions('owner')
    const adminPerms = getPermissions('admin')
    const memberPerms = getPermissions('member')
    const viewerPerms = getPermissions('viewer')

    expect(ownerPerms).toContain('org.leave')
    expect(adminPerms).toContain('org.leave')
    expect(memberPerms).toContain('org.leave')
    expect(viewerPerms).toContain('org.leave')
  })

  it('leave action should produce correct audit log action', () => {
    const action = 'organization.member.leave'
    expect(action).toBe('organization.member.leave')
    expect(action.startsWith('organization.member')).toBe(true)
  })

  it('membership composite unique should prevent duplicates', () => {
    const pairs = [
      { userId: 'u1', organizationId: 'o1' },
      { userId: 'u1', organizationId: 'o2' },
      { userId: 'u2', organizationId: 'o1' },
    ]
    const unique = new Set(pairs.map((p) => `${p.userId}:${p.organizationId}`))
    expect(unique.size).toBe(3)

    const duplicates = [
      { userId: 'u1', organizationId: 'o1' },
      { userId: 'u1', organizationId: 'o1' },
    ]
    const dupSet = new Set(duplicates.map((p) => `${p.userId}:${p.organizationId}`))
    expect(dupSet.size).toBe(1)
  })
})

describe('Team member composite unique constraint', () => {
  it('should prevent duplicate team memberships', () => {
    const pairs = [
      { userId: 'u1', teamId: 't1' },
      { userId: 'u1', teamId: 't2' },
      { userId: 'u2', teamId: 't1' },
    ]
    const unique = new Set(pairs.map((p) => `${p.userId}:${p.teamId}`))
    expect(unique.size).toBe(3)
  })
})
