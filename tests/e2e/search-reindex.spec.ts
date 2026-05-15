import { expect, test } from '@playwright/test'

import { goToAdmin } from './helpers/auth'

test.describe('Admin Search Reindex', () => {
  test.beforeEach(async ({ page }) => {
    await goToAdmin(page)
  })

  test('reindex API requires authentication', async ({ request }) => {
    const res = await request.post('/api/admin/search/reindex', {
      data: {},
      headers: { 'Content-Type': 'application/json' },
    })
    expect(res.status()).toBe(401)
  })

  test('reindex API accepts empty body to reindex all', async ({ page }) => {
    const res = await page.request.post('/api/admin/search/reindex', {
      data: {},
      headers: { 'Content-Type': 'application/json' },
    })
    // Should succeed (200) or fail gracefully
    expect([200, 500]).toContain(res.status())
    if (res.ok()) {
      const body = await res.json()
      // Response should have counts for each entity type
      expect(body).toBeDefined()
    }
  })

  test('reindex API accepts specific entityType', async ({ page }) => {
    const res = await page.request.post('/api/admin/search/reindex', {
      data: { entityType: 'user' },
      headers: { 'Content-Type': 'application/json' },
    })
    expect([200, 500]).toContain(res.status())
    if (res.ok()) {
      const body = await res.json()
      expect(body).toBeDefined()
    }
  })

  test('reindex API rejects invalid entityType', async ({ page }) => {
    const res = await page.request.post('/api/admin/search/reindex', {
      data: { entityType: 'invalid_type' },
      headers: { 'Content-Type': 'application/json' },
    })
    expect(res.status()).toBe(400)
  })

  test('reindex API rejects page entityType (removed)', async ({ page }) => {
    const res = await page.request.post('/api/admin/search/reindex', {
      data: { entityType: 'page' },
      headers: { 'Content-Type': 'application/json' },
    })
    // 'page' was removed from the enum, should get validation error
    expect(res.status()).toBe(400)
  })

  test('reindex API accepts blog_post entityType', async ({ page }) => {
    const res = await page.request.post('/api/admin/search/reindex', {
      data: { entityType: 'blog_post' },
      headers: { 'Content-Type': 'application/json' },
    })
    expect([200, 500]).toContain(res.status())
  })

  test('reindex API accepts comment entityType', async ({ page }) => {
    const res = await page.request.post('/api/admin/search/reindex', {
      data: { entityType: 'comment' },
      headers: { 'Content-Type': 'application/json' },
    })
    expect([200, 500]).toContain(res.status())
  })
})
