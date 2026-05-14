import { deleteSearchIndexSchema } from '$lib/validators/search'
import { describe, expect, it } from 'vitest'

describe('deleteSearchIndexSchema', () => {
  it('accepts valid input', () => {
    const result = deleteSearchIndexSchema.safeParse({
      entityId: 'post-123',
      entityType: 'blog_post',
    })
    expect(result.success).toBe(true)
  })

  it('trims whitespace from fields', () => {
    const result = deleteSearchIndexSchema.parse({
      entityId: '  post-123  ',
      entityType: '  blog_post  ',
    })
    expect(result.entityId).toBe('post-123')
    expect(result.entityType).toBe('blog_post')
  })

  it('rejects empty entityId', () => {
    const result = deleteSearchIndexSchema.safeParse({ entityId: '', entityType: 'blog_post' })
    expect(result.success).toBe(false)
  })

  it('rejects empty entityType', () => {
    const result = deleteSearchIndexSchema.safeParse({ entityId: '123', entityType: '' })
    expect(result.success).toBe(false)
  })

  it('rejects missing entityId', () => {
    const result = deleteSearchIndexSchema.safeParse({ entityType: 'blog_post' })
    expect(result.success).toBe(false)
  })

  it('rejects missing entityType', () => {
    const result = deleteSearchIndexSchema.safeParse({ entityId: '123' })
    expect(result.success).toBe(false)
  })

  it('rejects whitespace-only fields', () => {
    const result = deleteSearchIndexSchema.safeParse({ entityId: '   ', entityType: '   ' })
    expect(result.success).toBe(false)
  })

  it('rejects non-string fields', () => {
    const result = deleteSearchIndexSchema.safeParse({ entityId: 123, entityType: 456 })
    expect(result.success).toBe(false)
  })
})
