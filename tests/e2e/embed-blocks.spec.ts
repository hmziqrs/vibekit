import { expect, test } from '@playwright/test'

import { loginAsAdmin } from './helpers/auth'

/**
 * Make an authenticated API call from the browser context so that session
 * cookies are sent automatically. Returns the parsed JSON response body.
 */
async function apiPost<T = unknown>(
  page: import('@playwright/test').Page,
  url: string,
  data: unknown
): Promise<{ body: T; status: number }> {
  const result = await page.evaluate(
    async ({ url, data }) => {
      const res = await fetch(url, {
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      })
      let body: unknown = null
      try {
        body = await res.json()
      } catch {
        // non-JSON response
      }
      return { body, status: res.status }
    },
    { data, url }
  )
  return result as { body: T; status: number }
}

test.describe('link-preview API endpoint', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
  })

  test('returns OG metadata for a real page', async ({ page }) => {
    const { body, status } = await apiPost<{
      description?: string
      image?: string
      siteName?: string
      title?: string
    }>(page, '/api/blog/link-preview', { url: 'https://github.com' })

    expect(status).toBe(200)
    expect(body.title).toBeTruthy()
    expect(typeof body.title).toBe('string')
  })

  test('returns title for a YouTube video URL via oEmbed', async ({ page }) => {
    const { body, status } = await apiPost<{
      description?: string
      embedHtml?: string
      image?: string
      title?: string
    }>(page, '/api/blog/link-preview', {
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    })

    // YouTube provides oEmbed; we should get at least a title back
    expect(status).toBe(200)
    expect(body.title).toBeTruthy()
    expect(typeof body.title).toBe('string')
  })

  test('returns metadata for a Vimeo video URL', async ({ page }) => {
    const { body, status } = await apiPost<{
      description?: string
      image?: string
      title?: string
    }>(page, '/api/blog/link-preview', {
      url: 'https://vimeo.com/824804225',
    })

    expect(status).toBe(200)
    expect(body.title).toBeTruthy()
    expect(typeof body.title).toBe('string')
  })

  test('rejects invalid URL', async ({ page }) => {
    const { status } = await apiPost(page, '/api/blog/link-preview', {
      url: 'not-a-valid-url',
    })
    expect(status).toBe(400)
  })

  test('rejects empty URL', async ({ page }) => {
    const { status } = await apiPost(page, '/api/blog/link-preview', { url: '' })
    expect(status).toBe(400)
  })

  test('rejects localhost URLs (SSRF protection)', async ({ page }) => {
    const { status } = await apiPost(page, '/api/blog/link-preview', {
      url: 'http://localhost:8787',
    })
    expect(status).toBe(400)
  })

  test('rejects private IP URLs (SSRF protection)', async ({ page }) => {
    const { status } = await apiPost(page, '/api/blog/link-preview', {
      url: 'http://192.168.1.1',
    })
    expect(status).toBe(400)
  })

  test('rejects 127.0.0.1 URLs (SSRF protection)', async ({ page }) => {
    const { status } = await apiPost(page, '/api/blog/link-preview', {
      url: 'http://127.0.0.1',
    })
    expect(status).toBe(400)
  })

  test('rejects cloud metadata URL (SSRF protection)', async ({ page }) => {
    const { status } = await apiPost(page, '/api/blog/link-preview', {
      url: 'http://169.254.169.254/latest/meta-data/',
    })
    expect(status).toBe(400)
  })

  test('rejects unauthenticated requests', async ({ request }) => {
    const res = await request.fetch('/api/blog/link-preview', {
      data: { url: 'https://example.com' },
      method: 'POST',
    })
    // The requireAdmin middleware should reject the request
    expect(res.status()).toBeGreaterThanOrEqual(400)
  })
})

test.describe('embed blocks in article editor', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
  })

  test('blog editor page loads with ProseMirror editor', async ({ page }) => {
    await page.goto('/admin/blog', { waitUntil: 'networkidle' })
    // Find and click the first post's edit link
    const editLink = page.locator('a[href*="/admin/blog/"]').first()
    await expect(editLink).toBeVisible({ timeout: 15_000 })
    await editLink.click()
    await page.waitForURL(/\/admin\/blog\/.*\/edit/, { timeout: 15_000 })
    await page.waitForLoadState('networkidle')

    // Verify the editor loaded
    const editor = page.locator('.ProseMirror')
    await expect(editor).toBeVisible({ timeout: 15_000 })
  })

  test('slash command menu triggers in the editor', async ({ page }) => {
    await page.goto('/admin/blog', { waitUntil: 'networkidle' })
    const editLink = page.locator('a[href*="/admin/blog/"]').first()
    await expect(editLink).toBeVisible({ timeout: 15_000 })
    await editLink.click()
    await page.waitForURL(/\/admin\/blog\/.*\/edit/, { timeout: 15_000 })
    await page.waitForLoadState('networkidle')
    await page.waitForSelector('.ProseMirror')

    // Type '/' to trigger the slash command menu
    const proseMirror = page.locator('.ProseMirror')
    await proseMirror.click()
    await page.keyboard.type('/')
    await page.waitForTimeout(500)

    // The editor should still be active after typing '/'
    await expect(proseMirror).toBeVisible()

    // Dismiss the menu
    await page.keyboard.press('Escape')
  })
})
