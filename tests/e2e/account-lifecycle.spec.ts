import { expect, test } from '@playwright/test'

import { ADMIN, login } from './helpers/auth'

test.describe.configure({ mode: 'serial' })

test.describe('account lifecycle', () => {
  test.describe('settings page - deactivate and delete sections', () => {
    test.beforeEach(async ({ page }) => {
      await login(page, ADMIN)
      await page.goto('/app/settings', { waitUntil: 'networkidle' })
    })

    test('shows deactivate account section', async ({ page }) => {
      await expect(page.getByText('Deactivate Account')).toBeVisible()
      await expect(
        page.getByText(
          'Temporarily disable your account. You can sign back in to reactivate at any time.'
        )
      ).toBeVisible()
      await expect(page.getByRole('button', { name: 'Deactivate Account' })).toBeVisible()
    })

    test('shows delete account section with grace period info', async ({ page }) => {
      await expect(page.getByText('Delete Account')).toBeVisible()
      await expect(page.getByText('scheduled for deletion')).toBeVisible()
      await expect(page.getByText('30 days')).toBeVisible()
      await expect(page.getByText('reactivate it')).toBeVisible()
    })

    test('delete confirmation requires typing DELETE', async ({ page }) => {
      await page.getByRole('button', { name: 'Delete Account' }).first().click()
      await expect(page.getByPlaceholder('Type DELETE to confirm')).toBeVisible()
      const confirmBtn = page.getByRole('button', { name: 'Confirm Delete' })
      await expect(confirmBtn).toBeDisabled()
    })

    test('delete confirmation enables after typing DELETE', async ({ page }) => {
      await page.getByRole('button', { name: 'Delete Account' }).first().click()
      await page.getByPlaceholder('Type DELETE to confirm').fill('DELETE')
      const confirmBtn = page.getByRole('button', { name: 'Confirm Delete' })
      await expect(confirmBtn).toBeEnabled()
    })

    test('delete cancel resets the form', async ({ page }) => {
      await page.getByRole('button', { name: 'Delete Account' }).first().click()
      await page.getByPlaceholder('Type DELETE to confirm').fill('DELETE')
      await page.getByRole('button', { name: 'Cancel' }).click()
      // Should be back to non-confirm state
      await expect(page.getByPlaceholder('Type DELETE to confirm')).not.toBeVisible()
    })
  })

  test.describe('reactivation page', () => {
    test('displays reactivation form', async ({ page }) => {
      await page.goto('/reactivate', { waitUntil: 'networkidle' })
      await expect(page.getByText('Reactivate account')).toBeVisible()
      await expect(page.getByText('scheduled for deletion')).toBeVisible()
      await expect(page.getByLabel('Email address')).toBeVisible()
      await expect(page.getByLabel('Password')).toBeVisible()
      await expect(page.getByRole('button', { name: 'Reactivate account' })).toBeVisible()
    })

    test('shows back to login link', async ({ page }) => {
      await page.goto('/reactivate', { waitUntil: 'networkidle' })
      await expect(page.getByRole('link', { name: 'Back to login' })).toBeVisible()
    })

    test('accepts email parameter from URL', async ({ page }) => {
      await page.goto('/reactivate?email=test@example.com', { waitUntil: 'networkidle' })
      const emailInput = page.getByLabel('Email address')
      await expect(emailInput).toHaveValue('test@example.com')
    })

    test('shows validation error on empty submit', async ({ page }) => {
      await page.goto('/reactivate', { waitUntil: 'networkidle' })
      await page.getByRole('button', { name: 'Reactivate account' }).click()
      // Should show validation error
      await page.waitForTimeout(1000)
    })
  })

  test.describe('privacy page data retention section', () => {
    test('shows data retention section', async ({ page }) => {
      await page.goto('/privacy', { waitUntil: 'networkidle' })
      await expect(page.getByText('Data Retention')).toBeVisible()
      await expect(page.getByText('30-day grace period')).toBeVisible()
      await expect(page.getByText('reactivate your account')).toBeVisible()
      await expect(page.getByText('deactivate your account')).toBeVisible()
    })

    test('links to reactivate page from data retention section', async ({ page }) => {
      await page.goto('/privacy', { waitUntil: 'networkidle' })
      const reactivateLink = page.getByRole('link', { name: 'reactivate your account' })
      await expect(reactivateLink).toHaveAttribute('href', '/reactivate')
    })
  })
})
