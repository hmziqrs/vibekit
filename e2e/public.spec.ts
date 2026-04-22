import { expect, test } from '@playwright/test'

test.describe('public pages', () => {
  test('homepage loads with hero text', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('The last boilerplate')).toBeVisible()
    await expect(page.getByText("you'll ever need")).toBeVisible()
  })

  test('features page loads', async ({ page }) => {
    await page.goto('/features')
    await expect(page.getByText('Built for serious SvelteKit products')).toBeVisible()
  })

  test('pricing page loads', async ({ page }) => {
    await page.goto('/pricing')
    await expect(page.getByText('Simple, predictable pricing')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Starter', exact: true })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Pro', exact: true })).toBeVisible()
  })

  test('about page loads', async ({ page }) => {
    await page.goto('/about')
    await expect(
      page.getByRole('heading', { name: 'Built for developers who want to ship.' })
    ).toBeVisible()
  })

  test('blog index page loads', async ({ page }) => {
    await page.goto('/blog')
    await expect(page.getByRole('heading', { name: 'Blog' })).toBeVisible()
  })

  test('navigation links work', async ({ page }) => {
    await page.goto('/')

    await page.getByRole('navigation').getByRole('link', { name: 'Features' }).click()
    await expect(page).toHaveURL('/features')
    await expect(page.getByText('Built for serious SvelteKit products')).toBeVisible()

    await page.getByRole('navigation').getByRole('link', { name: 'Pricing' }).click()
    await expect(page).toHaveURL('/pricing')
    await expect(page.getByRole('heading', { name: 'Starter', exact: true })).toBeVisible()

    await page.getByRole('navigation').getByRole('link', { name: 'Blog' }).click()
    await expect(page).toHaveURL('/blog')
    await expect(page.getByRole('heading', { name: 'Blog', exact: true })).toBeVisible()
  })
})
