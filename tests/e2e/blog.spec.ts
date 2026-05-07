import { expect, test } from '@playwright/test'

test.describe('blog pages', () => {
  test('blog index shows seeded posts', async ({ page }) => {
    await page.goto('/blog', { waitUntil: 'networkidle' })
    await expect(page.getByRole('heading', { name: 'Blog' })).toBeVisible()
    await expect(page.getByText('Getting Started with SvelteKit 2')).toBeVisible()
    await expect(page.getByText('Building a SaaS Product on Cloudflare Workers')).toBeVisible()
  })

  test('clicking post navigates to detail page', async ({ page }) => {
    await page.goto('/blog', { waitUntil: 'networkidle' })
    await page.getByText('Getting Started with SvelteKit 2').click()
    await expect(page).toHaveURL('/blog/getting-started-with-sveltekit-2')
    await expect(
      page.getByRole('heading', { name: 'Getting Started with SvelteKit 2' })
    ).toBeVisible()
    await expect(page.locator('article .prose')).toBeVisible()
    await expect(page.locator('article time')).toBeVisible()
  })

  test('draft slug redirects to blog index', async ({ page }) => {
    await page.goto('/blog/future-of-edge-computing-web-developers')
    await page.waitForURL('**/blog', { timeout: 5000 })
    await expect(page).toHaveURL('/blog')
  })

  test('invalid slug redirects to blog index', async ({ page }) => {
    await page.goto('/blog/nonexistent-post-xyz')
    await page.waitForURL('**/blog', { timeout: 5000 })
    await expect(page).toHaveURL('/blog')
  })
})
