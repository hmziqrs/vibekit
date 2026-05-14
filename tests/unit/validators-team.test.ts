import {
  addTeamMemberSchema,
  createTeamSchema,
  updateTeamMemberRoleSchema,
  updateTeamSchema,
} from '$lib/validators/team'
import { describe, expect, it } from 'vitest'

describe('createTeamSchema', () => {
  it('accepts valid team name', () => {
    const result = createTeamSchema.safeParse({ name: 'Engineering' })
    expect(result.success).toBe(true)
  })

  it('accepts team with description', () => {
    const result = createTeamSchema.safeParse({ description: 'The eng team', name: 'Engineering' })
    expect(result.success).toBe(true)
  })

  it('trims whitespace from fields', () => {
    const data = createTeamSchema.parse({ description: '  desc  ', name: '  Team  ' })
    expect(data.name).toBe('Team')
    expect(data.description).toBe('desc')
  })

  it('rejects empty name', () => {
    const result = createTeamSchema.safeParse({ name: '' })
    expect(result.success).toBe(false)
  })

  it('rejects missing name', () => {
    const result = createTeamSchema.safeParse({})
    expect(result.success).toBe(false)
  })

  it('rejects description exceeding 500 chars', () => {
    const result = createTeamSchema.safeParse({ description: 'a'.repeat(501), name: 'Team' })
    expect(result.success).toBe(false)
  })
})

describe('updateTeamSchema', () => {
  it('accepts valid update', () => {
    const result = updateTeamSchema.safeParse({ name: 'Updated Team' })
    expect(result.success).toBe(true)
  })

  it('accepts nullable description', () => {
    const result = updateTeamSchema.safeParse({ description: null, name: 'Team' })
    expect(result.success).toBe(true)
  })

  it('trims whitespace', () => {
    const data = updateTeamSchema.parse({ description: '  desc  ', name: '  Team  ' })
    expect(data.name).toBe('Team')
    expect(data.description).toBe('desc')
  })

  it('rejects empty name', () => {
    const result = updateTeamSchema.safeParse({ name: '' })
    expect(result.success).toBe(false)
  })

  it('rejects name exceeding 100 chars', () => {
    const result = updateTeamSchema.safeParse({ name: 'a'.repeat(101) })
    expect(result.success).toBe(false)
  })

  it('rejects description exceeding 500 chars', () => {
    const result = updateTeamSchema.safeParse({ description: 'a'.repeat(501), name: 'Team' })
    expect(result.success).toBe(false)
  })
})

describe('addTeamMemberSchema', () => {
  it('accepts valid input with userId', () => {
    const result = addTeamMemberSchema.safeParse({ userId: 'user-123' })
    expect(result.success).toBe(true)
  })

  it('defaults role to member', () => {
    const data = addTeamMemberSchema.parse({ userId: 'user-123' })
    expect(data.role).toBe('member')
  })

  it('accepts lead role', () => {
    const result = addTeamMemberSchema.safeParse({ role: 'lead', userId: 'user-123' })
    expect(result.success).toBe(true)
  })

  it('rejects empty userId', () => {
    const result = addTeamMemberSchema.safeParse({ userId: '' })
    expect(result.success).toBe(false)
  })

  it('rejects missing userId', () => {
    const result = addTeamMemberSchema.safeParse({})
    expect(result.success).toBe(false)
  })

  it('rejects invalid role', () => {
    const result = addTeamMemberSchema.safeParse({ role: 'admin', userId: 'user-123' })
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

  it('rejects missing role', () => {
    const result = updateTeamMemberRoleSchema.safeParse({})
    expect(result.success).toBe(false)
  })
})
