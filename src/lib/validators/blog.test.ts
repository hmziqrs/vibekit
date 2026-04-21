import { describe, it, expect } from 'vitest'

import { createPostSchema, updatePostSchema, publishPostSchema } from './blog'

describe('createPostSchema', () => {
  const validInput = {
    title: 'My First Post',
    slug: 'my-first-post',
    status: 'draft',
  }

  it('validates minimal valid input', () => {
    const result = createPostSchema.safeParse(validInput)
    expect(result.success).toBe(true)
  })

  it('validates full input', () => {
    const result = createPostSchema.safeParse({
      ...validInput,
      excerpt: 'A short summary',
      contentBody: '# Hello World\n\nThis is my post.',
      seoTitle: 'My First Post',
      seoDescription: 'A description for SEO',
    })
    expect(result.success).toBe(true)
  })

  it('rejects empty title', () => {
    const result = createPostSchema.safeParse({ ...validInput, title: '' })
    expect(result.success).toBe(false)
  })

  it('rejects invalid slug', () => {
    const result = createPostSchema.safeParse({ ...validInput, slug: 'Invalid Slug!' })
    expect(result.success).toBe(false)
  })

  it('rejects invalid status', () => {
    const result = createPostSchema.safeParse({ ...validInput, status: 'unknown' })
    expect(result.success).toBe(false)
  })

  it('defaults status to draft', () => {
    const result = createPostSchema.safeParse({ title: 'Test', slug: 'test' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.status).toBe('draft')
    }
  })
})

describe('updatePostSchema', () => {
  it('allows partial updates', () => {
    const result = updatePostSchema.safeParse({ title: 'Updated Title' })
    expect(result.success).toBe(true)
  })

  it('allows empty object', () => {
    const result = updatePostSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('rejects invalid slug', () => {
    const result = updatePostSchema.safeParse({ slug: 'INVALID' })
    expect(result.success).toBe(false)
  })
})

describe('publishPostSchema', () => {
  it('validates valid input', () => {
    const result = publishPostSchema.safeParse({ id: 'some-uuid' })
    expect(result.success).toBe(true)
  })

  it('rejects empty id', () => {
    const result = publishPostSchema.safeParse({ id: '' })
    expect(result.success).toBe(false)
  })
})
