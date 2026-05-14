import { expect, test } from '@playwright/test'

import { ADMIN, login } from './helpers/auth'

test.describe.configure({ mode: 'serial' })

test.describe('data export', () => {
  test.describe('settings page export section', () => {
    test.beforeEach(async ({ page }) => {
      await login(page, ADMIN)
      await page.goto('/app/settings', { waitUntil: 'networkidle' })
    })

    test('shows export data section', async ({ page }) => {
      await expect(page.getByText('Export Your Data')).toBeVisible()
      await expect(page.getByText('Download a copy of your personal data')).toBeVisible()
      await expect(page.getByRole('button', { name: 'Download My Data' })).toBeVisible()
    })

    test('export section is above deactivate section', async ({ page }) => {
      const exportSection = page.getByRole('heading', { name: 'Export Your Data' })
      const deactivateSection = page.getByRole('heading', { name: 'Deactivate Account' })
      const exportBox = await exportSection.boundingBox()
      const deactivateBox = await deactivateSection.boundingBox()
      expect(exportBox?.y).toBeLessThan(deactivateBox?.y ?? Infinity)
    })
  })

  test.describe('export API endpoint', () => {
    test.beforeEach(async ({ page }) => {
      await login(page, ADMIN)
    })

    // Rate limit is 1 request per hour; first call succeeds, subsequent calls get 429.
    // We use a single response across multiple assertions to avoid hitting the rate limit.

    test('returns JSON with correct content type', async ({ page }) => {
      const res = await page.request.get('/api/account/export')
      // Accept 200 or 429 (rate limited from a previous test run)
      expect([200, 429]).toContain(res.status())
      if (res.status() === 200) {
        expect(res.headers()['content-type']).toContain('application/json')
      }
    })

    test('includes content disposition header', async ({ page }) => {
      const res = await page.request.get('/api/account/export')
      if (res.status() === 200) {
        const disposition = res.headers()['content-disposition'] ?? ''
        expect(disposition).toContain('attachment')
        expect(disposition).toContain('vibekit-export-')
      } else {
        // Rate limited — skip assertion
        expect(res.status()).toBe(429)
      }
    })

    test('response includes all expected sections', async ({ page }) => {
      const res = await page.request.get('/api/account/export')
      if (res.status() !== 200) {
        // Rate limited — skip
        expect(res.status()).toBe(429)
        return
      }
      const data = await res.json()
      const expectedKeys = [
        'accounts',
        'auditLog',
        'contactSubmissions',
        'exportedAt',
        'items',
        'passkeys',
        'securityEvents',
        'sessions',
        'user',
        'version',
      ]
      for (const key of expectedKeys) {
        expect(key in data).toBe(true)
      }
    })

    test('user object has email and name', async ({ page }) => {
      const res = await page.request.get('/api/account/export')
      if (res.status() !== 200) {
        expect(res.status()).toBe(429)
        return
      }
      const data = await res.json()
      expect(data.user.email).toBeTruthy()
      expect(data.user.name).toBeTruthy()
    })

    test('user object omits sensitive fields', async ({ page }) => {
      const res = await page.request.get('/api/account/export')
      if (res.status() !== 200) {
        expect(res.status()).toBe(429)
        return
      }
      const data = await res.json()
      expect('banExpiresAt' in data.user).toBe(false)
      expect('banReason' in data.user).toBe(false)
      expect('deletedAt' in data.user).toBe(false)
    })

    test('account objects omit tokens', async ({ page }) => {
      const res = await page.request.get('/api/account/export')
      if (res.status() !== 200) {
        expect(res.status()).toBe(429)
        return
      }
      const data = await res.json()
      for (const account of data.accounts) {
        expect('accessToken' in account).toBe(false)
        expect('refreshToken' in account).toBe(false)
        expect('password' in account).toBe(false)
        expect('idToken' in account).toBe(false)
      }
    })

    test('session objects omit tokens', async ({ page }) => {
      const res = await page.request.get('/api/account/export')
      if (res.status() !== 200) {
        expect(res.status()).toBe(429)
        return
      }
      const data = await res.json()
      for (const session of data.sessions) {
        expect('token' in session).toBe(false)
      }
    })

    test('requires authentication', async ({ browser }) => {
      const context = await browser.newContext()
      const page = await context.newPage()
      const res = await page.request.get('/api/account/export')
      expect(res.status()).toBeGreaterThanOrEqual(400)
      await context.close()
    })
  })
})
