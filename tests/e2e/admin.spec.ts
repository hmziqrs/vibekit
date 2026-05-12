import { expect, test } from '@playwright/test'

import { goToAdmin } from './helpers/auth'

test.describe.configure({ mode: 'serial' })

test.describe('admin dashboard', () => {
  test('shows stat cards with counts', async ({ page }) => {
    await goToAdmin(page)
    await expect(page.getByRole('heading', { name: 'Admin Dashboard' })).toBeVisible()
    // Stat card labels are <p> elements (sidebar uses <a> links)
    await expect(page.locator('main p', { hasText: 'Users' })).toBeVisible()
    await expect(page.locator('main p', { hasText: 'Blog Posts' })).toBeVisible()
    await expect(page.locator('main p', { hasText: 'Items' })).toBeVisible()
  })
})

test.describe('admin user management', () => {
  test('users list renders with seeded users', async ({ page }) => {
    await goToAdmin(page)
    await page.getByRole('link', { name: 'Users' }).first().click()
    await expect(page).toHaveURL('/admin/users')
    await expect(page.getByRole('heading', { name: 'Users' })).toBeVisible()
    // Scope to table to avoid matching sidebar user info
    await expect(page.getByRole('table').getByText('admin@vibekit.local')).toBeVisible()
    await expect(page.getByRole('table').getByText('user@vibekit.local')).toBeVisible()
  })

  test('search filters users by email', async ({ page }) => {
    await goToAdmin(page)
    await page.getByRole('link', { name: 'Users' }).first().click()
    await page.getByPlaceholder('Search by email or name').fill('admin@')
    await page.waitForTimeout(500)
    await expect(page.getByRole('table').getByText('admin@vibekit.local')).toBeVisible()
  })

  test('suspend and activate user', async ({ page }) => {
    await goToAdmin(page)
    await page.getByRole('link', { name: 'Users' }).first().click()
    await page.waitForLoadState('networkidle')

    // Find the regular user row and open its three-dot menu
    const userRow = page
      .locator('tr, [class*="row"]')
      .filter({ hasText: 'user@vibekit.local' })
      .first()
    await userRow.getByRole('button').last().click()
    await page.waitForTimeout(500)

    // Click "Suspend" (exact to avoid matching "Suspended" filter tab)
    await page.getByRole('button', { exact: true, name: 'Suspend' }).click()
    await page.waitForTimeout(1000)

    // Verify user is now suspended (red badge)
    await expect(userRow.getByText('suspended', { exact: false })).toBeVisible()

    // Re-activate
    await userRow.getByRole('button').last().click()
    await page.waitForTimeout(500)
    await page.getByRole('button', { exact: true, name: 'Activate' }).click()
    await page.waitForTimeout(1000)

    await expect(userRow.getByText('active', { exact: false })).toBeVisible()
  })
})

test.describe('admin blog management', () => {
  test('blog posts list renders with filter tabs', async ({ page }) => {
    await goToAdmin(page)
    await page.getByRole('link', { name: 'Blog' }).first().click()
    await expect(page).toHaveURL('/admin/blog')
    await expect(page.getByRole('heading', { name: /blog posts/i })).toBeVisible()
    await expect(page.getByRole('button', { name: 'All' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Draft' })).toBeVisible()
    await expect(
      page.locator('div.flex.gap-1').getByRole('button', { name: 'Published' })
    ).toBeVisible()
  })

  test('create and delete blog post', async ({ page }) => {
    await goToAdmin(page)
    await page.getByRole('link', { name: 'Blog' }).first().click()
    await page.waitForLoadState('networkidle')

    // Click "New Post"
    await page.getByRole('link', { name: /new post/i }).click()
    await expect(page).toHaveURL('/admin/blog/new')

    const postTitle = `Test Post ${Date.now()}`
    await page.getByLabel('Title').fill(postTitle)
    // Slug should auto-generate
    await page.waitForTimeout(500)
    await page.getByLabel('Content').fill('This is test content for the blog post.')
    await page.getByRole('button', { name: 'Save Draft' }).click()

    // Should redirect to edit page
    await page.waitForURL(/\/admin\/blog\/.*\/edit/, { timeout: 10_000 })
    await expect(page.getByRole('heading', { name: 'Edit Post' })).toBeVisible()

    // Navigate back to blog list (file input intercepts clicks on "Back to list" link)
    await page.goto('/admin/blog')
    await expect(page).toHaveURL('/admin/blog')

    // Filter to draft to find our post
    await page.getByRole('button', { name: 'Draft' }).click()
    await page.waitForTimeout(1000)
    await expect(page.getByText(postTitle)).toBeVisible()

    // Delete the draft
    await page
      .getByRole('button', { name: /delete/i })
      .first()
      .click()
    await page.locator('.fixed button').getByText('Delete').click()
    await page.waitForTimeout(1000)
  })
})

test.describe('admin audit log', () => {
  test('audit log renders with action filters', async ({ page }) => {
    await goToAdmin(page)
    await page.getByRole('link', { name: 'Audit Log' }).first().click()
    await expect(page).toHaveURL('/admin/audit')
    await expect(page.getByRole('heading', { name: 'Audit Log' })).toBeVisible()
    await expect(page.getByRole('button', { name: /all actions/i })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Create' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Update' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Delete' })).toBeVisible()
  })
})
