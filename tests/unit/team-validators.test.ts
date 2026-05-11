import {
  createTeamSchema,
  updateTeamSchema,
  addTeamMemberSchema,
  updateTeamMemberRoleSchema,
} from '$lib/validators/team'
import { describe, expect, it } from 'vitest'

describe('createTeamSchema', () => {
  it('validates a valid team creation', () => {
    const result = createTeamSchema.safeParse({ name: 'Engineering' })
    expect(result.success).toBe(true)
  })

  it('allows optional description', () => {
    const result = createTeamSchema.safeParse({
      description: 'The engineering team',
      name: 'Engineering',
    })
    expect(result.success).toBe(true)
  })

  it('rejects empty name', () => {
    const result = createTeamSchema.safeParse({ name: '' })
    expect(result.success).toBe(false)
  })

  it('rejects missing name', () => {
    const result = createTeamSchema.safeParse({})
    expect(result.success).toBe(false)
  })

  it('rejects description over 500 chars', () => {
    const result = createTeamSchema.safeParse({
      description: 'a'.repeat(501),
      name: 'Team',
    })
    expect(result.success).toBe(false)
  })
})

describe('updateTeamSchema', () => {
  it('validates valid update', () => {
    const result = updateTeamSchema.safeParse({ name: 'Updated Team' })
    expect(result.success).toBe(true)
  })

  it('allows nullable description', () => {
    const result = updateTeamSchema.safeParse({ description: null, name: 'Team' })
    expect(result.success).toBe(true)
  })

  it('rejects empty name', () => {
    const result = updateTeamSchema.safeParse({ name: '' })
    expect(result.success).toBe(false)
  })
})

describe('addTeamMemberSchema', () => {
  it('validates with userId and default role', () => {
    const result = addTeamMemberSchema.safeParse({ userId: 'user-123' })
    expect(result.success).toBe(true)
  })

  it('defaults role to member', () => {
    const result = addTeamMemberSchema.safeParse({ userId: 'user-123' })
    expect(result.success && result.data.role).toBe('member')
  })

  it('accepts lead role', () => {
    const result = addTeamMemberSchema.safeParse({ role: 'lead', userId: 'user-123' })
    expect(result.success).toBe(true)
  })

  it('rejects invalid role', () => {
    const result = addTeamMemberSchema.safeParse({ role: 'admin', userId: 'user-123' })
    expect(result.success).toBe(false)
  })

  it('rejects missing userId', () => {
    const result = addTeamMemberSchema.safeParse({})
    expect(result.success).toBe(false)
  })
})

describe('updateTeamMemberRoleSchema', () => {
  it('accepts lead role', () => {
    const result = updateTeamMemberRoleSchema.safeParse({ role: 'lead' })
    expect(result.success).toBe(true)
  })

  it('accepts member role', () => {
    const result = updateTeamMemberRoleSchema.safeParse({ role: 'member' })
    expect(result.success).toBe(true)
  })

  it('rejects invalid role', () => {
    const result = updateTeamMemberRoleSchema.safeParse({ role: 'owner' })
    expect(result.success).toBe(false)
  })
})
