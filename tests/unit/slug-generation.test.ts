import { describe, expect, it } from 'vitest'

// Replicate the slug generation logic from src/lib/server/hono/index.ts
function generateSlug(name: string): string {
  const slug = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  return slug || `org-fallback`
}

describe('generateSlug', () => {
  it('converts ASCII names to slugs', () => {
    expect(generateSlug('My Organization')).toBe('my-organization')
  })

  it('handles special characters', () => {
    expect(generateSlug('Hello & World!')).toBe('hello-world')
  })

  it('handles multiple spaces and hyphens', () => {
    expect(generateSlug('  My   Cool   Org  ')).toBe('my-cool-org')
  })

  it('handles leading/trailing special chars', () => {
    expect(generateSlug('---test---')).toBe('test')
  })

  it('handles mixed case', () => {
    expect(generateSlug('MyCoolApp')).toBe('mycoolapp')
  })

  it('handles numbers', () => {
    expect(generateSlug('Org 123')).toBe('org-123')
  })

  it('falls back for non-Latin characters (Arabic)', () => {
    const result = generateSlug('مؤسستي')
    expect(result).toMatch(/^org-fallback/)
  })

  it('falls back for non-Latin characters (Chinese)', () => {
    const result = generateSlug('我的组织')
    expect(result).toMatch(/^org-fallback/)
  })

  it('falls back for non-Latin characters (Japanese)', () => {
    const result = generateSlug('私の組織')
    expect(result).toMatch(/^org-fallback/)
  })

  it('handles mixed Latin and non-Latin', () => {
    expect(generateSlug('MyOrg 私の組織')).toBe('myorg')
  })

  it('handles empty string', () => {
    const result = generateSlug('')
    expect(result).toMatch(/^org-fallback/)
  })

  it('handles only special characters', () => {
    const result = generateSlug('!@#$%')
    expect(result).toMatch(/^org-fallback/)
  })
})
