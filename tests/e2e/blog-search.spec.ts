import { expect, test } from '@playwright/test'

test.describe('blog content search', () => {
  test('admin blog search finds posts by content body', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('Email').fill('admin@vibekit.local')
    await page.getByLabel('Password').fill('admin123')
    await page.getByRole('button', { name: 'Sign in' }).click()
    await page.waitForURL('**/admin/dashboard')

    await page.goto('/admin/blog')
    await page.waitForSelector('table')

    // "image" appears in Drag Reorder Test's content body but not in its title
    const searchInput = page.getByPlaceholder('Search posts...')
    await searchInput.fill('image')

    // Wait for debounced search to complete
    await page.waitForTimeout(500)

    // Should find posts that contain "image" in their content body
    const rows = page.locator('table tbody tr')
    const count = await rows.count()
    expect(count).toBeGreaterThan(0)

    // Drag Reorder Test should be in results (its content contains "image")
    const dragReorderRow = page.getByText('Drag Reorder Test')
    await expect(dragReorderRow).toBeVisible()
  })

  test('admin blog search returns empty for non-matching query', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('Email').fill('admin@vibekit.local')
    await page.getByLabel('Password').fill('admin123')
    await page.getByRole('button', { name: 'Sign in' }).click()
    await page.waitForURL('**/admin/dashboard')

    await page.goto('/admin/blog')
    await page.waitForSelector('table')

    const searchInput = page.getByPlaceholder('Search posts...')
    await searchInput.fill('xyznonexistentquery12345')

    await page.waitForTimeout(500)

    // Should show empty state
    const rows = page.locator('table tbody tr')
    const count = await rows.count()
    expect(count).toBe(0)
  })

  test('public blog search finds published posts by content', async ({ page }) => {
    // "highlight" appears in Code Highlighting Test's content body
    await page.goto('/blog?q=highlight')
    await page.waitForSelector('article')

    // Should find the published post
    const postTitle = page.getByText('Code Highlighting Test')
    await expect(postTitle).toBeVisible()

    // Should show result count
    const countText = page.getByText(/Showing.*article/)
    await expect(countText).toBeVisible()
  })

  test('public blog search excludes draft posts', async ({ page }) => {
    // "reorder" only appears in draft posts (Drag Reorder Test)
    await page.goto('/blog?q=reorder')

    // Should show no results since the matching post is draft
    const noResults = page.getByText('No articles match')
    await expect(noResults).toBeVisible()
  })

  test('admin blog search clears and shows all posts', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('Email').fill('admin@vibekit.local')
    await page.getByLabel('Password').fill('admin123')
    await page.getByRole('button', { name: 'Sign in' }).click()
    await page.waitForURL('**/admin/dashboard')

    await page.goto('/admin/blog')
    await page.waitForSelector('table')

    // Search for something
    const searchInput = page.getByPlaceholder('Search posts...')
    await searchInput.fill('image')
    await page.waitForTimeout(500)

    // Clear search
    await searchInput.clear()
    await page.waitForTimeout(500)

    // Should show all posts again
    const rows = page.locator('table tbody tr')
    const count = await rows.count()
    expect(count).toBeGreaterThan(3)
  })
})
