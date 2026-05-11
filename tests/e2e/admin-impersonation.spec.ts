import { expect, test, type Page } from '@playwright/test'

import { ADMIN, USER, login } from './helpers/auth'

test.describe.configure({ mode: 'serial' })

test.describe('Admin impersonation mode', () => {
  let adminPage: Page
  let targetUserId = ''

  test.beforeAll(async ({ browser }) => {
    const ctx = await browser.newContext()
    adminPage = await ctx.newPage()
    await login(adminPage, ADMIN)

    const membersRes = await adminPage.request.get('/api/admin/users')
    const membersData = await membersRes.json()
    const regularUser = membersData.users.find((u: { role: string }) => u.role === 'user')
    if (regularUser) {
      targetUserId = regularUser.id
    }
  })

  test('rejects impersonation without reason', async () => {
    if (!targetUserId) return
    const res = await adminPage.request.post(`/api/admin/users/${targetUserId}/impersonate`, {
      data: {},
      headers: { 'Content-Type': 'application/json' },
    })
    expect(res.status()).toBe(400)
  })

  test('rejects impersonation of self', async () => {
    const adminRes = await adminPage.request.get('/api/admin/users')
    const adminData = await adminRes.json()
    const adminUser = adminData.users.find((u: { role: string }) => u.role === 'admin')
    if (!adminUser) return

    const res = await adminPage.request.post(`/api/admin/users/${adminUser.id}/impersonate`, {
      data: { reason: 'Testing self-impersonation' },
      headers: { 'Content-Type': 'application/json' },
    })
    expect(res.status()).toBe(400)
  })

  test('rejects unauthenticated impersonation', async ({ browser }) => {
    const ctx = await browser.newContext()
    const page = await ctx.newPage()
    const res = await page.request.post(`/api/admin/users/some-id/impersonate`, {
      data: { reason: 'Unauthorized attempt' },
      headers: { 'Content-Type': 'application/json' },
    })
    expect(res.status()).toBe(401)
  })

  test('rejects non-admin impersonation', async ({ browser }) => {
    const ctx = await browser.newContext()
    const page = await ctx.newPage()
    await login(page, USER)

    const res = await page.request.post(`/api/admin/users/some-id/impersonate`, {
      data: { reason: 'Non-admin attempt' },
      headers: { 'Content-Type': 'application/json' },
    })
    expect(res.status()).toBe(403)
  })

  test('starts impersonation with valid reason', async () => {
    if (!targetUserId) return
    const res = await adminPage.request.post(`/api/admin/users/${targetUserId}/impersonate`, {
      data: { reason: 'E2E test: investigating user issue' },
      headers: { 'Content-Type': 'application/json' },
    })
    expect(res.status()).toBe(200)
    const data = await res.json()
    expect(data.sessionToken).toBeDefined()
    expect(data.targetUser).toBeDefined()
    expect(data.targetUser.id).toBe(targetUserId)
  })
})
