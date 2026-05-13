import { getFieldError } from '$lib/validation'
import { describe, expect, it } from 'vitest'

describe(getFieldError, () => {
  it('returns first error message', () => {
    const errors = [{ message: 'Required' }, { message: 'Too long' }] as never
    expect(getFieldError(errors)).toBe('Required')
  })

  it('returns undefined for empty array', () => {
    expect(getFieldError([])).toBeUndefined()
  })
})
