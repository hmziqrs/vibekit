import { expect, test } from '@playwright/test'

import { loginAsAdmin } from './helpers/auth'

test.describe('notification bell', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
  })

  test('notification bell renders in header', async ({ page }) => {
    await page.goto('/app/dashboard', { waitUntil: 'networkidle' })
    const bell = page.getByRole('button', { name: 'Notifications' })
    await expect(bell).toBeVisible()
  })

  test('clicking bell opens dropdown', async ({ page }) => {
    await page.goto('/app/dashboard', { waitUntil: 'networkidle' })
    const bell = page.getByRole('button', { name: 'Notifications' })
    await bell.click()
    // Dropdown should show either "Mark all read" (if unread) or loading/empty state
    await expect(
      page.getByText('Notifications').or(page.getByText('No notifications')).first()
    ).toBeVisible()
  })

  test('dropdown shows empty state when no notifications', async ({ page }) => {
    await page.goto('/app/dashboard', { waitUntil: 'networkidle' })
    const bell = page.getByRole('button', { name: 'Notifications' })
    await bell.click()
    await expect(page.getByText('Loading...').or(page.getByText('No notifications'))).toBeVisible()
  })
})

test.describe('notifications page', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
  })

  test('notifications page renders', async ({ page }) => {
    await page.goto('/app/notifications', { waitUntil: 'networkidle' })
    await expect(page.getByRole('heading', { name: 'Notifications' })).toBeVisible()
  })

  test('filter dropdowns are present', async ({ page }) => {
    await page.goto('/app/notifications', { waitUntil: 'networkidle' })
    const typeFilter = page.locator('select').first()
    await expect(typeFilter).toBeVisible()
  })

  test('mark all read button exists', async ({ page }) => {
    await page.goto('/app/notifications', { waitUntil: 'networkidle' })
    await expect(page.getByRole('button', { name: 'Mark all read' })).toBeVisible()
  })

  test('sidebar shows notifications link', async ({ page }) => {
    await page.goto('/app/dashboard', { waitUntil: 'networkidle' })
    await expect(page.getByRole('link', { name: 'Notifications' })).toBeVisible()
  })

  test('navigating to notifications via sidebar works', async ({ page }) => {
    await page.goto('/app/dashboard', { waitUntil: 'networkidle' })
    await page.getByRole('link', { name: 'Notifications' }).click()
    await expect(page).toHaveURL(/\/app\/notifications/)
    await expect(page.getByRole('heading', { name: 'Notifications' })).toBeVisible()
  })
})

test.describe('admin broadcast API', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
  })

  test('broadcast endpoint rejects missing title', async ({ page }) => {
    const response = await page.evaluate(async () => {
      const res = await fetch('/api/admin/notifications/broadcast', {
        body: JSON.stringify({ target: 'all' }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      })
      return { ok: res.ok, status: res.status }
    })
    expect(response.ok).toBeFalsy()
  })

  test('broadcast endpoint rejects invalid target', async ({ page }) => {
    const response = await page.evaluate(async () => {
      const res = await fetch('/api/admin/notifications/broadcast', {
        body: JSON.stringify({ target: 'invalid', title: 'Test' }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      })
      return { ok: res.ok, status: res.status }
    })
    expect(response.ok).toBeFalsy()
  })
})

test.describe('notification preferences API', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
  })

  test('preferences endpoint returns data', async ({ page }) => {
    const response = await page.evaluate(async () => {
      const res = await fetch('/api/notifications/preferences')
      return (await res.json()) as { preferences: unknown[] }
    })
    expect(response).toHaveProperty('preferences')
    expect(Array.isArray(response.preferences)).toBeTruthy()
  })

  test('preferences patch rejects invalid channel', async ({ page }) => {
    const response = await page.evaluate(async () => {
      const res = await fetch('/api/notifications/preferences', {
        body: JSON.stringify({ channel: 'sms', enabled: true, type: 'broadcast' }),
        headers: { 'Content-Type': 'application/json' },
        method: 'PATCH',
      })
      return { ok: res.ok, status: res.status }
    })
    expect(response.ok).toBeFalsy()
  })

  test('preferences patch accepts valid input', async ({ page }) => {
    const response = await page.evaluate(async () => {
      const res = await fetch('/api/notifications/preferences', {
        body: JSON.stringify({ channel: 'in_app', enabled: false, type: 'broadcast' }),
        headers: { 'Content-Type': 'application/json' },
        method: 'PATCH',
      })
      return { ok: res.ok, status: res.status }
    })
    expect(response.ok).toBeTruthy()
  })
})
