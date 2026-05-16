import {
  createOrganizationSchema,
  updateOrganizationSchema,
  updateMemberRoleSchema,
  inviteMemberSchema,
  transferOwnershipSchema,
} from '$lib/validators/organization'
import { describe, expect, it } from 'vitest'

describe('createOrganizationSchema', () => {
  it('accepts valid input with name only', () => {
    const result = createOrganizationSchema.safeParse({ name: 'My Org' })
    expect(result.success).toBe(true)
    expect(result.success && result.data.name).toBe('My Org')
    expect(result.success && result.data.description).toBeUndefined()
  })

  it('accepts valid input with name and description', () => {
    const result = createOrganizationSchema.safeParse({
      description: 'A great organization',
      name: 'My Org',
    })
    expect(result.success).toBe(true)
    expect(result.success && result.data.description).toBe('A great organization')
  })

  it('trims whitespace from name', () => {
    const result = createOrganizationSchema.safeParse({ name: '  My Org  ' })
    expect(result.success).toBe(true)
    expect(result.success && result.data.name).toBe('My Org')
  })

  it('trims whitespace from description', () => {
    const result = createOrganizationSchema.safeParse({
      description: '  Hello world  ',
      name: 'Org',
    })
    expect(result.success).toBe(true)
    expect(result.success && result.data.description).toBe('Hello world')
  })

  it('rejects empty name', () => {
    const result = createOrganizationSchema.safeParse({ name: '' })
    expect(result.success).toBe(false)
  })

  it('rejects whitespace-only name', () => {
    const result = createOrganizationSchema.safeParse({ name: '   ' })
    expect(result.success).toBe(false)
  })

  it('rejects missing name', () => {
    const result = createOrganizationSchema.safeParse({})
    expect(result.success).toBe(false)
  })

  it('rejects name exceeding 100 characters', () => {
    const result = createOrganizationSchema.safeParse({ name: 'a'.repeat(101) })
    expect(result.success).toBe(false)
  })

  it('accepts name at exactly 100 characters', () => {
    const result = createOrganizationSchema.safeParse({ name: 'a'.repeat(100) })
    expect(result.success).toBe(true)
  })

  it('rejects description exceeding 500 characters', () => {
    const result = createOrganizationSchema.safeParse({
      description: 'a'.repeat(501),
      name: 'Org',
    })
    expect(result.success).toBe(false)
  })

  it('accepts description at exactly 500 characters', () => {
    const result = createOrganizationSchema.safeParse({
      description: 'a'.repeat(500),
      name: 'Org',
    })
    expect(result.success).toBe(true)
  })

  it('rejects non-string name', () => {
    const result = createOrganizationSchema.safeParse({ name: 123 })
    expect(result.success).toBe(false)
  })

  it('rejects non-string description', () => {
    const result = createOrganizationSchema.safeParse({ description: 42, name: 'Org' })
    expect(result.success).toBe(false)
  })

  it('accepts empty string description (empty after trim)', () => {
    const result = createOrganizationSchema.safeParse({ description: '   ', name: 'Org' })
    // Empty string after trim is still a valid string, just empty
    expect(result.success).toBe(true)
  })

  it('allows unicode characters in name', () => {
    const result = createOrganizationSchema.safeParse({ name: 'Organización' })
    expect(result.success).toBe(true)
  })
})

describe('updateOrganizationSchema', () => {
  it('accepts valid input with name only', () => {
    const result = updateOrganizationSchema.safeParse({ name: 'Updated Org' })
    expect(result.success).toBe(true)
    expect(result.success && result.data.name).toBe('Updated Org')
  })

  it('accepts valid input with name and description', () => {
    const result = updateOrganizationSchema.safeParse({
      description: 'Updated description',
      name: 'Updated Org',
    })
    expect(result.success).toBe(true)
    expect(result.success && result.data.description).toBe('Updated description')
  })

  it('accepts null description', () => {
    const result = updateOrganizationSchema.safeParse({ description: null, name: 'Org' })
    expect(result.success).toBe(true)
    expect(result.success && result.data.description).toBeNull()
  })

  it('accepts missing description', () => {
    const result = updateOrganizationSchema.safeParse({ name: 'Org' })
    expect(result.success).toBe(true)
    expect(result.success && result.data.description).toBeUndefined()
  })

  it('trims whitespace from name', () => {
    const result = updateOrganizationSchema.safeParse({ name: '  Updated Org  ' })
    expect(result.success).toBe(true)
    expect(result.success && result.data.name).toBe('Updated Org')
  })

  it('trims whitespace from description', () => {
    const result = updateOrganizationSchema.safeParse({
      description: '  Trimmed  ',
      name: 'Org',
    })
    expect(result.success).toBe(true)
    expect(result.success && result.data.description).toBe('Trimmed')
  })

  it('rejects empty name', () => {
    const result = updateOrganizationSchema.safeParse({ name: '' })
    expect(result.success).toBe(false)
  })

  it('rejects whitespace-only name after trim', () => {
    const result = updateOrganizationSchema.safeParse({ name: '   ' })
    expect(result.success).toBe(false)
  })

  it('rejects missing name', () => {
    const result = updateOrganizationSchema.safeParse({})
    expect(result.success).toBe(false)
  })

  it('rejects name exceeding 100 characters', () => {
    const result = updateOrganizationSchema.safeParse({ name: 'b'.repeat(101) })
    expect(result.success).toBe(false)
  })

  it('accepts name at exactly 100 characters', () => {
    const result = updateOrganizationSchema.safeParse({ name: 'b'.repeat(100) })
    expect(result.success).toBe(true)
  })

  it('rejects description exceeding 500 characters', () => {
    const result = updateOrganizationSchema.safeParse({
      description: 'c'.repeat(501),
      name: 'Org',
    })
    expect(result.success).toBe(false)
  })

  it('accepts description at exactly 500 characters', () => {
    const result = updateOrganizationSchema.safeParse({
      description: 'c'.repeat(500),
      name: 'Org',
    })
    expect(result.success).toBe(true)
  })

  it('rejects non-string name', () => {
    const result = updateOrganizationSchema.safeParse({ name: null })
    expect(result.success).toBe(false)
  })

  it('rejects non-string non-null description', () => {
    const result = updateOrganizationSchema.safeParse({ description: 123, name: 'Org' })
    expect(result.success).toBe(false)
  })
})

describe('updateMemberRoleSchema', () => {
  const validRoles = ['owner', 'admin', 'member', 'viewer'] as const

  for (const role of validRoles) {
    it(`accepts role "${role}"`, () => {
      const result = updateMemberRoleSchema.safeParse({ role })
      expect(result.success).toBe(true)
      expect(result.success && result.data.role).toBe(role)
    })
  }

  it('rejects invalid role string', () => {
    const result = updateMemberRoleSchema.safeParse({ role: 'superadmin' })
    expect(result.success).toBe(false)
  })

  it('rejects empty string role', () => {
    const result = updateMemberRoleSchema.safeParse({ role: '' })
    expect(result.success).toBe(false)
  })

  it('rejects missing role', () => {
    const result = updateMemberRoleSchema.safeParse({})
    expect(result.success).toBe(false)
  })

  it('rejects numeric role', () => {
    const result = updateMemberRoleSchema.safeParse({ role: 1 })
    expect(result.success).toBe(false)
  })

  it('rejects null role', () => {
    const result = updateMemberRoleSchema.safeParse({ role: null })
    expect(result.success).toBe(false)
  })

  it('rejects case-sensitive mismatch (uppercase)', () => {
    const result = updateMemberRoleSchema.safeParse({ role: 'OWNER' })
    expect(result.success).toBe(false)
  })

  it('rejects case-sensitive mismatch (capitalized)', () => {
    const result = updateMemberRoleSchema.safeParse({ role: 'Admin' })
    expect(result.success).toBe(false)
  })
})

describe('inviteMemberSchema', () => {
  it('accepts valid email with default role', () => {
    const result = inviteMemberSchema.safeParse({ email: 'user@example.com' })
    expect(result.success).toBe(true)
    expect(result.success && result.data.email).toBe('user@example.com')
    expect(result.success && result.data.role).toBe('member')
  })

  it('defaults role to "member" when role is omitted', () => {
    const result = inviteMemberSchema.safeParse({ email: 'invite@test.org' })
    expect(result.success).toBe(true)
    expect(result.success && result.data.role).toBe('member')
  })

  it('accepts valid email with admin role', () => {
    const result = inviteMemberSchema.safeParse({ email: 'admin@test.com', role: 'admin' })
    expect(result.success).toBe(true)
    expect(result.success && result.data.role).toBe('admin')
  })

  it('accepts valid email with viewer role', () => {
    const result = inviteMemberSchema.safeParse({ email: 'viewer@test.com', role: 'viewer' })
    expect(result.success).toBe(true)
    expect(result.success && result.data.role).toBe('viewer')
  })

  it('accepts valid email with member role explicitly set', () => {
    const result = inviteMemberSchema.safeParse({ email: 'member@test.com', role: 'member' })
    expect(result.success).toBe(true)
    expect(result.success && result.data.role).toBe('member')
  })

  it('accepts email with subaddressing (plus tag)', () => {
    const result = inviteMemberSchema.safeParse({ email: 'user+tag@example.com' })
    expect(result.success).toBe(true)
  })

  it('accepts email with dots in local part', () => {
    const result = inviteMemberSchema.safeParse({ email: 'first.last@domain.com' })
    expect(result.success).toBe(true)
  })

  it('rejects invalid email format', () => {
    const result = inviteMemberSchema.safeParse({ email: 'not-an-email' })
    expect(result.success).toBe(false)
  })

  it('rejects email missing domain', () => {
    const result = inviteMemberSchema.safeParse({ email: 'user@' })
    expect(result.success).toBe(false)
  })

  it('rejects email missing local part', () => {
    const result = inviteMemberSchema.safeParse({ email: '@domain.com' })
    expect(result.success).toBe(false)
  })

  it('rejects empty email', () => {
    const result = inviteMemberSchema.safeParse({ email: '' })
    expect(result.success).toBe(false)
  })

  it('rejects missing email', () => {
    const result = inviteMemberSchema.safeParse({})
    expect(result.success).toBe(false)
  })

  it('rejects non-string email', () => {
    const result = inviteMemberSchema.safeParse({ email: 12345 })
    expect(result.success).toBe(false)
  })

  it('rejects "owner" role (not in invite role enum)', () => {
    const result = inviteMemberSchema.safeParse({ email: 'user@test.com', role: 'owner' })
    expect(result.success).toBe(false)
  })

  it('rejects invalid role string', () => {
    const result = inviteMemberSchema.safeParse({ email: 'user@test.com', role: 'superadmin' })
    expect(result.success).toBe(false)
  })

  it('rejects case-sensitive role mismatch', () => {
    const result = inviteMemberSchema.safeParse({ email: 'user@test.com', role: 'Admin' })
    expect(result.success).toBe(false)
  })

  it('rejects empty string role', () => {
    const result = inviteMemberSchema.safeParse({ email: 'user@test.com', role: '' })
    expect(result.success).toBe(false)
  })
})

describe('transferOwnershipSchema', () => {
  it('accepts valid newOwnerId', () => {
    const result = transferOwnershipSchema.safeParse({ newOwnerId: 'user-uuid-123' })
    expect(result.success).toBe(true)
    expect(result.success && result.data.newOwnerId).toBe('user-uuid-123')
  })

  it('accepts single character newOwnerId', () => {
    const result = transferOwnershipSchema.safeParse({ newOwnerId: 'a' })
    expect(result.success).toBe(true)
  })

  it('accepts uuid-format newOwnerId', () => {
    const result = transferOwnershipSchema.safeParse({
      newOwnerId: '01912345-6789-7abc-def0-123456789abc',
    })
    expect(result.success).toBe(true)
  })

  it('rejects empty string newOwnerId', () => {
    const result = transferOwnershipSchema.safeParse({ newOwnerId: '' })
    expect(result.success).toBe(false)
  })

  it('rejects whitespace-only newOwnerId (trim strips to empty)', () => {
    const result = transferOwnershipSchema.safeParse({ newOwnerId: '   ' })
    expect(result.success).toBe(false)
  })

  it('rejects missing newOwnerId', () => {
    const result = transferOwnershipSchema.safeParse({})
    expect(result.success).toBe(false)
  })

  it('rejects non-string newOwnerId', () => {
    const result = transferOwnershipSchema.safeParse({ newOwnerId: 123 })
    expect(result.success).toBe(false)
  })

  it('rejects null newOwnerId', () => {
    const result = transferOwnershipSchema.safeParse({ newOwnerId: null })
    expect(result.success).toBe(false)
  })
})
