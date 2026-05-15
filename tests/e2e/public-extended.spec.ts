import { expect, test } from '@playwright/test'

test.describe('public pages — extended coverage', () => {
  test('terms page loads with version info', async ({ page }) => {
    await page.goto('/terms')
    await expect(page.getByRole('heading', { name: 'Terms of Service' })).toBeVisible()
    await expect(page.getByText('Version 2')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Acceptance' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Limitation of Liability' })).toBeVisible()
  })

  test('privacy page loads', async ({ page }) => {
    await page.goto('/privacy')
    await expect(page.getByRole('heading', { name: 'Privacy Policy' })).toBeVisible()
  })

  test('docs page loads with API documentation', async ({ page }) => {
    await page.goto('/docs')
    await expect(page.getByRole('heading', { name: 'API Documentation' })).toBeVisible()
    await expect(page.getByText('Quick Start')).toBeVisible()
    await expect(page.getByText('Create an API Key')).toBeVisible()
  })

  test('docs page has code examples in multiple languages', async ({ page }) => {
    await page.goto('/docs')
    await expect(page.getByRole('button', { name: 'curl' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'javascript' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'python' })).toBeVisible()
  })

  test('docs page has authentication section', async ({ page }) => {
    await page.goto('/docs')
    await page.getByRole('button', { name: 'authentication' }).click()
    await expect(page.getByText(/Bearer/i)).toBeVisible()
  })

  test('robots.txt returns valid content', async ({ page }) => {
    const response = await page.goto('/robots.txt')
    expect(response?.status()).toBe(200)
    const body = await response?.text()
    expect(body).toContain('User-agent: *')
    expect(body).toContain('Allow: /')
    expect(body).toContain('Sitemap:')
    expect(body).toContain('/sitemap.xml')
    // Should use dynamic origin, not hardcoded
    expect(body).toContain('localhost')
  })

  test('sitemap.xml returns valid XML', async ({ page }) => {
    const response = await page.goto('/sitemap.xml')
    expect(response?.status()).toBe(200)
    const body = await response?.text()
    expect(body).toContain('<?xml')
    expect(body).toContain('<urlset')
    expect(body).toContain('<url>')
    expect(body).toContain('<loc>')
  })

  test('blog feed.xml returns valid RSS', async ({ page }) => {
    const response = await page.goto('/blog/feed.xml')
    expect(response?.status()).toBe(200)
    const body = await response?.text()
    expect(body).toContain('<?xml')
    expect(body).toContain('<rss')
    expect(body).toContain('<channel')
    expect(body).toContain('Vibekit Blog')
    expect(body).toContain('<atom:link')
    // Origin should be dynamic
    expect(body).toContain('localhost')
  })

  test('blog index has search functionality', async ({ page }) => {
    await page.goto('/blog')
    await expect(page.getByRole('heading', { name: 'Blog' })).toBeVisible()
    const searchBox = page.getByPlaceholder(/search/i)
    await expect(searchBox).toBeVisible()
  })

  test('contact page loads with form', async ({ page }) => {
    await page.goto('/contact')
    await expect(page.getByRole('heading', { name: /contact/i })).toBeVisible()
  })

  test('cookie consent dialog has accept button', async ({ page }) => {
    await page.goto('/')
    const dialog = page.getByRole('dialog', { name: /cookie/i })
    if (await dialog.isVisible({ timeout: 3000 }).catch(() => false)) {
      const acceptBtn = page.getByRole('button', { name: 'Accept' })
      await expect(acceptBtn).toBeVisible()
      const declineBtn = page.getByRole('button', { name: 'Decline' })
      await expect(declineBtn).toBeVisible()
    }
  })

  test('cookie consent can be interacted with', async ({ page }) => {
    await page.goto('/?t=' + Date.now())
    const dialog = page.getByRole('dialog', { name: /cookie/i })
    if (await dialog.isVisible({ timeout: 3000 }).catch(() => false)) {
      await page.getByRole('button', { name: 'Decline' }).click()
      // Wait for animation/state change
      await page.waitForTimeout(500)
    }
  })

  test('newsletter subscription form exists on blog', async ({ page }) => {
    await page.goto('/blog')
    await expect(page.getByText('Subscribe to the newsletter').first()).toBeVisible()
    await expect(page.getByPlaceholder('your@email.com').first()).toBeVisible()
  })

  test('skip to content link exists', async ({ page }) => {
    await page.goto('/')
    const skipLink = page.getByRole('link', { name: 'Skip to content' })
    await expect(skipLink).toBeAttached()
  })

  test('footer has legal links', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('link', { name: 'Privacy Policy' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Terms of Service' })).toBeVisible()
  })

  test('footer has social links', async ({ page }) => {
    await page.goto('/')
    // Footer may have multiple GitHub links — just check at least one exists
    const githubLinks = page.getByRole('link', { name: 'GitHub' })
    await expect(githubLinks.first()).toBeVisible()
  })

  test('pricing page shows two plans', async ({ page }) => {
    await page.goto('/pricing')
    const starter = page.getByRole('heading', { exact: true, name: 'Starter' })
    const pro = page.getByRole('heading', { exact: true, name: 'Pro' })
    await expect(starter).toBeVisible()
    await expect(pro).toBeVisible()
  })

  test('404 page works for unknown routes', async ({ page }) => {
    const response = await page.goto('/this-page-does-not-exist-at-all')
    expect(response?.status()).toBe(404)
  })
})
