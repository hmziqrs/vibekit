import { describe, expect, it } from '@jest/globals'
import { expect, describe, it } from 'vitest'

import { createPostSchema, publishPostSchema, updatePostSchema } from './blog'

describe(createPostSchema, () => {
  const validInput = {
    slug: 'my-first-post',
    status: 'draft',
    title: 'My First Post',
  }

  it('validates minimal valid input', () => {
    const result = createPostSchema.safeParse(validInput)
    expect(result.success).toBe(true)
  })

  it('validates full input', () => {
    const result = createPostSchema.safeParse({
      ...validInput,
      contentBody: '# Hello World\n\nThis is my post.',
      excerpt: 'A short summary',
      seoDescription: 'A description for SEO',
      seoTitle: 'My First Post',
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
    const result = createPostSchema.safeParse({ slug: 'test', title: 'Test' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.status).toBe('draft')
    }
  })
})

describe(updatePostSchema, () => {
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

describe(publishPostSchema, () => {
  it('validates valid input', () => {
    const result = publishPostSchema.safeParse({ id: 'some-uuid' })
    expect(result.success).toBe(true)
  })

  it('rejects empty id', () => {
    const result = publishPostSchema.safeParse({ id: '' })
    expect(result.success).toBe(false)
  })
})
