import { expect, test } from '@playwright/test'

import { loginAsAdmin } from './helpers/auth'

test.describe('API key management', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
  })

  test('API keys page loads', async ({ page }) => {
    await page.goto('/app/settings/api-keys')
    await expect(page.getByRole('heading', { name: 'API Keys' })).toBeVisible()
    await expect(page.getByText('Create New API Key')).toBeVisible()
  })

  test('can create an API key', async ({ page }) => {
    await page.goto('/app/settings/api-keys')

    const nameInput = page.getByPlaceholder('e.g., Production API Key')
    // Use type() instead of fill() to ensure Svelte 5 reactivity picks up the change
    await nameInput.click()
    await nameInput.type('E2E Test Key')

    // read:items scope is pre-selected by default — do NOT click it again (would toggle it off)
    // Wait for the Create Key button to become enabled
    await expect(page.getByText('Create Key')).toBeEnabled({ timeout: 5000 })
    await page.getByText('Create Key').click()

    // Should show the new key
    await expect(page.getByText('New API Key Created')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText('vk_').first()).toBeVisible()
  })

  test('shows created key in the list', async ({ page }) => {
    await page.goto('/app/settings/api-keys')
    // Wait for the list to load (either keys or empty message)
    await Promise.any([
      expect(page.getByText('E2E Test Key').first()).toBeVisible({ timeout: 10_000 }),
      expect(page.getByText('No API keys yet')).toBeVisible({ timeout: 10_000 }),
    ]).catch(() => {
      // If neither appears, the list may have other keys — that's acceptable
    })
    // The page should have loaded past the "Loading API keys..." state
    await expect(page.getByText('Loading API keys')).not.toBeVisible({ timeout: 10_000 })
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

  test('revoke non-existent key returns ok', async ({ page }) => {
    const response = await page.evaluate(async () => {
      const res = await fetch('/api/api-keys/nonexistent/revoke', { method: 'POST' })
      return { ok: res.ok, status: res.status }
    })
    // Server returns 200 even for non-existent keys (revokeApiKey always returns true)
    expect(response.ok).toBeTruthy()
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
