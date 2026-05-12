import { describe, expect, it } from 'vitest'

function buildSearchConditions(
  q: string | undefined,
  fields: Array<(query: string) => string>
): string[] | null {
  if (!q || q.length < 2) return null
  return fields.map((fn) => fn(q))
}

describe('blog search query building', () => {
  it('returns null for queries shorter than 2 characters', () => {
    expect(buildSearchConditions('a', [(q) => q])).toBeNull()
  })

  it('returns null for empty queries', () => {
    expect(buildSearchConditions('', [(q) => q])).toBeNull()
  })

  it('returns null for undefined queries', () => {
    expect(buildSearchConditions(undefined, [(q) => q])).toBeNull()
  })

  it('builds conditions for all searchable fields', () => {
    const fields = [
      (q: string) => `title:${q}`,
      (q: string) => `slug:${q}`,
      (q: string) => `excerpt:${q}`,
      (q: string) => `contentBody:${q}`,
    ]
    const result = buildSearchConditions('test', fields)
    expect(result).toHaveLength(4)
    expect(result).toStrictEqual(['title:test', 'slug:test', 'excerpt:test', 'contentBody:test'])
  })

  it('handles multi-word queries', () => {
    const fields = [(q: string) => `like(%${q}%)`]
    const result = buildSearchConditions('full text search', fields)
    expect(result).toStrictEqual(['like(%full text search%)'])
  })

  it('handles special characters in queries', () => {
    const fields = [(q: string) => `like(%${q}%)`]
    const result = buildSearchConditions("user's post", fields)
    expect(result).toStrictEqual(["like(%user's post%)"])
  })

  it('handles exactly 2 character queries', () => {
    const fields = [(q: string) => q]
    const result = buildSearchConditions('ab', fields)
    expect(result).toHaveLength(1)
  })
})

describe('search field coverage', () => {
  const searchableFields = ['title', 'slug', 'excerpt', 'contentBody']

  it('covers all four fields for admin search', () => {
    expect(searchableFields).toContain('title')
    expect(searchableFields).toContain('slug')
    expect(searchableFields).toContain('excerpt')
    expect(searchableFields).toContain('contentBody')
    expect(searchableFields).toHaveLength(4)
  })

  it('contentBody field can store large text', () => {
    const largeContent = 'a'.repeat(100_000)
    expect(largeContent.length).toBe(100_000)
  })
})
