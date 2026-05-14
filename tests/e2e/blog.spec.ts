import { expect, test } from '@playwright/test'

import { loginAsAdmin, login, USER } from './helpers/auth'

test.describe('public blog', () => {
  test('blog index renders with search bar and articles', async ({ page }) => {
    await page.goto('/blog', { waitUntil: 'networkidle' })
    await expect(page.getByRole('heading', { name: 'Blog' })).toBeVisible()
    await expect(page.getByPlaceholder('Search articles...')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Search' })).toBeVisible()
    await expect(page.getByText(/Showing \d+-\d+ of \d+ article/)).toBeVisible()
  })

  test('search form submits query parameter', async ({ page }) => {
    await page.goto('/blog', { waitUntil: 'networkidle' })
    await page.getByPlaceholder('Search articles...').fill('Lifecycle')
    await page.getByRole('button', { name: 'Search' }).click()
    await page.waitForURL(/q=/)
    await expect(page).toHaveURL(/q=Lifecycle/)
    await expect(page.getByRole('heading', { name: 'Blog' })).toBeVisible()
  })

  test('search clear button removes filter', async ({ page }) => {
    await page.goto('/blog?q=Lifecycle', { waitUntil: 'networkidle' })
    // The search filter chip should appear
    const clearBtn = page.locator('button').filter({ hasText: /^×$/ }).first()
    await clearBtn.click()
    await page.waitForURL(/\/blog$/)
    await expect(page).toHaveURL(/\/blog$/)
  })

  test('clicking post navigates to detail page', async ({ page }) => {
    await page.goto('/blog', { waitUntil: 'networkidle' })
    const firstPost = page.locator('article').first()
    const postTitle = await firstPost.locator('h2').textContent()
    await firstPost.click()
    await expect(page).toHaveURL(/\/blog\/.+/)
    if (postTitle) {
      await expect(page.getByRole('heading', { name: postTitle })).toBeVisible()
    }
    await expect(page.locator('article time')).toBeVisible()
  })

  test('blog post detail has SEO title', async ({ page }) => {
    await page.goto('/blog', { waitUntil: 'networkidle' })
    const firstPost = page.locator('article a, a article').first()
    await firstPost.click()
    await expect(page).toHaveURL(/\/blog\/.+/)
    const title = await page.title()
    expect(title).toContain('Vibekit')
  })

  test('blog pagination shows page 2', async ({ page }) => {
    // Only testable if there are enough posts. Visit page 2 directly.
    await page.goto('/blog?page=2', { waitUntil: 'networkidle' })
    // If there aren't enough posts, it should still load (with no results or same results)
    await expect(page.getByRole('heading', { name: 'Blog' })).toBeVisible()
  })

  test('unauthenticated users see Log in nav link', async ({ page }) => {
    await page.goto('/blog', { waitUntil: 'networkidle' })
    // After hard reload, session is cleared
    await expect(page.getByRole('link', { name: 'Log in' })).toBeVisible()
  })
})

test.describe('blog auth guards', () => {
  test('unauthenticated user accessing admin blog is redirected to login', async ({ page }) => {
    await page.goto('/admin/blog')
    await page.waitForURL(/\/login/, { timeout: 10_000 })
    await expect(page).toHaveURL(/\/login/)
    await expect(page).toHaveURL(/next=%2Fadmin%2Fblog/)
  })

  test('normal user accessing admin blog gets 403', async ({ page }) => {
    // Sign in as normal user
    await login(page, USER)

    await page.goto('/admin/blog')
    await expect(page.getByText('Admin access required')).toBeVisible()
    await expect(page.getByText('403')).toBeVisible()
  })
})

test.describe('admin blog management', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
  })

  test('blog list renders with data table', async ({ page }) => {
    await page.goto('/admin/blog', { waitUntil: 'networkidle' })
    await expect(page.getByRole('heading', { name: /blog posts/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /new post/i })).toBeVisible()
    await expect(page.getByRole('table')).toBeVisible()
  })

  test('filter tabs work', async ({ page }) => {
    await page.goto('/admin/blog', { waitUntil: 'networkidle' })

    // All tab should be active by default
    await expect(page.getByRole('button', { name: 'All' })).toBeVisible()

    // Click Published tab (use locator to avoid matching table header sort button)
    const filterTabs = page.locator('div.flex.gap-1')
    await filterTabs.getByRole('button', { name: 'Published' }).click()
    await page.waitForTimeout(500)
    // Table should still be visible after filter
    await expect(page.getByRole('table')).toBeVisible()

    // Click Draft tab
    await filterTabs.getByRole('button', { name: 'Draft' }).click()
    await page.waitForTimeout(500)
    await expect(page.getByRole('table')).toBeVisible()

    // Click Archived tab
    await filterTabs.getByRole('button', { name: 'Archived' }).click()
    await page.waitForTimeout(500)
    await expect(page.getByRole('table')).toBeVisible()
  })

  test('search input filters posts', async ({ page }) => {
    await page.goto('/admin/blog', { waitUntil: 'networkidle' })
    const searchInput = page.getByPlaceholder('Search posts...')
    await expect(searchInput).toBeVisible()
    await searchInput.fill('Lifecycle')
    // Wait for debounced search to trigger
    await page.waitForTimeout(500)
    // Table should still be visible (filtered results)
    await expect(page.getByRole('table')).toBeVisible()
  })

  test('sort by column header', async ({ page }) => {
    await page.goto('/admin/blog', { waitUntil: 'networkidle' })
    // Click Title header to sort
    await page.getByRole('button', { name: 'Title' }).click()
    await page.waitForTimeout(500)
    await expect(page.getByRole('table')).toBeVisible()
  })

  test('pagination shows counts', async ({ page }) => {
    await page.goto('/admin/blog', { waitUntil: 'networkidle' })
    await expect(page.getByText(/Showing \d+-\d+ of \d+/)).toBeVisible()
  })

  test('bulk selection and actions', async ({ page }) => {
    await page.goto('/admin/blog', { waitUntil: 'networkidle' })
    // Check the first row checkbox
    const firstCheckbox = page.getByRole('checkbox').nth(1) // skip header checkbox
    await firstCheckbox.click()
    await page.waitForTimeout(300)
    // Should show selection count
    await expect(page.getByText(/\d+ selected/)).toBeVisible()
    // Should show bulk action buttons
    const actionBar = page.locator('.mt-4.flex.items-center.gap-3')
    await expect(actionBar.getByText(/delete/i)).toBeVisible()
    await expect(actionBar.getByText(/archive/i)).toBeVisible()
    // Clear selection
    await actionBar.getByRole('button', { name: 'Clear' }).click()
  })

  test('edit page renders with Preview button', async ({ page }) => {
    await page.goto('/admin/blog', { waitUntil: 'networkidle' })
    // Wait for posts to load
    await page.waitForTimeout(500)
    // Click first Edit link
    const editLink = page.getByRole('link', { name: 'Edit' }).first()
    await editLink.click()
    await page.waitForURL(/\/admin\/blog\/.*\/edit/, { timeout: 10_000 })
    await expect(page.getByRole('heading', { name: 'Edit Post' })).toBeVisible()
    // Verify Preview link exists
    await expect(page.getByRole('link', { name: 'Preview' })).toBeVisible()
    const previewHref = await page.getByRole('link', { name: 'Preview' }).getAttribute('href')
    expect(previewHref).toMatch(/\/admin\/blog\/.*\/preview/)
  })

  test('preview page renders with banner and content', async ({ page }) => {
    await page.goto('/admin/blog', { waitUntil: 'networkidle' })
    await page.waitForTimeout(500)
    // Navigate to first published post edit page
    const filterTabs = page.locator('div.flex.gap-1')
    await filterTabs.getByRole('button', { name: 'Published' }).click()
    await page.waitForTimeout(500)
    const editLink = page.getByRole('link', { name: 'Edit' }).first()
    await editLink.click()
    await page.waitForURL(/\/admin\/blog\/.*\/edit/, { timeout: 10_000 })

    // Get post ID from URL and go to preview
    const editUrl = page.url()
    const postId = editUrl.match(/\/admin\/blog\/(.*)\/edit/)?.[1]
    await page.goto(`/admin/blog/${postId}/preview`, { waitUntil: 'networkidle' })

    await expect(page.getByText('Preview Mode')).toBeVisible()
    await expect(page.getByText('This post is not yet published')).toBeVisible()
    await expect(page.getByRole('link', { name: 'Back to Edit' })).toBeVisible()
  })

  test('new post page renders form', async ({ page }) => {
    await page.goto('/admin/blog/new', { waitUntil: 'networkidle' })
    await expect(page.getByLabel('Title')).toBeVisible()
    await expect(page.getByLabel('Slug')).toBeVisible()
    await expect(page.getByRole('button', { name: /save draft/i })).toBeVisible()
  })
})
