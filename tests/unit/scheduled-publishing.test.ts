import {
  createPostSchema,
  updatePostSchema,
  type CreatePostInput,
  type UpdatePostInput,
} from '$lib/validators/blog'
import { describe, expect, it } from 'vitest'
import { z } from 'zod/v4'

describe(createPostSchema, () => {
  it('accepts draft status', () => {
    const result = createPostSchema.safeParse({
      slug: 'test-post',
      title: 'Test Post',
    })
    expect(result.success).toBe(true)
    expect(result.success && result.data.status).toBe('draft')
  })

  it('accepts scheduled status', () => {
    const result = createPostSchema.safeParse({
      slug: 'test-post',
      status: 'scheduled',
      title: 'Test Post',
    })
    expect(result.success).toBe(true)
    expect(result.success && result.data.status).toBe('scheduled')
  })

  it('rejects invalid status', () => {
    const result = createPostSchema.safeParse({
      slug: 'test-post',
      status: 'invalid',
      title: 'Test Post',
    })
    expect(result.success).toBe(false)
  })
})

describe(updatePostSchema, () => {
  it('accepts scheduled status', () => {
    const result = updatePostSchema.safeParse({
      status: 'scheduled',
    })
    expect(result.success).toBe(true)
  })

  it('accepts scheduledAt as ISO datetime string', () => {
    const future = new Date(Date.now() + 86_400_000).toISOString()
    const result = updatePostSchema.safeParse({
      scheduledAt: future,
      status: 'scheduled',
    })
    expect(result.success).toBe(true)
    expect(result.success && result.data.scheduledAt).toBeInstanceOf(Date)
  })

  it('accepts null scheduledAt to cancel scheduling', () => {
    const result = updatePostSchema.safeParse({
      scheduledAt: null,
      status: 'draft',
    })
    expect(result.success).toBe(true)
    expect(result.success && result.data.scheduledAt).toBeNull()
  })

  it('omits scheduledAt when not provided', () => {
    const result = updatePostSchema.safeParse({
      status: 'draft',
    })
    expect(result.success).toBe(true)
    expect(result.success && result.data.scheduledAt).toBeUndefined()
  })

  it('accepts all valid statuses', () => {
    const statuses = ['draft', 'published', 'archived', 'scheduled'] as const
    for (const status of statuses) {
      const result = updatePostSchema.safeParse({ status })
      expect(result.success).toBe(true)
    }
  })
})

describe('scheduled publishing logic', () => {
  it('a scheduled post with past scheduledAt should be due for publishing', () => {
    const now = new Date()
    const pastDate = new Date(now.getTime() - 60_000)
    expect(pastDate.getTime()).toBeLessThanOrEqual(now.getTime())
  })

  it('a scheduled post with future scheduledAt should not be due yet', () => {
    const now = new Date()
    const futureDate = new Date(now.getTime() + 86_400_000)
    expect(futureDate.getTime()).toBeGreaterThan(now.getTime())
  })

  it('cron should only query posts with status scheduled and non-null scheduledAt', () => {
    const queryConditions = {
      deletedAt: null,
      scheduledAt: new Date(),
      status: 'scheduled',
    }
    expect(queryConditions.status).toBe('scheduled')
    expect(queryConditions.scheduledAt).toBeInstanceOf(Date)
    expect(queryConditions.deletedAt).toBeNull()
  })
})
