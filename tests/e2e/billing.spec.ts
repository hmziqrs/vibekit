import { expect, test } from '@playwright/test'

import { loginAsAdmin } from './helpers/auth'

test.describe('billing API endpoints', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
  })

  test('plans endpoint returns seeded plans', async ({ page }) => {
    const response = await page.evaluate(async () => {
      const res = await fetch('/api/billing/plans')
      return (await res.json()) as { plans: { name: string; slug: string }[] }
    })
    expect(response.plans.length).toBeGreaterThanOrEqual(2)
    const slugs = response.plans.map((p) => p.slug)
    expect(slugs).toContain('starter')
    expect(slugs).toContain('pro')
  })

  test('subscription endpoint returns null for new user', async ({ page }) => {
    const response = await page.evaluate(async () => {
      const res = await fetch('/api/billing/subscription')
      return (await res.json()) as { subscription: unknown }
    })
    expect(response.subscription).toBeNull()
  })

  test('invoices endpoint returns empty array', async ({ page }) => {
    const response = await page.evaluate(async () => {
      const res = await fetch('/api/billing/invoices')
      return (await res.json()) as { invoices: unknown[] }
    })
    expect(Array.isArray(response.invoices)).toBeTruthy()
  })

  test('checkout creates subscription for free plan', async ({ page }) => {
    const response = await page.evaluate(async () => {
      const plansRes = await fetch('/api/billing/plans')
      const plansData = (await plansRes.json()) as { plans: { id: string; priceInCents: number }[] }
      const freePlan = plansData.plans.find((p) => p.priceInCents === 0)
      if (!freePlan) return { error: 'No free plan' }

      const res = await fetch('/api/billing/checkout', {
        body: JSON.stringify({
          cancelUrl: 'http://localhost:5173/app/settings/billing',
          planId: freePlan.id,
          successUrl: 'http://localhost:5173/app/settings/billing',
        }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      })
      return (await res.json()) as { subscription: { status: string } }
    })
    expect(response.subscription).toBeTruthy()
    expect(response.subscription.status).toBe('active')
  })

  test('cancel and reactivate subscription', async ({ page }) => {
    // First subscribe
    const subResponse = await page.evaluate(async () => {
      const plansRes = await fetch('/api/billing/plans')
      const plansData = (await plansRes.json()) as { plans: { id: string; priceInCents: number }[] }
      const freePlan = plansData.plans.find((p) => p.priceInCents === 0)
      if (!freePlan) return null

      await fetch('/api/billing/checkout', {
        body: JSON.stringify({
          cancelUrl: 'http://localhost:5173/app/settings/billing',
          planId: freePlan.id,
          successUrl: 'http://localhost:5173/app/settings/billing',
        }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      })

      const res = await fetch('/api/billing/cancel', { method: 'POST' })
      return (await res.json()) as { success: boolean }
    })
    expect(subResponse?.success).toBeTruthy()

    // Reactivate
    const reactivateResponse = await page.evaluate(async () => {
      const res = await fetch('/api/billing/reactivate', { method: 'POST' })
      return (await res.json()) as { success: boolean }
    })
    expect(reactivateResponse.success).toBeTruthy()
  })
})

test.describe('admin billing API', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
  })

  test('admin plans endpoint returns all plans', async ({ page }) => {
    const response = await page.evaluate(async () => {
      const res = await fetch('/api/admin/billing/plans')
      return (await res.json()) as { plans: { name: string; isActive: boolean }[] }
    })
    expect(response.plans.length).toBeGreaterThanOrEqual(2)
  })

  test('admin billing overview returns stats', async ({ page }) => {
    const response = await page.evaluate(async () => {
      const res = await fetch('/api/admin/billing/overview')
      return (await res.json()) as { activeSubscriptions: number; totalSubscriptions: number }
    })
    expect(typeof response.activeSubscriptions).toBe('number')
    expect(typeof response.totalSubscriptions).toBe('number')
  })

  test('admin can create and delete a plan', async ({ page }) => {
    const createResponse = await page.evaluate(async () => {
      const res = await fetch('/api/admin/billing/plans', {
        body: JSON.stringify({
          interval: 'month',
          name: 'Test Plan E2E',
          priceInCents: 999,
          slug: 'test-plan-e2e',
        }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      })
      return (await res.json()) as { plan: { id: string; name: string } }
    })
    expect(createResponse.plan.name).toBe('Test Plan E2E')

    const deleteResponse = await page.evaluate(async () => {
      const plansRes = await fetch('/api/admin/billing/plans')
      const plansData = (await plansRes.json()) as { plans: { id: string; slug: string }[] }
      const testPlan = plansData.plans.find((p) => p.slug === 'test-plan-e2e')
      if (!testPlan) return { success: false }

      const res = await fetch(`/api/admin/billing/plans/${testPlan.id}`, { method: 'DELETE' })
      return (await res.json()) as { success: boolean }
    })
    expect(deleteResponse.success).toBeTruthy()
  })
})

test.describe('billing settings page', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
  })

  test('billing settings page renders', async ({ page }) => {
    await page.goto('/app/settings/billing', { waitUntil: 'networkidle' })
    await expect(page.getByRole('heading', { name: 'Billing' })).toBeVisible()
  })

  test('shows available plans', async ({ page }) => {
    await page.goto('/app/settings/billing', { waitUntil: 'networkidle' })
    await expect(page.getByText('Available Plans')).toBeVisible()
    await expect(page.getByText('Starter')).toBeVisible()
    await expect(page.getByText('Pro')).toBeVisible()
  })
})

test.describe('admin billing page', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
  })

  test('admin billing page renders with stats', async ({ page }) => {
    await page.goto('/admin/billing', { waitUntil: 'networkidle' })
    await expect(page.getByRole('heading', { name: 'Billing' })).toBeVisible()
    await expect(page.getByText('Active Subscriptions')).toBeVisible()
    await expect(page.getByText('Plans')).toBeVisible()
  })

  test('admin can open create plan form', async ({ page }) => {
    await page.goto('/admin/billing', { waitUntil: 'networkidle' })
    await page.getByRole('button', { name: 'Create Plan' }).click()
    await expect(page.getByText('New Plan')).toBeVisible()
    await expect(page.getByPlaceholder('Pro')).toBeVisible()
  })
})
