import {
  deleteIndexSchema,
  indexDocumentSchema,
  reindexSchema,
  searchSchema,
} from '$lib/validators/search'
import { describe, expect, it } from 'vitest'

// ---------------------------------------------------------------------------
// searchSchema
// ---------------------------------------------------------------------------
describe('searchSchema', () => {
  const validInput = {
    query: 'hello world',
  }

  // -- Valid inputs ---------------------------------------------------------

  it('validates minimal required input', () => {
    const result = searchSchema.safeParse(validInput)
    expect(result.success).toBeTruthy()
  })

  it('accepts query at minimum length (1 char)', () => {
    const result = searchSchema.safeParse({ query: 'a' })
    expect(result.success).toBeTruthy()
  })

  it('accepts query at maximum length (500 chars)', () => {
    const result = searchSchema.safeParse({ query: 'a'.repeat(500) })
    expect(result.success).toBeTruthy()
  })

  it('accepts optional limit', () => {
    const result = searchSchema.safeParse({ ...validInput, limit: 25 })
    expect(result.success).toBeTruthy()
  })

  it('accepts optional offset', () => {
    const result = searchSchema.safeParse({ ...validInput, offset: 10 })
    expect(result.success).toBeTruthy()
  })

  it('accepts optional types array', () => {
    const result = searchSchema.safeParse({
      ...validInput,
      types: ['blog_post', 'comment'],
    })
    expect(result.success).toBeTruthy()
  })

  it('accepts types array at max size (10)', () => {
    const types = Array.from({ length: 10 }, (_, i) => `type-${i}`)
    const result = searchSchema.safeParse({ ...validInput, types })
    expect(result.success).toBeTruthy()
  })

  it('accepts all optional fields together', () => {
    const result = searchSchema.safeParse({
      limit: 50,
      offset: 100,
      query: 'test',
      types: ['blog_post'],
    })
    expect(result.success).toBeTruthy()
  })

  it('accepts offset of 0 (minimum)', () => {
    const result = searchSchema.safeParse({ ...validInput, offset: 0 })
    expect(result.success).toBeTruthy()
  })

  it('accepts limit of 1 (minimum)', () => {
    const result = searchSchema.safeParse({ ...validInput, limit: 1 })
    expect(result.success).toBeTruthy()
  })

  it('accepts limit of 100 (maximum)', () => {
    const result = searchSchema.safeParse({ ...validInput, limit: 100 })
    expect(result.success).toBeTruthy()
  })

  it('trims whitespace from query', () => {
    const data = searchSchema.parse({ query: '  hello world  ' })
    expect(data.query).toBe('hello world')
  })

  it('trims whitespace from each item in types', () => {
    const data = searchSchema.parse({
      query: 'test',
      types: ['  blog_post  ', '  comment  '],
    })
    expect(data.types).toEqual(['blog_post', 'comment'])
  })

  // -- Missing required fields -----------------------------------------------

  it('rejects missing query', () => {
    const result = searchSchema.safeParse({})
    expect(result.success).toBeFalsy()
  })

  it('rejects empty object', () => {
    const result = searchSchema.safeParse({})
    expect(result.success).toBeFalsy()
  })

  // -- Invalid types --------------------------------------------------------

  it('rejects query that is not a string', () => {
    const result = searchSchema.safeParse({ query: 123 })
    expect(result.success).toBeFalsy()
  })

  it('rejects limit that is a string', () => {
    const result = searchSchema.safeParse({ ...validInput, limit: '50' })
    expect(result.success).toBeFalsy()
  })

  it('rejects offset that is a string', () => {
    const result = searchSchema.safeParse({ ...validInput, offset: '10' })
    expect(result.success).toBeFalsy()
  })

  it('rejects types that is not an array', () => {
    const result = searchSchema.safeParse({ ...validInput, types: 'blog_post' })
    expect(result.success).toBeFalsy()
  })

  it('rejects types array containing non-strings', () => {
    const result = searchSchema.safeParse({ ...validInput, types: [123, 'comment'] })
    expect(result.success).toBeFalsy()
  })

  // -- Boundary values ------------------------------------------------------

  it('rejects empty query string', () => {
    const result = searchSchema.safeParse({ query: '' })
    expect(result.success).toBeFalsy()
  })

  it('rejects whitespace-only query', () => {
    const result = searchSchema.safeParse({ query: '   ' })
    expect(result.success).toBeFalsy()
  })

  it('rejects query exceeding max length (501 chars)', () => {
    const result = searchSchema.safeParse({ query: 'a'.repeat(501) })
    expect(result.success).toBeFalsy()
  })

  it('rejects limit below minimum (0)', () => {
    const result = searchSchema.safeParse({ ...validInput, limit: 0 })
    expect(result.success).toBeFalsy()
  })

  it('rejects limit above maximum (101)', () => {
    const result = searchSchema.safeParse({ ...validInput, limit: 101 })
    expect(result.success).toBeFalsy()
  })

  it('rejects negative limit', () => {
    const result = searchSchema.safeParse({ ...validInput, limit: -1 })
    expect(result.success).toBeFalsy()
  })

  it('rejects float limit', () => {
    const result = searchSchema.safeParse({ ...validInput, limit: 10.5 })
    expect(result.success).toBeFalsy()
  })

  it('rejects negative offset', () => {
    const result = searchSchema.safeParse({ ...validInput, offset: -1 })
    expect(result.success).toBeFalsy()
  })

  it('rejects float offset', () => {
    const result = searchSchema.safeParse({ ...validInput, offset: 1.5 })
    expect(result.success).toBeFalsy()
  })

  it('rejects types array exceeding max size (11)', () => {
    const types = Array.from({ length: 11 }, (_, i) => `type-${i}`)
    const result = searchSchema.safeParse({ ...validInput, types })
    expect(result.success).toBeFalsy()
  })

  it('rejects empty string inside types array', () => {
    const result = searchSchema.safeParse({ ...validInput, types: [''] })
    expect(result.success).toBeFalsy()
  })

  it('rejects whitespace-only string inside types array', () => {
    const result = searchSchema.safeParse({ ...validInput, types: ['   '] })
    expect(result.success).toBeFalsy()
  })
})

// ---------------------------------------------------------------------------
// indexDocumentSchema
// ---------------------------------------------------------------------------
describe('indexDocumentSchema', () => {
  const validInput = {
    content: 'This is the document content.',
    entityId: 'entity-abc-123',
    entityType: 'blog_post',
    title: 'My Blog Post',
  }

  // -- Valid inputs ---------------------------------------------------------

  it('validates minimal required input', () => {
    const result = indexDocumentSchema.safeParse(validInput)
    expect(result.success).toBeTruthy()
  })

  it('accepts optional metadata', () => {
    const result = indexDocumentSchema.safeParse({
      ...validInput,
      metadata: { author: 'john', tags: ['svelte', 'kit'] },
    })
    expect(result.success).toBeTruthy()
  })

  it('accepts empty metadata object', () => {
    const result = indexDocumentSchema.safeParse({
      ...validInput,
      metadata: {},
    })
    expect(result.success).toBeTruthy()
  })

  it('accepts entityId at max length (200)', () => {
    const result = indexDocumentSchema.safeParse({
      ...validInput,
      entityId: 'a'.repeat(200),
    })
    expect(result.success).toBeTruthy()
  })

  it('accepts entityType at max length (50)', () => {
    const result = indexDocumentSchema.safeParse({
      ...validInput,
      entityType: 'a'.repeat(50),
    })
    expect(result.success).toBeTruthy()
  })

  it('accepts title at max length (500)', () => {
    const result = indexDocumentSchema.safeParse({
      ...validInput,
      title: 'a'.repeat(500),
    })
    expect(result.success).toBeTruthy()
  })

  it('accepts content at max length (50 000)', () => {
    const result = indexDocumentSchema.safeParse({
      ...validInput,
      content: 'a'.repeat(50_000),
    })
    expect(result.success).toBeTruthy()
  })

  it('accepts content with single character (min)', () => {
    const result = indexDocumentSchema.safeParse({
      ...validInput,
      content: 'a',
    })
    expect(result.success).toBeTruthy()
  })

  it('trims whitespace from entityId', () => {
    const data = indexDocumentSchema.parse({
      ...validInput,
      entityId: '  entity-abc  ',
    })
    expect(data.entityId).toBe('entity-abc')
  })

  it('trims whitespace from entityType', () => {
    const data = indexDocumentSchema.parse({
      ...validInput,
      entityType: '  blog_post  ',
    })
    expect(data.entityType).toBe('blog_post')
  })

  it('trims whitespace from title', () => {
    const data = indexDocumentSchema.parse({
      ...validInput,
      title: '  My Blog Post  ',
    })
    expect(data.title).toBe('My Blog Post')
  })

  it('accepts metadata with various value types', () => {
    const result = indexDocumentSchema.safeParse({
      ...validInput,
      metadata: {
        number: 42,
        boolean: true,
        nested: { key: 'value' },
        array: [1, 2, 3],
      },
    })
    expect(result.success).toBeTruthy()
  })

  // -- Missing required fields -----------------------------------------------

  it('rejects missing entityId', () => {
    const { entityId, ...rest } = validInput
    const result = indexDocumentSchema.safeParse(rest)
    expect(result.success).toBeFalsy()
  })

  it('rejects missing entityType', () => {
    const { entityType, ...rest } = validInput
    const result = indexDocumentSchema.safeParse(rest)
    expect(result.success).toBeFalsy()
  })

  it('rejects missing title', () => {
    const { title, ...rest } = validInput
    const result = indexDocumentSchema.safeParse(rest)
    expect(result.success).toBeFalsy()
  })

  it('rejects missing content', () => {
    const { content, ...rest } = validInput
    const result = indexDocumentSchema.safeParse(rest)
    expect(result.success).toBeFalsy()
  })

  it('rejects empty object', () => {
    const result = indexDocumentSchema.safeParse({})
    expect(result.success).toBeFalsy()
  })

  // -- Invalid types --------------------------------------------------------

  it('rejects entityId that is not a string', () => {
    const result = indexDocumentSchema.safeParse({ ...validInput, entityId: 123 })
    expect(result.success).toBeFalsy()
  })

  it('rejects entityType that is not a string', () => {
    const result = indexDocumentSchema.safeParse({ ...validInput, entityType: true })
    expect(result.success).toBeFalsy()
  })

  it('rejects title that is not a string', () => {
    const result = indexDocumentSchema.safeParse({ ...validInput, title: 42 })
    expect(result.success).toBeFalsy()
  })

  it('rejects content that is not a string', () => {
    const result = indexDocumentSchema.safeParse({ ...validInput, content: null })
    expect(result.success).toBeFalsy()
  })

  it('rejects metadata that is not an object', () => {
    const result = indexDocumentSchema.safeParse({
      ...validInput,
      metadata: 'not-an-object',
    })
    expect(result.success).toBeFalsy()
  })

  it('rejects metadata that is an array', () => {
    const result = indexDocumentSchema.safeParse({
      ...validInput,
      metadata: [1, 2, 3],
    })
    expect(result.success).toBeFalsy()
  })

  // -- Boundary values ------------------------------------------------------

  it('rejects empty entityId', () => {
    const result = indexDocumentSchema.safeParse({ ...validInput, entityId: '' })
    expect(result.success).toBeFalsy()
  })

  it('rejects whitespace-only entityId', () => {
    const result = indexDocumentSchema.safeParse({ ...validInput, entityId: '   ' })
    expect(result.success).toBeFalsy()
  })

  it('rejects entityId exceeding max length (201)', () => {
    const result = indexDocumentSchema.safeParse({
      ...validInput,
      entityId: 'a'.repeat(201),
    })
    expect(result.success).toBeFalsy()
  })

  it('rejects empty entityType', () => {
    const result = indexDocumentSchema.safeParse({ ...validInput, entityType: '' })
    expect(result.success).toBeFalsy()
  })

  it('rejects whitespace-only entityType', () => {
    const result = indexDocumentSchema.safeParse({ ...validInput, entityType: '   ' })
    expect(result.success).toBeFalsy()
  })

  it('rejects entityType exceeding max length (51)', () => {
    const result = indexDocumentSchema.safeParse({
      ...validInput,
      entityType: 'a'.repeat(51),
    })
    expect(result.success).toBeFalsy()
  })

  it('rejects empty title', () => {
    const result = indexDocumentSchema.safeParse({ ...validInput, title: '' })
    expect(result.success).toBeFalsy()
  })

  it('rejects whitespace-only title', () => {
    const result = indexDocumentSchema.safeParse({ ...validInput, title: '   ' })
    expect(result.success).toBeFalsy()
  })

  it('rejects title exceeding max length (501)', () => {
    const result = indexDocumentSchema.safeParse({
      ...validInput,
      title: 'a'.repeat(501),
    })
    expect(result.success).toBeFalsy()
  })

  it('rejects empty content', () => {
    const result = indexDocumentSchema.safeParse({ ...validInput, content: '' })
    expect(result.success).toBeFalsy()
  })

  it('rejects content exceeding max length (50 001)', () => {
    const result = indexDocumentSchema.safeParse({
      ...validInput,
      content: 'a'.repeat(50_001),
    })
    expect(result.success).toBeFalsy()
  })
})

// ---------------------------------------------------------------------------
// deleteIndexSchema
// ---------------------------------------------------------------------------
describe('deleteIndexSchema', () => {
  const validInput = {
    entityId: 'entity-abc-123',
    entityType: 'blog_post',
  }

  // -- Valid inputs ---------------------------------------------------------

  it('validates valid input', () => {
    const result = deleteIndexSchema.safeParse(validInput)
    expect(result.success).toBeTruthy()
  })

  it('accepts single-character entityId and entityType', () => {
    const result = deleteIndexSchema.safeParse({ entityId: 'a', entityType: 'b' })
    expect(result.success).toBeTruthy()
  })

  it('trims whitespace from entityId', () => {
    const data = deleteIndexSchema.parse({
      ...validInput,
      entityId: '  entity-abc  ',
    })
    expect(data.entityId).toBe('entity-abc')
  })

  it('trims whitespace from entityType', () => {
    const data = deleteIndexSchema.parse({
      ...validInput,
      entityType: '  blog_post  ',
    })
    expect(data.entityType).toBe('blog_post')
  })

  // -- Missing required fields -----------------------------------------------

  it('rejects missing entityId', () => {
    const { entityId, ...rest } = validInput
    const result = deleteIndexSchema.safeParse(rest)
    expect(result.success).toBeFalsy()
  })

  it('rejects missing entityType', () => {
    const { entityType, ...rest } = validInput
    const result = deleteIndexSchema.safeParse(rest)
    expect(result.success).toBeFalsy()
  })

  it('rejects empty object', () => {
    const result = deleteIndexSchema.safeParse({})
    expect(result.success).toBeFalsy()
  })

  // -- Invalid types --------------------------------------------------------

  it('rejects entityId that is not a string', () => {
    const result = deleteIndexSchema.safeParse({ ...validInput, entityId: 123 })
    expect(result.success).toBeFalsy()
  })

  it('rejects entityType that is not a string', () => {
    const result = deleteIndexSchema.safeParse({ ...validInput, entityType: true })
    expect(result.success).toBeFalsy()
  })

  // -- Boundary values ------------------------------------------------------

  it('rejects empty entityId', () => {
    const result = deleteIndexSchema.safeParse({ ...validInput, entityId: '' })
    expect(result.success).toBeFalsy()
  })

  it('rejects whitespace-only entityId', () => {
    const result = deleteIndexSchema.safeParse({ ...validInput, entityId: '   ' })
    expect(result.success).toBeFalsy()
  })

  it('rejects empty entityType', () => {
    const result = deleteIndexSchema.safeParse({ ...validInput, entityType: '' })
    expect(result.success).toBeFalsy()
  })

  it('rejects whitespace-only entityType', () => {
    const result = deleteIndexSchema.safeParse({ ...validInput, entityType: '   ' })
    expect(result.success).toBeFalsy()
  })
})

// ---------------------------------------------------------------------------
// reindexSchema
// ---------------------------------------------------------------------------
describe('reindexSchema', () => {
  const validEntityTypes = ['blog_post', 'comment', 'item', 'user'] as const

  // -- Valid inputs ---------------------------------------------------------

  it('accepts an empty object (entityType is optional)', () => {
    const result = reindexSchema.safeParse({})
    expect(result.success).toBeTruthy()
  })

  it('accepts each valid entityType value', () => {
    for (const entityType of validEntityTypes) {
      const result = reindexSchema.safeParse({ entityType })
      expect(result.success).toBeTruthy()
    }
  })

  // -- Invalid inputs -------------------------------------------------------

  it('rejects entityType not in the enum', () => {
    const result = reindexSchema.safeParse({ entityType: 'organization' })
    expect(result.success).toBeFalsy()
  })

  it('rejects empty entityType string', () => {
    const result = reindexSchema.safeParse({ entityType: '' })
    expect(result.success).toBeFalsy()
  })

  it('rejects entityType that is not a string', () => {
    const result = reindexSchema.safeParse({ entityType: 123 })
    expect(result.success).toBeFalsy()
  })

  it('rejects entityType that is a boolean', () => {
    const result = reindexSchema.safeParse({ entityType: true })
    expect(result.success).toBeFalsy()
  })
})
