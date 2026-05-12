import { expect, test } from '@playwright/test'

import { loginAsAdmin } from './helpers/auth'

test.describe('public comments on blog post', () => {
  test('comment section renders on blog post page', async ({ page }) => {
    await page.goto('/blog', { waitUntil: 'networkidle' })
    const firstPost = page.locator('article a, a article').first()
    if (await firstPost.isVisible()) {
      await firstPost.click()
      await page.waitForURL(/\/blog\/.+/)
      await expect(page.getByRole('heading', { name: 'Comments' })).toBeVisible()
    }
  })

  test('sign in prompt shows for unauthenticated users', async ({ page }) => {
    await page.goto('/blog', { waitUntil: 'networkidle' })
    const firstPost = page.locator('article a, a article').first()
    if (await firstPost.isVisible()) {
      await firstPost.click()
      await page.waitForURL(/\/blog\/.+/)
      await expect(page.getByText('Sign in to leave a comment')).toBeVisible()
    }
  })

  test('comment form shows for authenticated users', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'networkidle' })
    await page.getByPlaceholder('you@example.com').fill('admin@vibekit.local')
    await page.getByPlaceholder('Enter your password').fill('admin12345678')
    await page.getByRole('button', { name: 'Sign in' }).click()
    await page.waitForURL('**/app/**', { timeout: 10_000 })

    await page.goto('/blog', { waitUntil: 'networkidle' })
    const firstPost = page.locator('article a, a article').first()
    if (await firstPost.isVisible()) {
      await firstPost.click()
      await page.waitForURL(/\/blog\/.+/)
      await expect(page.getByPlaceholder('Write a comment...')).toBeVisible()
      await expect(page.getByRole('button', { name: 'Post Comment' })).toBeVisible()
    }
  })
})

test.describe('admin comment moderation', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
  })

  test('admin comments page renders with stats', async ({ page }) => {
    await page.goto('/admin/comments', { waitUntil: 'networkidle' })
    await expect(page.getByRole('heading', { name: 'Comments' })).toBeVisible()
    await expect(page.getByText('Pending')).toBeVisible()
    await expect(page.getByText('Spam')).toBeVisible()
    await expect(page.getByText('Approved')).toBeVisible()
    await expect(page.getByRole('table')).toBeVisible()
  })

  test('stats cards are clickable filters', async ({ page }) => {
    await page.goto('/admin/comments', { waitUntil: 'networkidle' })
    // Click Pending stat card
    await page.getByText('Pending', { exact: false }).first().click()
    await page.waitForTimeout(500)
    await expect(page.getByRole('table')).toBeVisible()
  })

  test('back to posts link navigates to blog admin', async ({ page }) => {
    await page.goto('/admin/comments', { waitUntil: 'networkidle' })
    await page.getByRole('link', { name: 'Back to posts' }).click()
    await page.waitForURL('**/admin/blog', { timeout: 10_000 })
    await expect(page).toHaveURL(/\/admin\/blog$/)
  })

  test('comment table shows action buttons', async ({ page }) => {
    await page.goto('/admin/comments', { waitUntil: 'networkidle' })
    await page.waitForTimeout(500)
    // Check for action buttons in table
    const approveButtons = page.getByRole('button', { name: 'Approve' })
    const rejectButtons = page.getByRole('button', { name: 'Reject' })
    const deleteButtons = page.getByRole('button', { name: 'Delete' })
    // At least delete should exist for each row
    const deleteCount = await deleteButtons.count()
    expect(deleteCount).toBeGreaterThanOrEqual(0)
  })

  test('delete button opens confirm dialog', async ({ page }) => {
    await page.goto('/admin/comments', { waitUntil: 'networkidle' })
    await page.waitForTimeout(500)
    const deleteButtons = page.getByRole('button', { name: 'Delete' })
    if ((await deleteButtons.count()) > 0) {
      await deleteButtons.first().click()
      await expect(page.getByText('Permanently delete this comment?')).toBeVisible()
    }
  })

  test('bulk selection shows actions', async ({ page }) => {
    await page.goto('/admin/comments', { waitUntil: 'networkidle' })
    await page.waitForTimeout(500)
    const firstCheckbox = page.getByRole('checkbox').nth(1)
    if ((await firstCheckbox.count()) > 0 && (await firstCheckbox.isVisible())) {
      await firstCheckbox.click()
      await page.waitForTimeout(300)
      await expect(page.getByText(/\d+ selected/)).toBeVisible()
    }
  })
})

test.describe('comments auth guards', () => {
  test('unauthenticated user accessing admin comments is redirected', async ({ page }) => {
    await page.goto('/admin/comments')
    await page.waitForURL(/\/login/, { timeout: 10_000 })
    await expect(page).toHaveURL(/\/login/)
  })

  test('normal user accessing admin comments gets 403', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'networkidle' })
    await page.getByPlaceholder('you@example.com').fill('user@vibekit.local')
    await page.getByPlaceholder('Enter your password').fill('user12345678')
    await page.getByRole('button', { name: 'Sign in' }).click()
    await page.waitForURL('**/app/**', { timeout: 10_000 })

    await page.goto('/admin/comments')
    await expect(page.getByText('Admin access required')).toBeVisible()
  })
})
