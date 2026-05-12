import { expect, test } from '@playwright/test'

import { loginAsAdmin } from './helpers/auth'

test.describe('public newsletter signup', () => {
  test('newsletter signup form renders on blog listing page', async ({ page }) => {
    await page.goto('/blog', { waitUntil: 'networkidle' })
    await expect(page.getByPlaceholder('your@email.com')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Subscribe' })).toBeVisible()
  })

  test('newsletter signup form renders on blog post page', async ({ page }) => {
    await page.goto('/blog', { waitUntil: 'networkidle' })
    const firstPost = page.locator('article a, a article').first()
    if (await firstPost.isVisible()) {
      await firstPost.click()
      await page.waitForURL(/\/blog\/.+/)
      await expect(page.getByText('Enjoyed this article?')).toBeVisible()
      await expect(page.getByPlaceholder('your@email.com')).toBeVisible()
    }
  })

  test('newsletter signup form renders in footer', async ({ page }) => {
    await page.goto('/blog', { waitUntil: 'networkidle' })
    await page.locator('footer').scrollIntoViewIfNeeded()
    await expect(page.locator('footer').getByPlaceholder('your@email.com')).toBeVisible()
    await expect(page.locator('footer').getByText('Subscribe to the newsletter')).toBeVisible()
  })

  test('submitting empty email shows validation', async ({ page }) => {
    await page.goto('/blog', { waitUntil: 'networkidle' })
    const subscribeButton = page.getByRole('button', { name: 'Subscribe' }).first()
    await expect(subscribeButton).toBeDisabled()
  })

  test('subscribe button is enabled with valid email', async ({ page }) => {
    await page.goto('/blog', { waitUntil: 'networkidle' })
    const emailInput = page.getByPlaceholder('your@email.com').first()
    await emailInput.fill('test@example.com')
    const subscribeButton = page.getByRole('button', { name: 'Subscribe' }).first()
    await expect(subscribeButton).toBeEnabled()
  })
})

test.describe('admin newsletter management', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
  })

  test('admin newsletter page renders with stats', async ({ page }) => {
    await page.goto('/admin/newsletter', { waitUntil: 'networkidle' })
    await expect(page.getByRole('heading', { name: 'Newsletter' })).toBeVisible()
    await expect(page.getByText('Pending')).toBeVisible()
    await expect(page.getByText('Confirmed')).toBeVisible()
    await expect(page.getByText('Unsubscribed')).toBeVisible()
    await expect(page.getByText('Bounced')).toBeVisible()
    await expect(page.getByRole('table')).toBeVisible()
  })

  test('stats cards are clickable filters', async ({ page }) => {
    await page.goto('/admin/newsletter', { waitUntil: 'networkidle' })
    await page.getByText('Pending', { exact: false }).first().click()
    await page.waitForTimeout(500)
    await expect(page.getByRole('table')).toBeVisible()
  })

  test('back to blog link navigates correctly', async ({ page }) => {
    await page.goto('/admin/newsletter', { waitUntil: 'networkidle' })
    await page.getByRole('link', { name: 'Back to blog' }).click()
    await page.waitForURL('**/admin/blog', { timeout: 10_000 })
    await expect(page).toHaveURL(/\/admin\/blog$/)
  })

  test('subscriber table has correct columns', async ({ page }) => {
    await page.goto('/admin/newsletter', { waitUntil: 'networkidle' })
    await expect(page.getByText('Email')).toBeVisible()
    await expect(page.getByText('Name')).toBeVisible()
    await expect(page.getByText('Status')).toBeVisible()
    await expect(page.getByText('Source')).toBeVisible()
    await expect(page.getByText('Subscribed')).toBeVisible()
  })

  test('delete button opens confirm dialog', async ({ page }) => {
    await page.goto('/admin/newsletter', { waitUntil: 'networkidle' })
    await page.waitForTimeout(500)
    const deleteButtons = page.getByRole('button', { name: 'Delete' })
    if ((await deleteButtons.count()) > 0) {
      await deleteButtons.first().click()
      await expect(page.getByText('Permanently delete this subscriber?')).toBeVisible()
      await expect(page.getByRole('button', { name: 'Delete' }).last()).toBeVisible()
    }
  })

  test('empty state message shows when no subscribers', async ({ page }) => {
    await page.goto('/admin/newsletter', { waitUntil: 'networkidle' })
    await page.waitForTimeout(500)
    const rows = page.getByRole('table').locator('tbody tr')
    if ((await rows.count()) === 0) {
      await expect(page.getByText('No subscribers matching this filter')).toBeVisible()
    }
  })
})

test.describe('newsletter auth guards', () => {
  test('unauthenticated user accessing admin newsletter is redirected', async ({ page }) => {
    await page.goto('/admin/newsletter')
    await page.waitForURL(/\/login/, { timeout: 10_000 })
    await expect(page).toHaveURL(/\/login/)
  })

  test('normal user accessing admin newsletter gets 403', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'networkidle' })
    await page.getByPlaceholder('you@example.com').fill('user@vibekit.local')
    await page.getByPlaceholder('Enter your password').fill('user12345678')
    await page.getByRole('button', { name: 'Sign in' }).click()
    await page.waitForURL('**/app/**', { timeout: 10_000 })

    await page.goto('/admin/newsletter')
    await expect(page.getByText('Admin access required')).toBeVisible()
  })
})
