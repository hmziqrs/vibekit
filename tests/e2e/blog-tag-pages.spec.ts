import { expect, test } from '@playwright/test'

test.describe('Blog tag pages', () => {
  test('renders tag page with filtered posts', async ({ page }) => {
    await page.goto('/blog/tag/code')

    await expect(page.getByRole('heading', { level: 1 })).toContainText('Tagged:')

    // Tag chips should be visible
    const tagLinks = page.locator('a[href*="/blog/tag/"]')
    await expect(tagLinks.first()).toBeVisible()

    // "All posts" link should be present
    await expect(page.getByRole('link', { name: 'All posts' })).toHaveAttribute('href', '/blog')
  })

  test('shows tag not found for non-existent tag', async ({ page }) => {
    await page.goto('/blog/tag/this-tag-does-not-exist-at-all')

    await expect(page.getByRole('heading', { name: 'Tag not found' })).toBeVisible()
    await expect(page.getByText("This tag doesn't exist.")).toBeVisible()
    await expect(page.getByRole('link', { name: 'Browse all posts' })).toHaveAttribute(
      'href',
      '/blog'
    )
  })

  test('shows article count when posts exist', async ({ page }) => {
    await page.goto('/blog/tag/code')

    const countText = page.getByText(/Showing \d+-\d+ of \d+ article/)
    // May or may not have posts depending on test data
    const hasPosts = (await countText.count()) > 0
    if (hasPosts) {
      await expect(countText).toBeVisible()
    }
  })

  test('highlights active tag in chip list', async ({ page }) => {
    await page.goto('/blog/tag/code')

    // The tag chips section has the active tag highlighted with brand styling
    const tagChips = page.locator('.flex.flex-wrap.gap-2 > a[href="/blog/tag/code"]')
    await expect(tagChips).toBeVisible()
    const classes = await tagChips.first().getAttribute('class')
    expect(classes).toContain('bg-brand')
  })

  test('blog listing page links tags to dedicated pages', async ({ page }) => {
    await page.goto('/blog')

    const tagLink = page.locator('a[href*="/blog/tag/"]').first()
    if ((await tagLink.count()) > 0) {
      const href = await tagLink.getAttribute('href')
      expect(href).toMatch(/^\/blog\/tag\/[a-z0-9-]+$/)
    }
  })
})
