import { describe, expect, it } from 'vitest'

describe('organization validators', () => {
  it('createOrganizationSchema accepts valid input', async () => {
    const { createOrganizationSchema } = await import('$lib/validators/organization')
    const result = createOrganizationSchema.safeParse({ name: 'My Org', description: 'A test org' })
    expect(result.success).toBe(true)
  })

  it('createOrganizationSchema rejects empty name', async () => {
    const { createOrganizationSchema } = await import('$lib/validators/organization')
    const result = createOrganizationSchema.safeParse({ name: '', description: '' })
    expect(result.success).toBe(false)
  })

  it('createOrganizationSchema rejects name over 100 chars', async () => {
    const { createOrganizationSchema } = await import('$lib/validators/organization')
    const result = createOrganizationSchema.safeParse({ name: 'a'.repeat(101) })
    expect(result.success).toBe(false)
  })

  it('createOrganizationSchema rejects description over 500 chars', async () => {
    const { createOrganizationSchema } = await import('$lib/validators/organization')
    const result = createOrganizationSchema.safeParse({
      description: 'd'.repeat(501),
      name: 'Valid Name',
    })
    expect(result.success).toBe(false)
  })

  it('updateOrganizationSchema accepts valid input', async () => {
    const { updateOrganizationSchema } = await import('$lib/validators/organization')
    const result = updateOrganizationSchema.safeParse({ name: 'Updated', description: null })
    expect(result.success).toBe(true)
  })

  it('inviteMemberSchema accepts valid email and role', async () => {
    const { inviteMemberSchema } = await import('$lib/validators/organization')
    const result = inviteMemberSchema.safeParse({
      email: 'user@test.com',
      role: 'admin',
    })
    expect(result.success).toBe(true)
  })

  it('inviteMemberSchema rejects invalid email', async () => {
    const { inviteMemberSchema } = await import('$lib/validators/organization')
    const result = inviteMemberSchema.safeParse({ email: 'not-an-email', role: 'member' })
    expect(result.success).toBe(false)
  })

  it('inviteMemberSchema rejects invalid role', async () => {
    const { inviteMemberSchema } = await import('$lib/validators/organization')
    const result = inviteMemberSchema.safeParse({
      email: 'user@test.com',
      role: 'superadmin',
    })
    expect(result.success).toBe(false)
  })
})

describe('team validators', () => {
  it('createTeamSchema accepts valid input', async () => {
    const { createTeamSchema } = await import('$lib/validators/team')
    const result = createTeamSchema.safeParse({ name: 'My Team', description: 'A test team' })
    expect(result.success).toBe(true)
  })

  it('createTeamSchema rejects empty name', async () => {
    const { createTeamSchema } = await import('$lib/validators/team')
    const result = createTeamSchema.safeParse({ name: '' })
    expect(result.success).toBe(false)
  })

  it('createTeamSchema rejects description over 500 chars', async () => {
    const { createTeamSchema } = await import('$lib/validators/team')
    const result = createTeamSchema.safeParse({
      description: 'd'.repeat(501),
      name: 'Valid Name',
    })
    expect(result.success).toBe(false)
  })

  it('updateTeamSchema accepts valid input', async () => {
    const { updateTeamSchema } = await import('$lib/validators/team')
    const result = updateTeamSchema.safeParse({ name: 'Updated', description: null })
    expect(result.success).toBe(true)
  })

  it('addTeamMemberSchema accepts valid input', async () => {
    const { addTeamMemberSchema } = await import('$lib/validators/team')
    const result = addTeamMemberSchema.safeParse({ userId: 'user-123', role: 'lead' })
    expect(result.success).toBe(true)
  })

  it('addTeamMemberSchema rejects empty userId', async () => {
    const { addTeamMemberSchema } = await import('$lib/validators/team')
    const result = addTeamMemberSchema.safeParse({ userId: '', role: 'member' })
    expect(result.success).toBe(false)
  })

  it('addTeamMemberSchema rejects invalid role', async () => {
    const { addTeamMemberSchema } = await import('$lib/validators/team')
    const result = addTeamMemberSchema.safeParse({ userId: 'user-123', role: 'admin' })
    expect(result.success).toBe(false)
  })

  it('updateTeamMemberRoleSchema accepts valid role', async () => {
    const { updateTeamMemberRoleSchema } = await import('$lib/validators/team')
    const result = updateTeamMemberRoleSchema.safeParse({ role: 'lead' })
    expect(result.success).toBe(true)
  })

  it('updateTeamMemberRoleSchema rejects invalid role', async () => {
    const { updateTeamMemberRoleSchema } = await import('$lib/validators/team')
    const result = updateTeamMemberRoleSchema.safeParse({ role: 'admin' })
    expect(result.success).toBe(false)
  })
})

describe('item validators', () => {
  it('createItemSchema allows description up to 2000 chars', async () => {
    const { createItemSchema } = await import('$lib/validators/item')
    const result = createItemSchema.safeParse({
      description: 'd'.repeat(2000),
      name: 'Valid Item',
    })
    expect(result.success).toBe(true)
  })

  it('createItemSchema rejects description over 2000 chars', async () => {
    const { createItemSchema } = await import('$lib/validators/item')
    const result = createItemSchema.safeParse({
      description: 'd'.repeat(2001),
      name: 'Valid Item',
    })
    expect(result.success).toBe(false)
  })

  it('updateItemSchema allows description up to 2000 chars', async () => {
    const { updateItemSchema } = await import('$lib/validators/item')
    const result = updateItemSchema.safeParse({
      description: 'd'.repeat(2000),
      name: 'Valid Item',
    })
    expect(result.success).toBe(true)
  })

  it('updateItemSchema rejects description over 2000 chars', async () => {
    const { updateItemSchema } = await import('$lib/validators/item')
    const result = updateItemSchema.safeParse({
      description: 'd'.repeat(2001),
      name: 'Valid Item',
    })
    expect(result.success).toBe(false)
  })
})
