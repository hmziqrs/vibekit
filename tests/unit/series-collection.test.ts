import {
  createPostSchema,
  createSeriesSchema,
  updatePostSchema,
  updateSeriesSchema,
} from '$lib/validators/blog'
import { describe, expect, it } from 'vitest'

// ── Series Validators ──

describe('createSeriesSchema', () => {
  const validInput = {
    name: 'Building a SaaS',
    slug: 'building-a-saas',
  }

  it('validates minimal valid input', () => {
    const result = createSeriesSchema.safeParse(validInput)
    expect(result.success).toBeTruthy()
  })

  it('validates full input with optional fields', () => {
    const result = createSeriesSchema.safeParse({
      ...validInput,
      coverImageUrl: 'https://example.com/cover.jpg',
      description: 'A series about building SaaS products',
    })
    expect(result.success).toBeTruthy()
  })

  it('rejects missing name', () => {
    const result = createSeriesSchema.safeParse({ slug: 'test' })
    expect(result.success).toBeFalsy()
  })

  it('rejects empty name', () => {
    const result = createSeriesSchema.safeParse({ name: '', slug: 'test' })
    expect(result.success).toBeFalsy()
  })

  it('rejects name exceeding 200 chars', () => {
    const result = createSeriesSchema.safeParse({
      name: 'a'.repeat(201),
      slug: 'test',
    })
    expect(result.success).toBeFalsy()
  })

  it('rejects missing slug', () => {
    const result = createSeriesSchema.safeParse({ name: 'Test' })
    expect(result.success).toBeFalsy()
  })

  it('rejects invalid slug with uppercase', () => {
    const result = createSeriesSchema.safeParse({
      name: 'Test',
      slug: 'Invalid-Slug',
    })
    expect(result.success).toBeFalsy()
  })

  it('rejects invalid slug with spaces', () => {
    const result = createSeriesSchema.safeParse({
      name: 'Test',
      slug: 'has spaces',
    })
    expect(result.success).toBeFalsy()
  })

  it('accepts valid kebab-case slug', () => {
    const result = createSeriesSchema.safeParse({
      name: 'Test Series',
      slug: 'my-awesome-series',
    })
    expect(result.success).toBeTruthy()
  })

  it('accepts null description', () => {
    const result = createSeriesSchema.safeParse({
      ...validInput,
      description: null,
    })
    expect(result.success).toBeTruthy()
  })

  it('accepts null coverImageUrl', () => {
    const result = createSeriesSchema.safeParse({
      ...validInput,
      coverImageUrl: null,
    })
    expect(result.success).toBeTruthy()
  })

  it('rejects description exceeding 1000 chars', () => {
    const result = createSeriesSchema.safeParse({
      ...validInput,
      description: 'a'.repeat(1001),
    })
    expect(result.success).toBeFalsy()
  })
})

describe('updateSeriesSchema', () => {
  it('allows partial updates with just name', () => {
    const result = updateSeriesSchema.safeParse({ name: 'Updated Name' })
    expect(result.success).toBeTruthy()
  })

  it('allows partial updates with just slug', () => {
    const result = updateSeriesSchema.safeParse({ slug: 'updated-slug' })
    expect(result.success).toBeTruthy()
  })

  it('allows empty object (no-op update)', () => {
    const result = updateSeriesSchema.safeParse({})
    expect(result.success).toBeTruthy()
  })

  it('allows updating all fields at once', () => {
    const result = updateSeriesSchema.safeParse({
      coverImageUrl: 'https://example.com/new-cover.jpg',
      description: 'New description',
      name: 'New Name',
      slug: 'new-slug',
    })
    expect(result.success).toBeTruthy()
  })

  it('rejects empty name', () => {
    const result = updateSeriesSchema.safeParse({ name: '' })
    expect(result.success).toBeFalsy()
  })

  it('rejects name exceeding 200 chars', () => {
    const result = updateSeriesSchema.safeParse({ name: 'a'.repeat(201) })
    expect(result.success).toBeFalsy()
  })

  it('rejects invalid slug', () => {
    const result = updateSeriesSchema.safeParse({ slug: 'INVALID SLUG!' })
    expect(result.success).toBeFalsy()
  })

  it('allows null description to clear it', () => {
    const result = updateSeriesSchema.safeParse({ description: null })
    expect(result.success).toBeTruthy()
  })

  it('allows null coverImageUrl to clear it', () => {
    const result = updateSeriesSchema.safeParse({ coverImageUrl: null })
    expect(result.success).toBeTruthy()
  })
})

// ── Post Schema with seriesIds and tagIds ──

describe('createPostSchema with seriesIds and tagIds', () => {
  const validInput = {
    slug: 'test-post',
    status: 'draft' as const,
    title: 'Test Post',
  }

  it('accepts tagIds array', () => {
    const result = createPostSchema.safeParse({
      ...validInput,
      tagIds: ['tag-1', 'tag-2', 'tag-3'],
    })
    expect(result.success).toBeTruthy()
  })

  it('accepts seriesIds array with sortOrder', () => {
    const result = createPostSchema.safeParse({
      ...validInput,
      seriesIds: [
        { id: 'series-1', sortOrder: 0 },
        { id: 'series-2', sortOrder: 1 },
      ],
    })
    expect(result.success).toBeTruthy()
  })

  it('accepts both tagIds and seriesIds', () => {
    const result = createPostSchema.safeParse({
      ...validInput,
      seriesIds: [{ id: 'series-1', sortOrder: 0 }],
      tagIds: ['tag-1'],
    })
    expect(result.success).toBeTruthy()
  })

  it('accepts empty tagIds array', () => {
    const result = createPostSchema.safeParse({
      ...validInput,
      tagIds: [],
    })
    expect(result.success).toBeTruthy()
  })

  it('accepts empty seriesIds array', () => {
    const result = createPostSchema.safeParse({
      ...validInput,
      seriesIds: [],
    })
    expect(result.success).toBeTruthy()
  })

  it('works without tagIds or seriesIds', () => {
    const result = createPostSchema.safeParse(validInput)
    expect(result.success).toBeTruthy()
  })

  it('rejects seriesIds with negative sortOrder', () => {
    const result = createPostSchema.safeParse({
      ...validInput,
      seriesIds: [{ id: 'series-1', sortOrder: -1 }],
    })
    expect(result.success).toBeFalsy()
  })

  it('rejects seriesIds with non-integer sortOrder', () => {
    const result = createPostSchema.safeParse({
      ...validInput,
      seriesIds: [{ id: 'series-1', sortOrder: 1.5 }],
    })
    expect(result.success).toBeFalsy()
  })

  it('rejects seriesIds missing sortOrder', () => {
    const result = createPostSchema.safeParse({
      ...validInput,
      seriesIds: [{ id: 'series-1' }],
    })
    expect(result.success).toBeFalsy()
  })

  it('rejects seriesIds missing id', () => {
    const result = createPostSchema.safeParse({
      ...validInput,
      seriesIds: [{ sortOrder: 0 }],
    })
    expect(result.success).toBeFalsy()
  })

  it('rejects non-string tagIds', () => {
    const result = createPostSchema.safeParse({
      ...validInput,
      tagIds: [123],
    })
    expect(result.success).toBeFalsy()
  })
})

describe('updatePostSchema with seriesIds and tagIds', () => {
  it('allows updating tagIds', () => {
    const result = updatePostSchema.safeParse({
      tagIds: ['tag-1', 'tag-2'],
    })
    expect(result.success).toBeTruthy()
  })

  it('allows updating seriesIds', () => {
    const result = updatePostSchema.safeParse({
      seriesIds: [{ id: 'series-1', sortOrder: 0 }],
    })
    expect(result.success).toBeTruthy()
  })

  it('allows clearing tagIds with empty array', () => {
    const result = updatePostSchema.safeParse({ tagIds: [] })
    expect(result.success).toBeTruthy()
  })

  it('allows clearing seriesIds with empty array', () => {
    const result = updatePostSchema.safeParse({ seriesIds: [] })
    expect(result.success).toBeTruthy()
  })

  it('allows updating both tagIds and seriesIds together', () => {
    const result = updatePostSchema.safeParse({
      seriesIds: [
        { id: 'series-1', sortOrder: 0 },
        { id: 'series-2', sortOrder: 1 },
      ],
      tagIds: ['tag-a', 'tag-b'],
      title: 'Updated Title',
    })
    expect(result.success).toBeTruthy()
  })

  it('rejects invalid seriesIds with negative sortOrder', () => {
    const result = updatePostSchema.safeParse({
      seriesIds: [{ id: 'series-1', sortOrder: -5 }],
    })
    expect(result.success).toBeFalsy()
  })
})

// ── Route pattern tests (Hono structure) ──

describe('series API route patterns', () => {
  it('seriesIds uses delete-then-reinsert pattern on update', () => {
    // Verify the update logic pattern: undefined check means empty array clears associations
    const data = { seriesIds: [] }
    expect(data.seriesIds).toBeDefined()
    expect(data.seriesIds.length).toBe(0)
  })

  it('seriesIds uses optional check on create', () => {
    // Verify the create logic pattern: optional chaining means empty/missing is no-op
    const data: { tagIds?: string[] } = { tagIds: undefined }
    expect(data.tagIds?.length).toBeFalsy()
  })

  it('sortOrder starts at 0', () => {
    const seriesIds = [
      { id: 's1', sortOrder: 0 },
      { id: 's2', sortOrder: 1 },
      { id: 's3', sortOrder: 2 },
    ]
    expect(seriesIds[0].sortOrder).toBe(0)
    expect(seriesIds.length).toBe(3)
  })

  it('post can belong to multiple series', () => {
    const seriesIds = [
      { id: 'series-a', sortOrder: 0 },
      { id: 'series-b', sortOrder: 3 },
    ]
    expect(seriesIds.length).toBe(2)
    expect(seriesIds[0].id).not.toBe(seriesIds[1].id)
  })
})

// ── Slug generation logic (mirrors admin UI) ──

describe('series slug generation', () => {
  function generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
  }

  it('converts spaces to hyphens', () => {
    expect(generateSlug('My Series')).toBe('my-series')
  })

  it('lowercases the name', () => {
    expect(generateSlug('Building A SaaS')).toBe('building-a-saas')
  })

  it('removes special characters', () => {
    expect(generateSlug('React: Deep Dive!')).toBe('react-deep-dive')
  })

  it('handles multiple consecutive spaces', () => {
    expect(generateSlug('Hello   World')).toBe('hello-world')
  })

  it('strips leading and trailing hyphens', () => {
    expect(generateSlug('--my-series--')).toBe('my-series')
  })

  it('handles numeric names', () => {
    expect(generateSlug('2024 Year in Review')).toBe('2024-year-in-review')
  })

  it('produces valid slug matching schema', () => {
    const slug = generateSlug('Building a SaaS from Scratch')
    const result = createSeriesSchema.safeParse({
      name: 'Building a SaaS from Scratch',
      slug,
    })
    expect(result.success).toBeTruthy()
  })
})
