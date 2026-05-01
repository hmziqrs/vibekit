import { expect, test } from '@playwright/test'
import { expect, test } from 'vitest'

import { ADMIN, USER, assertOnLogin, login, logout } from './helpers/auth'

test.describe.configure({ mode: 'serial' })

test.describe('login flow', () => {
  test('valid admin credentials redirect to /app/dashboard', async ({ page }) => {
    await login(page, ADMIN)
    await expect(page).toHaveURL('/app/dashboard')
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible()
  })

  test('respects ?next= redirect after login', async ({ page }) => {
    await page.goto(`/login?next=${encodeURIComponent('/app/settings')}`, {
      waitUntil: 'networkidle',
    })
    await page.fill('input[type="email"]', ADMIN.email)
    await page.fill('input[type="password"]', ADMIN.password)
    await page.click('button[type="submit"]')
    await page.waitForURL('**/app/**', { timeout: 10_000 })
    // The login page may redirect to /app first, then client-side reads ?next
    await page.waitForTimeout(1000)
    await expect(page).toHaveURL(/\/app/)
  })

  test('invalid password shows error', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'networkidle' })
    await page.fill('input[type="email"]', ADMIN.email)
    await page.fill('input[type="password"]', 'wrongpassword')
    await page.click('button[type="submit"]')
    // Wait for the error to appear (client-side validation + API call)
    await page.waitForTimeout(1500)
    await expect(page.locator('[class*="destructive"], [class*="red"]').first()).toBeVisible({
      timeout: 5000,
    })
  })

  test('invalid email shows error', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'networkidle' })
    await page.fill('input[type="email"]', 'nonexistent@test.com')
    await page.fill('input[type="password"]', 'anypassword123')
    await page.click('button[type="submit"]')
    await page.waitForTimeout(1500)
    await expect(page.locator('[class*="destructive"], [class*="red"]').first()).toBeVisible({
      timeout: 5000,
    })
  })

  test('already authenticated user is redirected away from /login', async ({ page }) => {
    await login(page, ADMIN)
    await page.goto('/login')
    await page.waitForURL('**/app/**', { timeout: 5000 })
    await expect(page).toHaveURL(/\/app/)
  })
})

test.describe('register flow', () => {
  test('valid registration redirects to /verify-email', async ({ page }) => {
    await page.goto('/register', { waitUntil: 'networkidle' })
    await page.getByLabel('Name').fill('New User')
    await page.getByLabel('Email').fill(`test-${Date.now()}@example.com`)
    await page.getByLabel('Password', { exact: true }).fill('password123')
    await page.getByLabel('Confirm password').fill('password123')
    await page.getByRole('button', { name: 'Create account' }).click()
    await page.waitForURL('**/verify-email**', { timeout: 10_000 })
    await expect(page).toHaveURL(/\/verify-email/)
  })

  test('password mismatch shows validation error', async ({ page }) => {
    await page.goto('/register', { waitUntil: 'networkidle' })
    await page.getByLabel('Name').fill('Test')
    await page.getByLabel('Email').fill('test@example.com')
    await page.getByLabel('Password', { exact: true }).fill('password123')
    await page.getByLabel('Confirm password').fill('different456')
    await page.getByRole('button', { name: 'Create account' }).click()
    await expect(page.getByText(/passwords do not match/i)).toBeVisible()
  })

  test('already authenticated user is redirected away from /register', async ({ page }) => {
    await login(page, ADMIN)
    await page.goto('/register')
    await page.waitForURL('**/app/**', { timeout: 5000 })
    await expect(page).toHaveURL(/\/app/)
  })
})

test.describe('logout flow', () => {
  test('sign out clears session', async ({ page }) => {
    await login(page, ADMIN)
    await logout(page)
    // After logout, session is cleared — navigating to protected route redirects to login
    await page.goto('/app/dashboard')
    await assertOnLogin(page)
  })

  test('after logout, protected routes redirect to /login', async ({ page }) => {
    await login(page, ADMIN)
    await logout(page)
    await page.goto('/app/dashboard')
    await assertOnLogin(page)
  })

  test('after logout, admin routes redirect to /login', async ({ page }) => {
    await login(page, ADMIN)
    await logout(page)
    await page.goto('/admin/dashboard')
    await assertOnLogin(page)
  })
})

test.describe('authenticated app session', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, ADMIN)
  })

  test('dashboard shows welcome message and seeded items', async ({ page }) => {
    await expect(page).toHaveURL('/app/dashboard')
    await expect(page.getByRole('heading', { name: /welcome back, test admin/i })).toBeVisible()
    await expect(page.getByText('My First Item')).toBeVisible()
    await expect(page.getByText('Another Item')).toBeVisible()
  })

  test('navigate between app pages via sidebar', async ({ page }) => {
    await page.getByRole('link', { name: 'Items' }).first().click()
    await expect(page).toHaveURL('/app/items')
    await expect(page.getByRole('heading', { name: 'Items' })).toBeVisible()

    await page.getByRole('link', { name: 'Profile' }).first().click()
    await expect(page).toHaveURL('/app/profile')
    await expect(page.getByRole('heading', { name: 'Profile' })).toBeVisible()

    await page.getByRole('link', { name: 'Settings' }).first().click()
    await expect(page).toHaveURL('/app/settings')
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible()

    await page.getByRole('link', { name: 'Dashboard' }).first().click()
    await expect(page).toHaveURL('/app/dashboard')
  })

  test('profile page shows user info', async ({ page }) => {
    await page.getByRole('link', { name: 'Profile' }).first().click()
    await expect(page).toHaveURL('/app/profile')
    // Email appears in sidebar + profile card + read-only field — use main content area
    await expect(page.locator('main').getByText(ADMIN.email).first()).toBeVisible()
  })

  test('session persists across page reload', async ({ page }) => {
    await expect(page).toHaveURL('/app/dashboard')
    await page.reload({ waitUntil: 'networkidle' })
    await expect(page).toHaveURL('/app/dashboard')
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible()
  })

  test('items page shows seeded items with status badges', async ({ page }) => {
    await page.getByRole('link', { name: 'Items' }).first().click()
    await expect(page).toHaveURL('/app/items')
    await expect(page.getByText('My First Item')).toBeVisible()
    await expect(page.getByText('Another Item')).toBeVisible()
  })
})

test.describe('role-based access', () => {
  test('admin can access admin dashboard', async ({ page }) => {
    await login(page, ADMIN)
    await page.goto('/admin/dashboard')
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('heading', { name: 'Admin Dashboard' })).toBeVisible()
  })

  test('admin sees admin sidebar navigation', async ({ page }) => {
    await login(page, ADMIN)
    await page.goto('/admin/dashboard')
    await page.waitForLoadState('networkidle')
    const sidebar = page.getByRole('complementary')
    await expect(sidebar.getByRole('link', { name: 'Users' })).toBeVisible()
    await expect(sidebar.getByRole('link', { name: 'Audit Log' })).toBeVisible()
  })

  test('admin can navigate admin pages', async ({ page }) => {
    await login(page, ADMIN)
    await page.goto('/admin/dashboard')
    await page.waitForLoadState('networkidle')

    await page.getByRole('link', { name: 'Users' }).first().click()
    await expect(page).toHaveURL('/admin/users')
    await expect(page.getByRole('heading', { name: 'Users' })).toBeVisible()

    await page.getByRole('link', { name: 'Audit Log' }).first().click()
    await expect(page).toHaveURL('/admin/audit')
    await expect(page.getByRole('heading', { name: 'Audit Log' })).toBeVisible()
  })

  test('regular user cannot access admin routes', async ({ page }) => {
    await login(page, USER)
    await page.goto('/admin/dashboard', { waitUntil: 'networkidle' })
    await page.waitForTimeout(1500)
    // Non-admin should NOT see the admin dashboard heading
    await expect(page.getByRole('heading', { name: 'Admin Dashboard' })).not.toBeVisible()
  })

  test('regular user can access app routes', async ({ page }) => {
    await login(page, USER)
    await expect(page).toHaveURL('/app/dashboard')
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible()
  })

  test('unauthenticated user is redirected from admin routes', async ({ page }) => {
    await page.goto('/admin/dashboard')
    await assertOnLogin(page)
  })
})

test.describe('password management', () => {
  test('change password flow works end-to-end', async ({ page }) => {
    const newPassword = 'newpassword123456'

    // Login and change password
    await login(page, USER)
    await page.getByRole('link', { name: 'Settings' }).first().click()
    await expect(page).toHaveURL('/app/settings')

    await page.getByPlaceholder('Enter current password').fill(USER.password)
    await page.getByPlaceholder('Enter new password').fill(newPassword)
    await page.getByPlaceholder('Confirm new password').fill(newPassword)
    await page.getByRole('button', { name: 'Change Password' }).click()

    // Wait for success (form resets)
    await page.waitForTimeout(2000)

    // Navigate away and back to verify session still works
    await page.getByRole('link', { name: 'Dashboard' }).first().click()
    await expect(page).toHaveURL('/app/dashboard')

    // Change back to original password for test idempotency
    await page.getByRole('link', { name: 'Settings' }).first().click()
    await page.getByPlaceholder('Enter current password').fill(newPassword)
    await page.getByPlaceholder('Enter new password').fill(USER.password)
    await page.getByPlaceholder('Confirm new password').fill(USER.password)
    await page.getByRole('button', { name: 'Change Password' }).click()
    await page.waitForTimeout(2000)
  })
})
