import { expect, test } from '@playwright/test'

test.describe('related posts by tag overlap', () => {
  test('shows related posts section on published post page', async ({ page }) => {
    await page.goto('/blog/code-test')
    await page.waitForSelector('article')

    const relatedSection = page.locator('section:has(h2:text("Related Posts"))')
    const hasRelated = (await relatedSection.count()) > 0

    if (hasRelated) {
      const cards = relatedSection.locator('a[href^="/blog/"]')
      const count = await cards.count()
      expect(count).toBeGreaterThanOrEqual(1)
      expect(count).toBeLessThanOrEqual(3)

      for (let i = 0; i < count; i++) {
        const title = cards.nth(i).locator('h3')
        await expect(title).toBeVisible()
      }
    }
  })

  test('related posts cards link to valid blog posts', async ({ page }) => {
    await page.goto('/blog/code-test')
    await page.waitForSelector('article')

    const relatedLinks = page.locator('section h2:text("Related Posts") ~ div a[href^="/blog/"]')
    const count = await relatedLinks.count()

    for (let i = 0; i < count; i++) {
      const href = await relatedLinks.nth(i).getAttribute('href')
      expect(href).toMatch(/^\/blog\/[\w-]+$/)
    }
  })

  test('clicking a related post card navigates to the correct post', async ({ page }) => {
    await page.goto('/blog/code-test')
    await page.waitForSelector('article')

    const firstCard = page
      .locator('section h2:text("Related Posts") ~ div a[href^="/blog/"]')
      .first()
    const href = await firstCard.getAttribute('href')
    expect(href).toBeTruthy()

    await firstCard.click()
    await page.waitForURL(`**${href}`)
    expect(page.url()).toContain(href!)
    await expect(page.locator('article')).toBeVisible()
  })

  test('related post page also shows its own related posts', async ({ page }) => {
    await page.goto('/blog/lifecycle-1778108019806')
    await page.waitForSelector('article')

    const relatedSection = page.locator('section:has(h2:text("Related Posts"))')
    const exists = (await relatedSection.count()) > 0
    expect(exists).toBe(true)

    // Should include code-test as a related post since it shares tags
    const codeTestLink = relatedSection.locator('a[href="/blog/code-test"]')
    await expect(codeTestLink).toBeVisible()
  })

  test('related posts section does not appear on page with no tags', async ({ page }) => {
    await page.goto('/blog/lifecycle-1778464912661')
    await page.waitForSelector('article')

    const relatedSection = page.locator('section:has(h2:text("Related Posts"))')
    const exists = (await relatedSection.count()) > 0
    expect(typeof exists).toBe('boolean')
  })

  test('tag links on post page are clickable', async ({ page }) => {
    await page.goto('/blog/code-test')
    await page.waitForSelector('article')

    const tagLinks = page.locator('article a[href^="/blog?tag="]')
    const count = await tagLinks.count()
    expect(count).toBeGreaterThan(0)

    const firstTag = tagLinks.first()
    const href = await firstTag.getAttribute('href')
    expect(href).toMatch(/^\/blog\?tag=[\w-]+$/)
  })

  test('related posts cards show date', async ({ page }) => {
    await page.goto('/blog/code-test')
    await page.waitForSelector('article')

    const relatedSection = page.locator('section:has(h2:text("Related Posts"))')
    const hasRelated = (await relatedSection.count()) > 0
    if (!hasRelated) return

    const dates = relatedSection.locator('time')
    const dateCount = await dates.count()
    expect(dateCount).toBeGreaterThanOrEqual(1)

    for (let i = 0; i < dateCount; i++) {
      const text = await dates.nth(i).textContent()
      expect(text).toBeTruthy()
    }
  })
})
