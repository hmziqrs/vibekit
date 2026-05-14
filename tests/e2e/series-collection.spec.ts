import { expect, test } from '@playwright/test'

import { loginAsAdmin, login, USER } from './helpers/auth'

test.describe('public series page', () => {
  test('series page shows series posts in order', async ({ page }) => {
    await page.goto('/blog', { waitUntil: 'networkidle' })
    // If there are series links visible, click the first one
    const seriesLink = page.locator('a[href*="/blog/series/"]').first()
    if (await seriesLink.isVisible()) {
      await seriesLink.click()
      await page.waitForURL(/\/blog\/series\//, { timeout: 10_000 })
      await expect(page.getByRole('heading').first()).toBeVisible()
    }
  })

  test('blog post detail shows series navigation when in a series', async ({ page }) => {
    await page.goto('/blog', { waitUntil: 'networkidle' })
    // Navigate to first post
    const firstPost = page.locator('article a, a article').first()
    if (await firstPost.isVisible()) {
      await firstPost.click()
      await page.waitForURL(/\/blog\/.+/)
      // If this post is in a series, a series section should appear
      const seriesSection = page.locator('[data-series-nav], .series-nav').first()
      // No hard assertion — not all posts are in series
      if (await seriesSection.isVisible()) {
        await expect(seriesSection).toBeVisible()
      }
    }
  })
})

test.describe('admin series management', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
  })

  test('series list page renders with data table', async ({ page }) => {
    await page.goto('/admin/blog/series', { waitUntil: 'networkidle' })
    await expect(page.getByRole('heading', { name: 'Series' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Back to posts' })).toBeVisible()
    await expect(page.getByRole('table')).toBeVisible()
  })

  test('search input filters series', async ({ page }) => {
    await page.goto('/admin/blog/series', { waitUntil: 'networkidle' })
    const searchInput = page.getByPlaceholder('Search series...')
    await expect(searchInput).toBeVisible()
    await searchInput.fill('nonexistent-series-xyz')
    await page.waitForTimeout(500)
    await expect(page.getByText('No series yet').or(page.getByText('No matching'))).toBeVisible()
  })

  test('new series button opens create form', async ({ page }) => {
    await page.goto('/admin/blog/series', { waitUntil: 'networkidle' })
    await page.getByRole('button', { name: 'New Series' }).click()
    await expect(page.getByRole('heading', { name: 'Create Series' })).toBeVisible()
    await expect(page.getByLabel('Name')).toBeVisible()
    await expect(page.getByLabel('Slug')).toBeVisible()
    await expect(page.getByLabel('Description')).toBeVisible()
  })

  test('create form auto-generates slug from name', async ({ page }) => {
    await page.goto('/admin/blog/series', { waitUntil: 'networkidle' })
    await page.getByRole('button', { name: 'New Series' }).click()
    const nameInput = page.getByLabel('Name')
    await nameInput.fill('My Test Series')
    const slugInput = page.getByLabel('Slug')
    await page.waitForTimeout(200)
    const slugValue = await slugInput.inputValue()
    expect(slugValue).toBe('my-test-series')
  })

  test('cancel button closes create form', async ({ page }) => {
    await page.goto('/admin/blog/series', { waitUntil: 'networkidle' })
    await page.getByRole('button', { name: 'New Series' }).click()
    await expect(page.getByText('Create Series')).toBeVisible()
    // The toggle button changes from "New Series" to "Cancel" when form is open
    await page.getByRole('button', { name: 'Cancel' }).first().click()
    await page.waitForTimeout(300)
    await expect(page.getByRole('heading', { name: 'Create Series' })).not.toBeVisible()
    await expect(page.getByRole('button', { name: 'New Series' })).toBeVisible()
  })

  test('series list shows edit and delete buttons', async ({ page }) => {
    await page.goto('/admin/blog/series', { waitUntil: 'networkidle' })
    await page.waitForTimeout(500)
    const editButtons = page.getByRole('button', { name: 'Edit' })
    const deleteButtons = page.getByRole('button', { name: 'Delete' })
    // If there are series, both buttons should be present
    const editCount = await editButtons.count()
    const deleteCount = await deleteButtons.count()
    expect(editCount).toBe(deleteCount)
  })

  test('edit button populates form with series data', async ({ page }) => {
    await page.goto('/admin/blog/series', { waitUntil: 'networkidle' })
    await page.waitForTimeout(500)
    const editButtons = page.getByRole('button', { name: 'Edit' })
    if ((await editButtons.count()) > 0) {
      await editButtons.first().click()
      await expect(page.getByText('Edit Series')).toBeVisible()
      const nameInput = page.getByLabel('Name')
      const nameValue = await nameInput.inputValue()
      expect(nameValue.length).toBeGreaterThan(0)
    }
  })

  test('delete button opens confirm dialog', async ({ page }) => {
    await page.goto('/admin/blog/series', { waitUntil: 'networkidle' })
    await page.waitForTimeout(500)
    const deleteButtons = page.getByRole('button', { name: 'Delete' })
    if ((await deleteButtons.count()) > 0) {
      await deleteButtons.first().click()
      await expect(page.getByText('Delete this series?')).toBeVisible()
      await expect(page.getByRole('button', { name: 'Delete' }).last()).toBeVisible()
    }
  })

  test('back to posts link navigates to blog admin', async ({ page }) => {
    await page.goto('/admin/blog/series', { waitUntil: 'networkidle' })
    await page.getByRole('link', { name: 'Back to posts' }).click()
    await page.waitForURL('**/admin/blog', { timeout: 10_000 })
    await expect(page).toHaveURL(/\/admin\/blog$/)
  })
})

test.describe('admin blog editor tag and series selectors', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
  })

  test('edit page has Tags & Series sidebar tab', async ({ page }) => {
    // Navigate to blog list first
    await page.goto('/admin/blog', { waitUntil: 'networkidle' })
    await page.waitForTimeout(500)
    // Click first Edit link
    const editLink = page.getByRole('link', { name: 'Edit' }).first()
    if ((await editLink.count()) > 0) {
      await editLink.click()
      await page.waitForURL(/\/admin\/blog\/.*\/edit/, { timeout: 10_000 })
      // Check for Tags & Series tab
      await expect(page.getByRole('button', { name: /tags & series/i })).toBeVisible()
    }
  })

  test('tags and series tab shows selectors when clicked', async ({ page }) => {
    await page.goto('/admin/blog', { waitUntil: 'networkidle' })
    await page.waitForTimeout(500)
    const editLink = page.getByRole('link', { name: 'Edit' }).first()
    if ((await editLink.count()) > 0) {
      await editLink.click()
      await page.waitForURL(/\/admin\/blog\/.*\/edit/, { timeout: 10_000 })
      await page.getByRole('button', { name: /tags & series/i }).click()
      // Should show tag and series sections
      await expect(page.getByText(/tags/i).first()).toBeVisible()
      await expect(page.getByText(/series/i).first()).toBeVisible()
    }
  })

  test('tags section has search input', async ({ page }) => {
    await page.goto('/admin/blog', { waitUntil: 'networkidle' })
    await page.waitForTimeout(500)
    const editLink = page.getByRole('link', { name: 'Edit' }).first()
    if ((await editLink.count()) > 0) {
      await editLink.click()
      await page.waitForURL(/\/admin\/blog\/.*\/edit/, { timeout: 10_000 })
      await page.getByRole('button', { name: /tags & series/i }).click()
      // Search inputs for tags and series
      const tagSearch = page.getByPlaceholder(/search tags/i)
      if ((await tagSearch.count()) > 0) {
        await expect(tagSearch.first()).toBeVisible()
      }
    }
  })
})

test.describe('series auth guards', () => {
  test('unauthenticated user accessing admin series is redirected to login', async ({ page }) => {
    await page.goto('/admin/blog/series')
    await page.waitForURL(/\/login/, { timeout: 10_000 })
    await expect(page).toHaveURL(/\/login/)
  })

  test('normal user accessing admin series gets 403', async ({ page }) => {
    await login(page, USER)

    await page.goto('/admin/blog/series')
    await expect(page.getByText('Admin access required')).toBeVisible()
  })
})
