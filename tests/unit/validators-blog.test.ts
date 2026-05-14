import { createPostSchema, updatePostSchema } from '$lib/validators/blog'
import { describe, expect, it } from 'vitest'

describe('createPostSchema', () => {
  const validInput = {
    slug: 'my-first-post',
    status: 'draft',
    title: 'My First Post',
  }

  it('validates minimal valid input', () => {
    const result = createPostSchema.safeParse(validInput)
    expect(result.success).toBeTruthy()
  })

  it('validates full input', () => {
    const result = createPostSchema.safeParse({
      ...validInput,
      contentBody: '# Hello World\n\nThis is my post.',
      excerpt: 'A short summary',
      seoDescription: 'A description for SEO',
      seoTitle: 'My First Post',
    })
    expect(result.success).toBeTruthy()
  })

  it('rejects empty title', () => {
    const result = createPostSchema.safeParse({ ...validInput, title: '' })
    expect(result.success).toBeFalsy()
  })

  it('rejects invalid slug', () => {
    const result = createPostSchema.safeParse({ ...validInput, slug: 'Invalid Slug!' })
    expect(result.success).toBeFalsy()
  })

  it('rejects invalid status', () => {
    const result = createPostSchema.safeParse({ ...validInput, status: 'unknown' })
    expect(result.success).toBeFalsy()
  })

  it('defaults status to draft', () => {
    const data = createPostSchema.parse({ slug: 'test', title: 'Test' })
    expect(data.status).toBe('draft')
  })
})

describe('updatePostSchema', () => {
  it('allows partial updates', () => {
    const result = updatePostSchema.safeParse({ title: 'Updated Title' })
    expect(result.success).toBeTruthy()
  })

  it('allows empty object', () => {
    const result = updatePostSchema.safeParse({})
    expect(result.success).toBeTruthy()
  })

  it('rejects invalid slug', () => {
    const result = updatePostSchema.safeParse({ slug: 'INVALID' })
    expect(result.success).toBeFalsy()
  })
})
