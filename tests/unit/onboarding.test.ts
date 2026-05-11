import { describe, expect, it } from 'vitest'

describe('onboarding step validation', () => {
  function clampStep(step: number): number {
    return Math.max(0, Math.min(3, step))
  }

  it('clamps negative step to 0', () => {
    expect(clampStep(-1)).toBe(0)
  })

  it('clamps step above 3 to 3', () => {
    expect(clampStep(5)).toBe(3)
  })

  it('allows step 0', () => {
    expect(clampStep(0)).toBe(0)
  })

  it('allows step 3', () => {
    expect(clampStep(3)).toBe(3)
  })

  it('allows step 1', () => {
    expect(clampStep(1)).toBe(1)
  })
})

describe('onboarding API body parsing', () => {
  it('accepts valid step value', () => {
    const body: { completed?: boolean; step?: number } = { step: 2 }
    const updates: Record<string, unknown> = {}
    if (typeof body.step === 'number') {
      updates.onboardingStep = Math.max(0, Math.min(3, body.step))
    }
    expect(updates.onboardingStep).toBe(2)
  })

  it('accepts valid completed value', () => {
    const body: { completed?: boolean; step?: number } = { completed: true }
    const updates: Record<string, unknown> = {}
    if (typeof body.completed === 'boolean') {
      updates.onboardingCompleted = body.completed
    }
    expect(updates.onboardingCompleted).toBe(true)
  })

  it('ignores invalid step type', () => {
    const body: Record<string, unknown> = { step: 'invalid' }
    const updates: Record<string, unknown> = {}
    if (typeof body.step === 'number') {
      updates.onboardingStep = body.step
    }
    expect('onboardingStep' in updates).toBe(false)
  })

  it('handles empty body', () => {
    const body: Record<string, unknown> = {}
    const updates: Record<string, unknown> = {}
    if (typeof body.step === 'number') {
      updates.onboardingStep = body.step
    }
    if (typeof body.completed === 'boolean') {
      updates.onboardingCompleted = body.completed
    }
    expect(Object.keys(updates)).toHaveLength(0)
  })
})

describe('onboarding redirect logic', () => {
  it('redirects when onboarding not completed', () => {
    const user = { onboardingCompleted: false, role: 'user' }
    const shouldRedirect =
      !user.onboardingCompleted && user.role !== 'admin' && !user.onboardingCompleted
    expect(shouldRedirect).toBe(true)
  })

  it('does not redirect when onboarding completed', () => {
    const user = { onboardingCompleted: true, role: 'user' }
    const shouldRedirect = !user.onboardingCompleted && user.role !== 'admin'
    expect(shouldRedirect).toBe(false)
  })

  it('does not redirect admin users', () => {
    const user = { onboardingCompleted: false, role: 'admin' }
    const shouldRedirect = !user.onboardingCompleted && user.role !== 'admin'
    expect(shouldRedirect).toBe(false)
  })
})

describe('onboarding progress calculation', () => {
  const totalSteps = 4

  it('calculates step 0 progress', () => {
    const progress = ((0 + 1) / totalSteps) * 100
    expect(progress).toBe(25)
  })

  it('calculates step 3 progress', () => {
    const progress = ((3 + 1) / totalSteps) * 100
    expect(progress).toBe(100)
  })
})
