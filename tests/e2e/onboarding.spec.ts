import { expect, test } from '@playwright/test'

import { ADMIN, login } from './helpers/auth'

test.describe.configure({ mode: 'serial' })

test.describe('onboarding flow', () => {
  test.describe('API endpoints', () => {
    test.beforeEach(async ({ page }) => {
      await login(page, ADMIN)
    })

    test('GET /api/user/onboarding returns status', async ({ page }) => {
      const res = await page.request.get('/api/user/onboarding')
      expect(res.status()).toBe(200)
      const data = await res.json()
      expect(typeof data.completed).toBe('boolean')
      expect(typeof data.step).toBe('number')
    })

    test('POST /api/user/onboarding saves step', async ({ page }) => {
      const res = await page.request.post('/api/user/onboarding', {
        data: { step: 2 },
        headers: { 'Content-Type': 'application/json' },
      })
      expect(res.status()).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)

      const getRes = await page.request.get('/api/user/onboarding')
      const getData = await getRes.json()
      expect(getData.step).toBe(2)
    })

    test('POST /api/user/onboarding saves completed', async ({ page }) => {
      const res = await page.request.post('/api/user/onboarding', {
        data: { completed: true },
        headers: { 'Content-Type': 'application/json' },
      })
      expect(res.status()).toBe(200)

      const getRes = await page.request.get('/api/user/onboarding')
      const getData = await getRes.json()
      expect(getData.completed).toBe(true)
    })

    test('POST /api/user/onboarding clamps step to valid range', async ({ page }) => {
      const res = await page.request.post('/api/user/onboarding', {
        data: { step: 10 },
        headers: { 'Content-Type': 'application/json' },
      })
      expect(res.status()).toBe(200)

      const getRes = await page.request.get('/api/user/onboarding')
      const getData = await getRes.json()
      expect(getData.step).toBeLessThanOrEqual(3)
    })

    test('POST /api/user/onboarding rejects unauthenticated', async ({ browser }) => {
      const context = await browser.newContext()
      const page = await context.newPage()
      const res = await page.request.post('/api/user/onboarding', {
        data: { step: 1 },
        headers: { 'Content-Type': 'application/json' },
      })
      expect(res.status()).toBeGreaterThanOrEqual(400)
      await context.close()
    })

    test('resets onboarding state for next test', async ({ page }) => {
      // Reset to completed so other tests are not affected
      await page.request.post('/api/user/onboarding', {
        data: { completed: true, step: 3 },
        headers: { 'Content-Type': 'application/json' },
      })
    })
  })

  test.describe('onboarding page', () => {
    test('renders onboarding wizard at /app/onboarding', async ({ page }) => {
      await login(page, ADMIN)
      await page.goto('/app/onboarding', { waitUntil: 'networkidle' })
      await expect(page.getByText('Welcome to Vibekit')).toBeVisible()
      await expect(page.getByText('Step 1 of 4')).toBeVisible()
      await expect(page.getByRole('button', { name: 'Get Started' })).toBeVisible()
      await expect(page.getByText('Skip for now')).toBeVisible()
    })

    test('shows progress bar', async ({ page }) => {
      await login(page, ADMIN)
      await page.goto('/app/onboarding', { waitUntil: 'networkidle' })
      const progressBar = page.locator('.bg-brand.transition-all')
      await expect(progressBar).toBeVisible()
    })

    test('can navigate to profile step', async ({ page }) => {
      await login(page, ADMIN)
      await page.goto('/app/onboarding', { waitUntil: 'networkidle' })
      await page.getByRole('button', { name: 'Get Started' }).click()
      await expect(page.getByText('Step 2 of 4')).toBeVisible()
      await expect(page.getByLabel('Display Name')).toBeVisible()
      await expect(page.getByLabel('Bio')).toBeVisible()
    })

    test('can navigate to timezone step', async ({ page }) => {
      await login(page, ADMIN)
      await page.goto('/app/onboarding', { waitUntil: 'networkidle' })
      await page.getByRole('button', { name: 'Get Started' }).click()
      await expect(page.getByText('Step 2 of 4')).toBeVisible()
      await page.getByRole('button', { name: 'Continue' }).click()
      await expect(page.getByText('Step 3 of 4')).toBeVisible()
    })

    test('can complete onboarding', async ({ page }) => {
      await login(page, ADMIN)
      await page.goto('/app/onboarding', { waitUntil: 'networkidle' })
      await page.getByRole('button', { name: 'Get Started' }).click()
      await page.getByRole('button', { name: 'Continue' }).first().click()
      await page.getByRole('button', { name: 'Continue' }).first().click()
      await expect(page.getByText("You're all set!")).toBeVisible()
      await page.getByRole('button', { name: 'Go to Dashboard' }).click()
      await expect(page).toHaveURL(/\/app\/dashboard/, { timeout: 10_000 })
    })

    test('dashboard shows welcome banner after onboarding', async ({ page }) => {
      await login(page, ADMIN)
      await page.goto('/app/dashboard?onboarded=true', { waitUntil: 'networkidle' })
      await expect(page.getByText('Your account is set up!')).toBeVisible()
    })

    test('welcome banner can be dismissed', async ({ page }) => {
      await login(page, ADMIN)
      await page.goto('/app/dashboard?onboarded=true', { waitUntil: 'networkidle' })
      await expect(page.getByText('Your account is set up!')).toBeVisible()
      await page.getByRole('button', { name: 'Dismiss' }).click()
      await expect(page.getByText('Your account is set up!')).not.toBeVisible()
    })
  })
})
