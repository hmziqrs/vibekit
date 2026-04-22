import { expect, test } from '@playwright/test'

test.describe('auth pages', () => {
  test('login page shows form fields', async ({ page }) => {
    await page.goto('/login')
    await expect(page.locator('[data-slot="card-title"]', { hasText: 'Log in' })).toBeVisible()
    await expect(page.getByLabel('Email')).toBeVisible()
    await expect(page.getByLabel('Password')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible()
    await expect(page.getByText("Don't have an account?")).toBeVisible()
    await expect(page.getByRole('link', { name: 'Create one' })).toBeVisible()
  })

  test('register page shows form fields', async ({ page }) => {
    await page.goto('/register')
    await expect(
      page.locator('[data-slot="card-title"]', { hasText: 'Create account' })
    ).toBeVisible()
    await expect(page.getByLabel('Name')).toBeVisible()
    await expect(page.getByLabel('Email')).toBeVisible()
    await expect(page.getByLabel('Password', { exact: true })).toBeVisible()
    await expect(page.getByLabel('Confirm password')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Create account' })).toBeVisible()
    await expect(page.getByText('Already have an account?')).toBeVisible()
    await expect(page.getByRole('link', { name: 'Sign in' })).toBeVisible()
  })

  test('forgot password page shows email input', async ({ page }) => {
    await page.goto('/forgot-password')
    await expect(
      page.locator('[data-slot="card-title"]', { hasText: 'Reset password' })
    ).toBeVisible()
    await expect(page.getByLabel('Email')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Send reset link' })).toBeVisible()
    await expect(page.getByText('Remember your password?')).toBeVisible()
  })

  test('reset password page shows invalid without token', async ({ page }) => {
    await page.goto('/reset-password')
    await expect(page.getByText('Invalid or missing reset token')).toBeVisible()
  })

  test('verify email page shows check your inbox without token', async ({ page }) => {
    await page.goto('/verify-email')
    await expect(
      page.locator('[data-slot="card-title"]', { hasText: 'Verify email' })
    ).toBeVisible()
    await expect(page.getByText('Check your inbox for a verification link')).toBeVisible()
  })
})
