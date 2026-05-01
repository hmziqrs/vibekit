import { describe, expect, it } from '@jest/globals'
import { expect, describe, it } from 'vitest'

import { createItemSchema, updateItemSchema } from './item'

describe(createItemSchema, () => {
  it('validates valid input with name only', () => {
    const result = createItemSchema.safeParse({ name: 'My Item' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toStrictEqual({ name: 'My Item' })
    }
  })

  it('validates input with name and description', () => {
    const result = createItemSchema.safeParse({ description: 'A description', name: 'My Item' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toStrictEqual({ description: 'A description', name: 'My Item' })
    }
  })

  it('rejects empty name', () => {
    const result = createItemSchema.safeParse({ name: '' })
    expect(result.success).toBe(false)
  })

  it('rejects name over 100 characters', () => {
    const result = createItemSchema.safeParse({ name: 'a'.repeat(101) })
    expect(result.success).toBe(false)
  })

  it('allows missing description', () => {
    const result = createItemSchema.safeParse({ name: 'My Item' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.description).toBeUndefined()
    }
  })

  it('rejects description over 2000 characters', () => {
    const result = createItemSchema.safeParse({ description: 'a'.repeat(2001), name: 'My Item' })
    expect(result.success).toBe(false)
  })
})

describe(updateItemSchema, () => {
  it('allows partial update with name only', () => {
    const result = updateItemSchema.safeParse({ name: 'Updated Name' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toStrictEqual({ name: 'Updated Name' })
    }
  })

  it('allows partial update with description only', () => {
    const result = updateItemSchema.safeParse({ description: 'Updated description' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toStrictEqual({ description: 'Updated description' })
    }
  })

  it('allows partial update with status only', () => {
    const result = updateItemSchema.safeParse({ status: 'archived' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toStrictEqual({ status: 'archived' })
    }
  })

  it('allows empty object', () => {
    const result = updateItemSchema.safeParse({})
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toStrictEqual({})
    }
  })

  it('rejects invalid status value', () => {
    const result = updateItemSchema.safeParse({ status: 'invalid' })
    expect(result.success).toBe(false)
  })

  it('rejects invalid name (empty string)', () => {
    const result = updateItemSchema.safeParse({ name: '' })
    expect(result.success).toBe(false)
  })
})
