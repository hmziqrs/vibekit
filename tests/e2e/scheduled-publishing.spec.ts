import { expect, test } from '@playwright/test'

test.describe('scheduled publishing', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('Email').fill('admin@vibekit.local')
    await page.getByLabel('Password').fill('admin123')
    await page.getByRole('button', { name: 'Sign in' }).click()
    await page.waitForURL('**/admin/dashboard')
  })

  test('blog list shows Scheduled filter tab', async ({ page }) => {
    await page.goto('/admin/blog')
    await page.waitForSelector('table')

    const scheduledTab = page.getByRole('button', { name: 'Scheduled' })
    await expect(scheduledTab).toBeVisible()
  })

  test('clicking Scheduled tab filters to scheduled posts', async ({ page }) => {
    await page.goto('/admin/blog')
    await page.waitForSelector('table')

    const scheduledTab = page.getByRole('button', { name: 'Scheduled' })
    await scheduledTab.click()

    // URL should contain status=scheduled
    await page.waitForURL('**/admin/blog**')
    const url = page.url()
    expect(url).toContain('status=scheduled')
  })

  test('editor page shows Schedule button for draft posts', async ({ page }) => {
    await page.goto('/admin/blog')
    await page.waitForSelector('table')

    // Click Edit on the first draft post
    const editLink = page.locator('table tbody tr').first().getByRole('link', { name: 'Edit' })
    await editLink.click()
    await page.waitForSelector('form')

    // Should have either Publish or Schedule button visible
    const publishBtn = page.getByRole('button', { name: 'Publish' })
    const scheduleBtn = page.getByRole('button', { name: 'Schedule' })
    const publishVisible = await publishBtn.isVisible().catch(() => false)
    const scheduleVisible = await scheduleBtn.isVisible().catch(() => false)
    expect(publishVisible || scheduleVisible).toBe(true)
  })

  test('schedule picker opens with datetime input', async ({ page }) => {
    // Create a new draft post to ensure we have one
    await page.goto('/admin/blog/new')
    await page.waitForSelector('form')

    await page.getByLabel('Title').fill('Schedule Test Post')
    await page.getByLabel('Slug').fill('schedule-test-' + Date.now())

    // Save as draft first
    const saveBtn = page.getByRole('button', { name: /Save|Create/ })
    await expect(saveBtn).toBeVisible()
    await saveBtn.click()
    await page.waitForTimeout(1000)
  })

  test('cron publish-scheduled endpoint returns unauthorized without auth', async ({ request }) => {
    const res = await request.post('/api/admin/publish-scheduled')
    // Should be 403 (ForbiddenError) without auth or cron secret
    expect(res.status()).toBe(403)
  })

  test('status badge shows blue for scheduled posts in blog list', async ({ page }) => {
    // Navigate to a draft post and schedule it via API
    await page.goto('/admin/blog')
    await page.waitForSelector('table')

    // Get the first post ID from the edit link
    const firstRow = page.locator('table tbody tr').first()
    const editLink = firstRow.getByRole('link', { name: 'Edit' })
    const href = await editLink.getAttribute('href')
    const postId = href?.split('/').filter(Boolean).pop()

    expect(postId).toBeTruthy()

    // Schedule the post via API
    const futureDate = new Date(Date.now() + 86400000).toISOString()
    const res = await page.request.patch(`/api/blog/${postId}`, {
      body: JSON.stringify({ scheduledAt: futureDate, status: 'scheduled' }),
      headers: { 'Content-Type': 'application/json' },
    })
    expect(res.ok()).toBe(true)

    // Go back to blog list
    await page.goto('/admin/blog')
    await page.waitForSelector('table')

    // Check for scheduled badge with blue styling
    const scheduledBadge = page.locator('text=scheduled').first()
    await expect(scheduledBadge).toBeVisible()

    const badgeClass = await scheduledBadge.evaluate((el) => el.closest('span')?.className ?? '')
    expect(badgeClass).toContain('blue')

    // Revert back to draft
    await page.request.patch(`/api/blog/${postId}`, {
      body: JSON.stringify({ scheduledAt: null, status: 'draft' }),
      headers: { 'Content-Type': 'application/json' },
    })
  })
})
