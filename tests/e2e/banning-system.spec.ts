import { expect, test } from '@playwright/test'

import { ADMIN, login } from './helpers/auth'

test.describe.configure({ mode: 'serial' })

test.describe('banning system', () => {
  test.describe('banned notification page', () => {
    test('displays ban reason when provided', async ({ page }) => {
      await page.goto('/banned?reason=Spam&email=test@example.com', { waitUntil: 'networkidle' })
      await expect(page.getByText('Account Suspended')).toBeVisible()
      await expect(page.getByText('Spam')).toBeVisible()
      await expect(page.getByText('Submit Appeal')).toBeVisible()
    })

    test('shows back to login link', async ({ page }) => {
      await page.goto('/banned', { waitUntil: 'networkidle' })
      await expect(page.getByRole('link', { name: 'Back to login' })).toBeVisible()
    })

    test('works without reason parameter', async ({ page }) => {
      await page.goto('/banned', { waitUntil: 'networkidle' })
      await expect(page.getByText('Account Suspended')).toBeVisible()
    })
  })

  test.describe('appeal page', () => {
    test('displays appeal form', async ({ page }) => {
      await page.goto('/appeal?email=banned@example.com', { waitUntil: 'networkidle' })
      await expect(page.getByText('Submit Appeal')).toBeVisible()
      await expect(page.getByLabel('Name')).toBeVisible()
      await expect(page.getByLabel('Email address')).toBeVisible()
      await expect(page.getByRole('button', { name: 'Submit Appeal' })).toBeVisible()
    })

    test('pre-fills email from URL', async ({ page }) => {
      await page.goto('/appeal?email=prefilled@example.com', { waitUntil: 'networkidle' })
      await expect(page.getByLabel('Email address')).toHaveValue('prefilled@example.com')
    })

    test('shows back to login link', async ({ page }) => {
      await page.goto('/appeal', { waitUntil: 'networkidle' })
      await expect(page.getByRole('link', { name: 'Back to login' })).toBeVisible()
    })
  })

  test.describe('admin users page - ban actions', () => {
    test.beforeEach(async ({ page }) => {
      await login(page, ADMIN)
      await page.goto('/admin/users', { waitUntil: 'networkidle' })
    })

    test('shows user list with status column', async ({ page }) => {
      await expect(page.getByText('Users')).toBeVisible()
      await expect(page.getByText('Status')).toBeVisible()
    })

    test('has filter tabs for user status', async ({ page }) => {
      await expect(page.getByRole('button', { name: 'All' })).toBeVisible()
      await expect(page.getByRole('button', { name: 'Active' })).toBeVisible()
      await expect(page.getByRole('button', { name: 'Suspended' })).toBeVisible()
    })
  })

  test.describe('ban flow link from banned page to appeal', () => {
    test('links from banned page to appeal with email', async ({ page }) => {
      await page.goto('/banned?email=test@example.com', { waitUntil: 'networkidle' })
      await page.getByRole('link', { name: 'Submit Appeal' }).click()
      await expect(page).toHaveURL(/\/appeal\?email=/)
      await expect(page.getByLabel('Email address')).toHaveValue('test@example.com')
    })
  })
})
