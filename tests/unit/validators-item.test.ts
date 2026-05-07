import { createItemSchema, updateItemSchema } from '$lib/validators/item'
import { describe, expect, it } from 'vitest'

describe('createItemSchema', () => {
  it('validates valid input with name only', () => {
    const data = createItemSchema.parse({ name: 'My Item' })
    expect(data).toStrictEqual({ name: 'My Item' })
  })

  it('validates input with name and description', () => {
    const data = createItemSchema.parse({ description: 'A description', name: 'My Item' })
    expect(data).toStrictEqual({ description: 'A description', name: 'My Item' })
  })

  it('rejects empty name', () => {
    const result = createItemSchema.safeParse({ name: '' })
    expect(result.success).toBeFalsy()
  })

  it('rejects name over 100 characters', () => {
    const result = createItemSchema.safeParse({ name: 'a'.repeat(101) })
    expect(result.success).toBeFalsy()
  })

  it('allows missing description', () => {
    const data = createItemSchema.parse({ name: 'My Item' })
    expect(data.description).toBeUndefined()
  })

  it('rejects description over 2000 characters', () => {
    const result = createItemSchema.safeParse({ description: 'a'.repeat(2001), name: 'My Item' })
    expect(result.success).toBeFalsy()
  })
})

describe('updateItemSchema', () => {
  it('allows partial update with name only', () => {
    const data = updateItemSchema.parse({ name: 'Updated Name' })
    expect(data).toStrictEqual({ name: 'Updated Name' })
  })

  it('allows partial update with description only', () => {
    const data = updateItemSchema.parse({ description: 'Updated description' })
    expect(data).toStrictEqual({ description: 'Updated description' })
  })

  it('allows partial update with status only', () => {
    const data = updateItemSchema.parse({ status: 'archived' })
    expect(data).toStrictEqual({ status: 'archived' })
  })

  it('allows empty object', () => {
    const data = updateItemSchema.parse({})
    expect(data).toStrictEqual({})
  })

  it('rejects invalid status value', () => {
    const result = updateItemSchema.safeParse({ status: 'invalid' })
    expect(result.success).toBeFalsy()
  })

  it('rejects invalid name (empty string)', () => {
    const result = updateItemSchema.safeParse({ name: '' })
    expect(result.success).toBeFalsy()
  })
})
