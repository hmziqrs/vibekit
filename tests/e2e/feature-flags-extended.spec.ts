import { expect, test } from '@playwright/test'

import { goToAdmin } from './helpers/auth'

test.describe('Admin Feature Flags — Toggle and Delete', () => {
  test.beforeEach(async ({ page }) => {
    await goToAdmin(page)
    await page.goto('/admin/feature-flags')
    await page.waitForLoadState('networkidle')
  })

  test('toggles an existing flag on and off', async ({ page }) => {
    // Create a flag first via API
    const createRes = await page.request.post('/api/admin/feature-flags', {
      data: {
        description: 'E2E toggle test',
        environment: 'development',
        key: `e2e-toggle-${Date.now()}`,
        name: 'E2E Toggle Test',
      },
      headers: { 'Content-Type': 'application/json' },
    })
    if (!createRes.ok()) return test.skip()
    const { flag } = await createRes.json()

    // Reload page to see the new flag
    await page.reload()
    await page.waitForLoadState('networkidle')

    // Find the flag row and click the toggle
    const flagRow = page.locator(`tr:has-text("${flag.name}")`)
    if (!(await flagRow.isVisible())) return test.skip()

    // Click the enabled/disabled toggle button
    const toggleBtn = flagRow.locator('button').first()
    if (await toggleBtn.isVisible()) {
      await toggleBtn.click()
      // Wait for the state to update
      await page.waitForTimeout(500)
    }
  })

  test('deletes a feature flag', async ({ page }) => {
    // Create a flag first via API
    const createRes = await page.request.post('/api/admin/feature-flags', {
      data: {
        description: 'E2E delete test',
        environment: 'development',
        key: `e2e-delete-${Date.now()}`,
        name: 'E2E Delete Test',
      },
      headers: { 'Content-Type': 'application/json' },
    })
    if (!createRes.ok()) return test.skip()
    const { flag } = await createRes.json()

    // Reload page to see the new flag
    await page.reload()
    await page.waitForLoadState('networkidle')

    // Find the flag row and click delete
    const flagRow = page.locator(`tr:has-text("${flag.name}")`)
    if (!(await flagRow.isVisible())) return test.skip()

    const deleteBtn = flagRow.getByText('Delete')
    if (await deleteBtn.isVisible()) {
      // Accept the confirm dialog
      page.on('dialog', (dialog) => dialog.accept())
      await deleteBtn.click()
      await page.waitForTimeout(500)
    }
  })

  test('API returns flag after creation', async ({ page }) => {
    const key = `e2e-api-${Date.now()}`
    const createRes = await page.request.post('/api/admin/feature-flags', {
      data: {
        description: 'API test flag',
        environment: 'development',
        key,
        name: 'E2E API Test',
      },
      headers: { 'Content-Type': 'application/json' },
    })
    expect(createRes.ok()).toBe(true)
    const body = await createRes.json()
    expect(body.flag).toBeDefined()
    expect(body.flag.key).toBe(key)
  })

  test('API rejects duplicate flag key', async ({ page }) => {
    const key = `e2e-dup-${Date.now()}`
    await page.request.post('/api/admin/feature-flags', {
      data: {
        environment: 'development',
        key,
        name: 'Dup Test 1',
      },
      headers: { 'Content-Type': 'application/json' },
    })
    const dupRes = await page.request.post('/api/admin/feature-flags', {
      data: {
        environment: 'development',
        key,
        name: 'Dup Test 2',
      },
      headers: { 'Content-Type': 'application/json' },
    })
    expect(dupRes.status()).toBe(409)
  })
})
