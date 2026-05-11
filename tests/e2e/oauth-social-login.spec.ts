import { expect, test } from '@playwright/test'

import { ADMIN, login } from './helpers/auth'

test.describe('social login on login page', () => {
  test('shows google sign-in button', async ({ page }) => {
    await page.goto('/login')
    await page.waitForLoadState('networkidle')

    await expect(page.getByRole('button', { name: 'Continue with Google' })).toBeVisible()
  })

  test('shows github sign-in button', async ({ page }) => {
    await page.goto('/login')
    await page.waitForLoadState('networkidle')

    await expect(page.getByRole('button', { name: 'Continue with GitHub' })).toBeVisible()
  })

  test('social buttons appear above email form', async ({ page }) => {
    await page.goto('/login')
    await page.waitForLoadState('networkidle')

    const googleBtn = page.getByRole('button', { name: 'Continue with Google' })
    const emailInput = page.getByLabel('Email')

    const googleBox = await googleBtn.boundingBox()
    const emailBox = await emailInput.boundingBox()

    expect(googleBox).toBeTruthy()
    expect(emailBox).toBeTruthy()
    expect(googleBox!.y).toBeLessThan(emailBox!.y)
  })

  test('has separator between social and email login', async ({ page }) => {
    await page.goto('/login')
    await page.waitForLoadState('networkidle')

    // Multiple "or" dividers exist (social -> email, email -> passkey)
    const orDividers = page.locator('text=or')
    await expect(orDividers.first()).toBeVisible()
  })
})

test.describe('social login on register page', () => {
  test('shows google sign-in button', async ({ page }) => {
    await page.goto('/register')
    await page.waitForLoadState('networkidle')

    await expect(page.getByRole('button', { name: 'Continue with Google' })).toBeVisible()
  })

  test('shows github sign-in button', async ({ page }) => {
    await page.goto('/register')
    await page.waitForLoadState('networkidle')

    await expect(page.getByRole('button', { name: 'Continue with GitHub' })).toBeVisible()
  })

  test('social buttons appear above registration form', async ({ page }) => {
    await page.goto('/register')
    await page.waitForLoadState('networkidle')

    const githubBtn = page.getByRole('button', { name: 'Continue with GitHub' })
    const nameInput = page.getByLabel('Name')

    const githubBox = await githubBtn.boundingBox()
    const nameBox = await nameInput.boundingBox()

    expect(githubBox).toBeTruthy()
    expect(nameBox).toBeTruthy()
    expect(githubBox!.y).toBeLessThan(nameBox!.y)
  })
})

test.describe('connected accounts in settings', () => {
  test('shows connected accounts section', async ({ page }) => {
    await login(page, ADMIN)
    await page.getByRole('link', { name: 'Settings' }).first().click()
    await expect(page).toHaveURL('/app/settings')
    await page.waitForLoadState('networkidle')

    await expect(page.getByText('Connected Accounts')).toBeVisible()
  })

  test('shows google provider with connect button', async ({ page }) => {
    await login(page, ADMIN)
    await page.getByRole('link', { name: 'Settings' }).first().click()
    await expect(page).toHaveURL('/app/settings')
    await page.waitForLoadState('networkidle')

    await expect(page.getByText('Google')).toBeVisible()
  })

  test('shows github provider with connect button', async ({ page }) => {
    await login(page, ADMIN)
    await page.getByRole('link', { name: 'Settings' }).first().click()
    await expect(page).toHaveURL('/app/settings')
    await page.waitForLoadState('networkidle')

    await expect(page.getByText('GitHub')).toBeVisible()
  })
})

test.describe('oauth error page', () => {
  test('displays error message from URL params', async ({ page }) => {
    await page.goto('/auth-error?error=Account%20linking%20failed')
    await page.waitForLoadState('networkidle')

    await expect(page.getByText('Authentication Error')).toBeVisible()
    await expect(page.getByText('Account linking failed')).toBeVisible()
  })

  test('has link back to login', async ({ page }) => {
    await page.goto('/auth-error?error=test')
    await page.waitForLoadState('networkidle')

    await expect(page.getByRole('link', { name: 'Back to Login' })).toBeVisible()
  })

  test('shows default message without error param', async ({ page }) => {
    await page.goto('/auth-error')
    await page.waitForLoadState('networkidle')

    await expect(page.getByText('An authentication error occurred')).toBeVisible()
  })
})
