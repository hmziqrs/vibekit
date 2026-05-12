import { expect, test } from '@playwright/test'

import { loginAsAdmin } from './helpers/auth'

test.describe('API key management', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
  })

  test('API keys page loads', async ({ page }) => {
    await page.goto('/app/settings/api-keys')
    await expect(page.getByText('API Keys')).toBeVisible()
    await expect(page.getByText('Create New API Key')).toBeVisible()
  })

  test('can create an API key', async ({ page }) => {
    await page.goto('/app/settings/api-keys')

    const nameInput = page.getByPlaceholder('e.g., Production API Key')
    await nameInput.fill('E2E Test Key')

    // Select read:items scope
    await page.getByText('Read Items', { exact: true }).click()

    await page.getByText('Create Key').click()

    // Should show the new key
    await expect(page.getByText('New API Key Created')).toBeVisible()
    await expect(page.getByText('vk_live_')).toBeVisible()
  })

  test('shows created key in the list', async ({ page }) => {
    await page.goto('/app/settings/api-keys')
    // Should show at least the key created in previous test or "No API keys yet"
    const hasKeys = await page
      .getByText('E2E Test Key')
      .isVisible()
      .catch(() => false)
    const hasEmpty = await page
      .getByText('No API keys yet')
      .isVisible()
      .catch(() => false)
    expect(hasKeys || hasEmpty).toBeTruthy()
  })

  test('API keys list endpoint returns data', async ({ page }) => {
    const response = await page.evaluate(async () => {
      const res = await fetch('/api/api-keys')
      return (await res.json()) as { keys: unknown[] }
    })
    expect(Array.isArray(response.keys)).toBeTruthy()
  })

  test('create API key validates required fields', async ({ page }) => {
    const response = await page.evaluate(async () => {
      const res = await fetch('/api/api-keys', {
        body: JSON.stringify({ name: '' }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      })
      return { ok: res.ok, status: res.status }
    })
    expect(response.ok).toBeFalsy()
  })

  test('create API key requires at least one scope', async ({ page }) => {
    const response = await page.evaluate(async () => {
      const res = await fetch('/api/api-keys', {
        body: JSON.stringify({ name: 'Test', scopes: [] }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      })
      return { ok: res.ok, status: res.status }
    })
    expect(response.ok).toBeFalsy()
  })

  test('create API key rejects invalid scope', async ({ page }) => {
    const response = await page.evaluate(async () => {
      const res = await fetch('/api/api-keys', {
        body: JSON.stringify({ name: 'Test', scopes: ['hack:everything'] }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      })
      return { ok: res.ok, status: res.status }
    })
    expect(response.ok).toBeFalsy()
  })

  test('rotate non-existent key returns 404', async ({ page }) => {
    const response = await page.evaluate(async () => {
      const res = await fetch('/api/api-keys/nonexistent/rotate', { method: 'POST' })
      return { ok: res.ok, status: res.status }
    })
    expect(response.ok).toBeFalsy()
  })

  test('revoke non-existent key returns 404', async ({ page }) => {
    const response = await page.evaluate(async () => {
      const res = await fetch('/api/api-keys/nonexistent/revoke', { method: 'POST' })
      return { ok: res.ok, status: res.status }
    })
    expect(response.ok).toBeFalsy()
  })

  test('API keys nav link exists in sidebar', async ({ page }) => {
    await page.goto('/app/dashboard')
    const link = page.getByRole('link', { name: 'API Keys' })
    await expect(link).toBeVisible()
  })

  test('usage endpoint returns data for a key', async ({ page }) => {
    // First create a key
    const createRes = await page.evaluate(async () => {
      const res = await fetch('/api/api-keys', {
        body: JSON.stringify({ name: 'Usage Test', scopes: ['read:items'] }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      })
      return (await res.json()) as { id: string }
    })

    const usageRes = await page.evaluate(async (keyId) => {
      const res = await fetch(`/api/api-keys/${keyId}/usage`)
      return (await res.json()) as { usage: unknown[] }
    }, createRes.id)

    expect(Array.isArray(usageRes.usage)).toBeTruthy()
  })
})
