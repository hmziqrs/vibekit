import { describe, expect, expectTypeOf, it } from 'vitest'

import { uuid, uuidv7 } from './uuid'

describe('uuid', () => {
  it('returns a valid UUID v7 string', () => {
    const id = uuid()
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
  })

  it('generates unique ids', () => {
    const ids = new Set(Array.from({ length: 100 }, () => uuid()))
    expect(ids.size).toBe(100)
  })

  it('exports uuidv7 from package', () => {
    expectTypeOf(uuidv7).toBeFunction()
  })
})
