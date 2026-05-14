import {
  getPasswordStrength,
  getPasswordStrengthBarColor,
  getPasswordStrengthColor,
} from '$lib/password-strength'
import { describe, expect, it } from 'vitest'

describe(getPasswordStrength, () => {
  it('returns score 0 for empty string', () => {
    const result = getPasswordStrength('')
    expect(result).toStrictEqual({ feedback: [], label: '', score: 0 })
  })

  it('scores a very weak password', () => {
    const result = getPasswordStrength('a')
    expect(result.score).toBeLessThanOrEqual(2)
    expect(result.feedback.length).toBeGreaterThan(0)
  })

  it('scores common password "password" as weak', () => {
    const result = getPasswordStrength('password')
    expect(result.score).toBeLessThanOrEqual(2)
    expect(result.feedback).toContain('Avoid common passwords')
  })

  it('scores common pattern "123456" as weak', () => {
    const result = getPasswordStrength('Password123456')
    expect(result.feedback).toContain('Avoid common passwords')
  })

  it('gives feedback for missing character classes', () => {
    const result = getPasswordStrength('alllowercase')
    expect(result.feedback).toContain('Add an uppercase letter')
    expect(result.feedback).toContain('Add a number')
  })

  it('gives feedback for missing lowercase', () => {
    const result = getPasswordStrength('ALLUPPERCASE')
    expect(result.feedback).toContain('Add a lowercase letter')
    expect(result.feedback).toContain('Add a number')
  })

  it('gives feedback for missing digit', () => {
    const result = getPasswordStrength('NoDigitsHere')
    expect(result.feedback).toContain('Add a number')
  })

  it('gives feedback for missing special character', () => {
    const result = getPasswordStrength('NoSpecial123')
    expect(result.feedback).toContain('Add a special character')
  })

  it('penalizes repeated characters', () => {
    const result = getPasswordStrength('Passsssword1')
    expect(result.feedback).toContain('Avoid repeated characters')
  })

  it('penalizes sequential characters', () => {
    const result = getPasswordStrength('Passwordabc1')
    expect(result.feedback).toContain('Avoid sequential characters')
  })

  it('gives feedback for short password', () => {
    const result = getPasswordStrength('Ab1')
    expect(result.feedback).toContain('Use at least 8 characters')
  })

  it('scores a strong password highly', () => {
    const result = getPasswordStrength('K#9m$Xp!2vLq')
    expect(result.score).toBeGreaterThanOrEqual(3)
  })

  it('rewards length >= 8', () => {
    const eight = getPasswordStrength('Aa1!Aa1!')
    const seven = getPasswordStrength('Aa1!Aa1')
    expect(eight.score).toBeGreaterThanOrEqual(seven.score)
  })

  it('rewards length >= 12', () => {
    const twelve = getPasswordStrength('Aa1!Aa1!Bb2@')
    expect(twelve.score).toBeGreaterThanOrEqual(3)
  })

  it('rewards length >= 16', () => {
    const result = getPasswordStrength('Aa1!Bb2@Cc3#Dd4$')
    expect(result.score).toBeGreaterThanOrEqual(4)
  })

  it('rewards variety (unique characters)', () => {
    const varied = getPasswordStrength('Aa1!Bb2@Cc3#')
    const repeated = getPasswordStrength('AaAaAaAaAa1!')
    expect(varied.score).toBeGreaterThan(repeated.score)
  })

  it('maps score to correct label', () => {
    const result = getPasswordStrength('K#9m$Xp!2vLqZ7nR')
    expect(result.label).toBe('Strong')
  })

  it('detects common pattern "qwerty"', () => {
    const result = getPasswordStrength('MyQwertyPass1')
    expect(result.feedback).toContain('Avoid common passwords')
  })

  it('detects common pattern "letmein"', () => {
    const result = getPasswordStrength('Letmein123!')
    expect(result.feedback).toContain('Avoid common passwords')
  })

  it('case-insensitive common pattern detection', () => {
    const result = getPasswordStrength('ADMIN1234567!')
    expect(result.feedback).toContain('Avoid common passwords')
  })

  it('clamps score to max 100 before mapping', () => {
    const result = getPasswordStrength('Aa1!Bb2@Cc3#Dd4$Ee5%')
    expect(result.score).toBeLessThanOrEqual(4)
  })

  it('does not crash on single special character', () => {
    const result = getPasswordStrength('!')
    expect(result.score).toBeGreaterThanOrEqual(0)
    expect(result.feedback.length).toBeGreaterThan(0)
  })

  it('detects reverse sequential characters', () => {
    const result = getPasswordStrength('Passcba1')
    expect(result.feedback).toContain('Avoid sequential characters')
  })
})

describe(getPasswordStrengthColor, () => {
  it('returns correct colors for each score', () => {
    expect(getPasswordStrengthColor(0)).toBe('text-destructive')
    expect(getPasswordStrengthColor(1)).toBe('text-warning')
    expect(getPasswordStrengthColor(2)).toBe('text-warning')
    expect(getPasswordStrengthColor(3)).toBe('text-success')
    expect(getPasswordStrengthColor(4)).toBe('text-success')
  })

  it('returns muted for invalid score', () => {
    expect(getPasswordStrengthColor(5)).toBe('text-text-muted')
    expect(getPasswordStrengthColor(-1)).toBe('text-text-muted')
  })
})

describe(getPasswordStrengthBarColor, () => {
  it('returns correct bar colors for each score', () => {
    expect(getPasswordStrengthBarColor(0)).toBe('bg-destructive')
    expect(getPasswordStrengthBarColor(1)).toBe('bg-warning')
    expect(getPasswordStrengthBarColor(2)).toBe('bg-warning')
    expect(getPasswordStrengthBarColor(3)).toBe('bg-success')
    expect(getPasswordStrengthBarColor(4)).toBe('bg-success')
  })

  it('returns muted for invalid score', () => {
    expect(getPasswordStrengthBarColor(99)).toBe('bg-text-muted')
  })
})
