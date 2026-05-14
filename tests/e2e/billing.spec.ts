import { expect, test } from '@playwright/test'

import { loginAsAdmin } from './helpers/auth'

// ---------------------------------------------------------------------------
// Public pricing page
// ---------------------------------------------------------------------------
test.describe('public pricing page', () => {
  test('page renders with plan cards', async ({ page }) => {
    await page.goto('/pricing', { waitUntil: 'networkidle' })
    await expect(page.getByRole('heading', { name: 'Simple, predictable pricing' })).toBeVisible({
      timeout: 10_000,
    })
    await expect(page.getByRole('heading', { name: 'Starter' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Pro' })).toBeVisible()
  })

  test('Starter plan shows $0 pricing', async ({ page }) => {
    await page.goto('/pricing', { waitUntil: 'networkidle' })
    const starterCard = page.getByRole('heading', { name: 'Starter' }).locator('..')
    await expect(starterCard.getByText('$0')).toBeVisible({ timeout: 10_000 })
  })

  test('Pro plan shows $29 pricing and free trial CTA', async ({ page }) => {
    await page.goto('/pricing', { waitUntil: 'networkidle' })
    const proCard = page.getByRole('heading', { name: 'Pro' }).locator('..')
    await expect(proCard.getByText('$29')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByRole('link', { name: 'Start free trial' })).toBeVisible()
  })
})

// ---------------------------------------------------------------------------
// User billing settings
// ---------------------------------------------------------------------------
test.describe('user billing settings', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
  })

  test('page renders with Billing & Subscription heading', async ({ page }) => {
    await page.goto('/app/settings/billing', { waitUntil: 'networkidle' })
    await expect(page.getByRole('heading', { name: 'Billing & Subscription' })).toBeVisible({
      timeout: 10_000,
    })
  })

  test('shows "No active subscription" when user has no subscription', async ({ page }) => {
    await page.goto('/app/settings/billing', { waitUntil: 'networkidle' })
    await expect(page.getByText('No active subscription')).toBeVisible({ timeout: 10_000 })
  })

  test('Available Plans section shows Starter and Pro plans', async ({ page }) => {
    await page.goto('/app/settings/billing', { waitUntil: 'networkidle' })
    await expect(page.getByRole('heading', { name: 'Available Plans' })).toBeVisible({
      timeout: 10_000,
    })
    await expect(page.getByText('Starter').first()).toBeVisible()
    await expect(page.getByText('Pro', { exact: true }).first()).toBeVisible()
  })

  test('Subscribe buttons exist for each plan', async ({ page }) => {
    await page.goto('/app/settings/billing', { waitUntil: 'networkidle' })
    await expect(page.getByRole('button', { name: 'Subscribe' }).first()).toBeVisible({
      timeout: 10_000,
    })
  })
})

// ---------------------------------------------------------------------------
// Admin billing page
// ---------------------------------------------------------------------------
test.describe('admin billing page', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
  })

  test('page renders with Billing heading', async ({ page }) => {
    await page.goto('/admin/billing', { waitUntil: 'networkidle' })
    await expect(page.getByRole('heading', { name: 'Billing' })).toBeVisible({ timeout: 10_000 })
  })

  test('shows Active Subscriptions count', async ({ page }) => {
    await page.goto('/admin/billing', { waitUntil: 'networkidle' })
    await expect(page.getByText('Active Subscriptions')).toBeVisible({ timeout: 10_000 })
  })

  test('shows Total Subscriptions count', async ({ page }) => {
    await page.goto('/admin/billing', { waitUntil: 'networkidle' })
    await expect(page.getByText('Total Subscriptions')).toBeVisible({ timeout: 10_000 })
  })

  test('Plans list shows Starter and Pro', async ({ page }) => {
    await page.goto('/admin/billing', { waitUntil: 'networkidle' })
    // The Plans heading appears both as a stat card label and the plans section heading
    const plansHeading = page.getByRole('heading', { name: 'Plans' })
    await expect(plansHeading).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText('Starter').first()).toBeVisible()
    await expect(page.getByText('Pro', { exact: true }).first()).toBeVisible()
  })

  test('Create Plan button exists', async ({ page }) => {
    await page.goto('/admin/billing', { waitUntil: 'networkidle' })
    await expect(page.getByRole('button', { name: 'Create Plan' })).toBeVisible({ timeout: 10_000 })
  })
})
