import {
  deleteIndexSchema,
  indexDocumentSchema,
  reindexSchema,
  searchSchema,
} from '$lib/validators/search'
import { describe, expect, it } from 'vitest'

describe('search Validators', () => {
  describe('searchSchema', () => {
    it('validates a valid search query', () => {
      const result = searchSchema.safeParse({ query: 'hello world' })
      expect(result.success).toBe(true)
    })

    it('validates with options', () => {
      const result = searchSchema.safeParse({
        limit: 10,
        offset: 0,
        query: 'test',
        types: ['blog_post'],
      })
      expect(result.success).toBe(true)
    })

    it('rejects empty query', () => {
      const result = searchSchema.safeParse({ query: '' })
      expect(result.success).toBe(false)
    })

    it('rejects query over 500 chars', () => {
      const result = searchSchema.safeParse({ query: 'a'.repeat(501) })
      expect(result.success).toBe(false)
    })

    it('rejects limit over 100', () => {
      const result = searchSchema.safeParse({ limit: 101, query: 'test' })
      expect(result.success).toBe(false)
    })

    it('trims whitespace from query', () => {
      const result = searchSchema.safeParse({ query: '  test  ' })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.query).toBe('test')
      }
    })
  })

  describe('indexDocumentSchema', () => {
    it('validates a valid document', () => {
      const result = indexDocumentSchema.safeParse({
        content: 'This is the content of the document',
        entityId: 'post-123',
        entityType: 'blog_post',
        title: 'My Blog Post',
      })
      expect(result.success).toBe(true)
    })

    it('validates with metadata', () => {
      const result = indexDocumentSchema.safeParse({
        content: 'Content here',
        entityId: 'item-1',
        entityType: 'item',
        metadata: { author: 'John', tags: ['tech'] },
        title: 'Test Item',
      })
      expect(result.success).toBe(true)
    })

    it('rejects missing title', () => {
      const result = indexDocumentSchema.safeParse({
        content: 'Content',
        entityId: 'id-1',
        entityType: 'type',
      })
      expect(result.success).toBe(false)
    })

    it('rejects missing content', () => {
      const result = indexDocumentSchema.safeParse({
        entityId: 'id-1',
        entityType: 'type',
        title: 'Title',
      })
      expect(result.success).toBe(false)
    })

    it('rejects content over 50000 chars', () => {
      const result = indexDocumentSchema.safeParse({
        content: 'x'.repeat(50_001),
        entityId: 'id-1',
        entityType: 'type',
        title: 'Title',
      })
      expect(result.success).toBe(false)
    })
  })

  describe('deleteIndexSchema', () => {
    it('validates deletion params', () => {
      const result = deleteIndexSchema.safeParse({
        entityId: 'post-1',
        entityType: 'blog_post',
      })
      expect(result.success).toBe(true)
    })

    it('rejects missing fields', () => {
      const result = deleteIndexSchema.safeParse({ entityId: 'post-1' })
      expect(result.success).toBe(false)
    })
  })

  describe('reindexSchema', () => {
    it('validates empty body', () => {
      const result = reindexSchema.safeParse({})
      expect(result.success).toBe(true)
    })

    it('validates entity type', () => {
      const result = reindexSchema.safeParse({ entityType: 'blog_post' })
      expect(result.success).toBe(true)
    })

    it('rejects invalid entity type', () => {
      const result = reindexSchema.safeParse({ entityType: 'invalid' })
      expect(result.success).toBe(false)
    })
  })
})

describe('search Query Sanitization', () => {
  it('removes special FTS characters', () => {
    const query = 'test "quoted" *star*'
    const sanitized = query.replace(/["*]/g, '').trim()
    expect(sanitized).toBe('test quoted star')
  })

  it('handles empty query after sanitization', () => {
    const query = '***"""'
    const sanitized = query.replace(/["*]/g, '').trim()
    expect(sanitized).toBe('')
  })

  it('preserves normal text', () => {
    const query = 'hello world test'
    const sanitized = query.replace(/["*]/g, '').trim()
    expect(sanitized).toBe('hello world test')
  })

  it('appends wildcard for prefix matching', () => {
    const query = 'test'
    const ftsQuery = `${query}*`
    expect(ftsQuery).toBe('test*')
  })
})
