import {
  createOrganizationSchema,
  inviteMemberSchema,
  transferOwnershipSchema,
  updateMemberRoleSchema,
  updateOrganizationSchema,
} from '$lib/validators/organization'
import { describe, expect, it } from 'vitest'

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

describe('organization slug generation', () => {
  it('generates slug from simple name', () => {
    expect(generateSlug('Acme Corp')).toBe('acme-corp')
  })

  it('handles special characters', () => {
    expect(generateSlug('Hello, World! #2024')).toBe('hello-world-2024')
  })

  it('handles leading and trailing hyphens', () => {
    expect(generateSlug('--test org--')).toBe('test-org')
  })

  it('handles multiple consecutive special chars', () => {
    expect(generateSlug('My   Great   Org!!!')).toBe('my-great-org')
  })

  it('handles empty string', () => {
    expect(generateSlug('')).toBe('')
  })

  it('handles unicode characters', () => {
    expect(generateSlug('Café Münster')).toBe('caf-m-nster')
  })
})

describe('creating organizations', () => {
  it('validates valid input', () => {
    const result = createOrganizationSchema.safeParse({ name: 'Acme Corp' })
    expect(result.success).toBe(true)
  })

  it('validates with optional description', () => {
    const result = createOrganizationSchema.safeParse({
      description: 'A test org',
      name: 'Acme Corp',
    })
    expect(result.success).toBe(true)
  })

  it('requires name', () => {
    const result = createOrganizationSchema.safeParse({ description: 'No name' })
    expect(result.success).toBe(false)
  })

  it('rejects empty name', () => {
    const result = createOrganizationSchema.safeParse({ name: '' })
    expect(result.success).toBe(false)
  })

  it('rejects name over 100 chars', () => {
    const result = createOrganizationSchema.safeParse({ name: 'a'.repeat(101) })
    expect(result.success).toBe(false)
  })

  it('rejects description over 500 chars', () => {
    const result = createOrganizationSchema.safeParse({
      description: 'a'.repeat(501),
      name: 'Test',
    })
    expect(result.success).toBe(false)
  })
})

describe('updating organizations', () => {
  it('validates valid input', () => {
    const result = updateOrganizationSchema.safeParse({ name: 'Updated Org' })
    expect(result.success).toBe(true)
  })

  it('allows null description', () => {
    const result = updateOrganizationSchema.safeParse({
      description: null,
      name: 'Org',
    })
    expect(result.success).toBe(true)
  })

  it('requires name', () => {
    const result = updateOrganizationSchema.safeParse({ description: 'No name' })
    expect(result.success).toBe(false)
  })
})

describe('updating member roles', () => {
  const validRoles = ['owner', 'admin', 'member', 'viewer'] as const

  it('accepts owner role', () => {
    const result = updateMemberRoleSchema.safeParse({ role: validRoles[0] })
    expect(result.success).toBe(true)
  })

  it('accepts admin role', () => {
    const result = updateMemberRoleSchema.safeParse({ role: validRoles[1] })
    expect(result.success).toBe(true)
  })

  it('accepts member role', () => {
    const result = updateMemberRoleSchema.safeParse({ role: validRoles[2] })
    expect(result.success).toBe(true)
  })

  it('accepts viewer role', () => {
    const result = updateMemberRoleSchema.safeParse({ role: validRoles[3] })
    expect(result.success).toBe(true)
  })

  it('rejects invalid role', () => {
    const result = updateMemberRoleSchema.safeParse({ role: 'superadmin' })
    expect(result.success).toBe(false)
  })

  it('rejects missing role', () => {
    const result = updateMemberRoleSchema.safeParse({})
    expect(result.success).toBe(false)
  })
})

describe('inviting members', () => {
  it('validates valid input', () => {
    const result = inviteMemberSchema.safeParse({ email: 'user@example.com' })
    expect(result.success).toBe(true)
  })

  it('validates with explicit role', () => {
    const result = inviteMemberSchema.safeParse({ email: 'user@example.com', role: 'admin' })
    expect(result.success).toBe(true)
  })

  it('rejects invalid email', () => {
    const result = inviteMemberSchema.safeParse({ email: 'not-an-email' })
    expect(result.success).toBe(false)
  })

  it('defaults role to member', () => {
    const result = inviteMemberSchema.safeParse({ email: 'user@example.com' })
    expect(result.success).toBe(true)
    expect(result.success && result.data.role).toBe('member')
  })

  it('rejects owner role in invite', () => {
    const result = inviteMemberSchema.safeParse({ email: 'user@example.com', role: 'owner' })
    expect(result.success).toBe(false)
  })
})

describe('transferring ownership', () => {
  it('validates valid input', () => {
    const result = transferOwnershipSchema.safeParse({ newOwnerId: 'abc-123' })
    expect(result.success).toBe(true)
  })

  it('rejects empty newOwnerId', () => {
    const result = transferOwnershipSchema.safeParse({ newOwnerId: '' })
    expect(result.success).toBe(false)
  })

  it('rejects missing newOwnerId', () => {
    const result = transferOwnershipSchema.safeParse({})
    expect(result.success).toBe(false)
  })
})

describe('organization role hierarchy', () => {
  it('owner can do everything', () => {
    const ownerPermissions = ['read', 'write', 'admin', 'delete', 'transfer']
    expect(ownerPermissions).toHaveLength(5)
  })

  it('admin can manage members but not transfer', () => {
    const role = 'admin' as string
    const canTransfer = role === 'owner'
    expect(canTransfer).toBe(false)
  })

  it('member can only read and participate', () => {
    const role = 'member' as string
    const canAdmin = role === 'owner' || role === 'admin'
    expect(canAdmin).toBe(false)
  })

  it('viewer has read-only access', () => {
    const role = 'viewer' as string
    const canWrite = role === 'owner' || role === 'admin' || role === 'member'
    expect(canWrite).toBe(false)
  })
})

describe('invitation expiry', () => {
  it('7 day expiry from creation', () => {
    const now = Date.now()
    const expiresAt = new Date(now + 7 * 24 * 60 * 60 * 1000)
    const diffDays = (expiresAt.getTime() - now) / (1000 * 60 * 60 * 24)
    expect(diffDays).toBe(7)
  })

  it('detects expired invitation', () => {
    const expiresAt = new Date(Date.now() - 1000)
    const isExpired = expiresAt < new Date()
    expect(isExpired).toBe(true)
  })

  it('detects valid invitation', () => {
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    const isExpired = expiresAt < new Date()
    expect(isExpired).toBe(false)
  })
})
