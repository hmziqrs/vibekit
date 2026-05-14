import { expect, test } from '@playwright/test'

test.describe('keyboard accessibility - modal dialogs', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage so consent banner appears fresh
    await page.goto('/')
    await page.evaluate(() => localStorage.removeItem('consent'))
    await page.reload()
    await page.waitForTimeout(500)
  })

  test('consent banner has focusable Decline and Accept buttons', async ({ page }) => {
    const banner = page.getByRole('dialog', { name: 'Cookie consent' })
    await expect(banner).toBeVisible()

    const declineButton = banner.getByRole('button', { name: 'Decline' })
    const acceptButton = banner.getByRole('button', { name: 'Accept' })

    await expect(declineButton).toBeVisible()
    await expect(acceptButton).toBeVisible()
    await expect(declineButton).toBeEnabled()
    await expect(acceptButton).toBeEnabled()
  })

  test('consent banner dialog has correct ARIA attributes', async ({ page }) => {
    const banner = page.getByRole('dialog', { name: 'Cookie consent' })
    await expect(banner).toBeVisible()

    await expect(banner).toHaveAttribute('role', 'dialog')
    await expect(banner).toHaveAttribute('aria-label', 'Cookie consent')
  })

  test('Tab navigation moves forward through banner buttons', async ({ page }) => {
    const banner = page.getByRole('dialog', { name: 'Cookie consent' })
    await expect(banner).toBeVisible()

    const declineButton = banner.getByRole('button', { name: 'Decline' })
    const acceptButton = banner.getByRole('button', { name: 'Accept' })

    // Start focus on the first button
    await declineButton.focus()
    await expect(declineButton).toBeFocused()

    // Tab forward moves to Accept
    await page.keyboard.press('Tab')
    await expect(acceptButton).toBeFocused()
  })

  test('focus trap wraps Tab back to first element when dispatched via DOM event', async ({
    page,
  }) => {
    const banner = page.getByRole('dialog', { name: 'Cookie consent' })
    await expect(banner).toBeVisible()

    const declineButton = banner.getByRole('button', { name: 'Decline' })
    const acceptButton = banner.getByRole('button', { name: 'Accept' })

    // Focus the last button (Accept)
    await acceptButton.focus()
    await expect(acceptButton).toBeFocused()

    // Dispatch a real Tab keydown event on the focused button.
    // This ensures the event bubbles up through the banner's focus trap handler,
    // which calls preventDefault() and wraps focus back to the first element.
    // Note: Playwright's keyboard.press('Tab') bypasses preventDefault() for
    // focus management, so we use dispatchEvent to test the actual handler logic.
    const wrapped = await page.evaluate(() => {
      const active = document.activeElement as HTMLElement
      if (!active) return false
      active.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true })
      )
      return (document.activeElement as HTMLElement)?.textContent?.trim() === 'Decline'
    })

    expect(wrapped).toBe(true)
    await expect(declineButton).toBeFocused()
  })

  test('focus trap wraps Shift+Tab back to last element from first', async ({ page }) => {
    const banner = page.getByRole('dialog', { name: 'Cookie consent' })
    await expect(banner).toBeVisible()

    const declineButton = banner.getByRole('button', { name: 'Decline' })
    const acceptButton = banner.getByRole('button', { name: 'Accept' })

    // Focus the first button (Decline)
    await declineButton.focus()
    await expect(declineButton).toBeFocused()

    // Dispatch a real Shift+Tab keydown to test the reverse wrap-around
    const wrapped = await page.evaluate(() => {
      const active = document.activeElement as HTMLElement
      if (!active) return false
      active.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'Tab',
          shiftKey: true,
          bubbles: true,
          cancelable: true,
        })
      )
      return (document.activeElement as HTMLElement)?.textContent?.trim() === 'Accept'
    })

    expect(wrapped).toBe(true)
    await expect(acceptButton).toBeFocused()
  })

  test('focus trap does not intercept non-Tab keys', async ({ page }) => {
    const banner = page.getByRole('dialog', { name: 'Cookie consent' })
    await expect(banner).toBeVisible()

    const declineButton = banner.getByRole('button', { name: 'Decline' })

    // Focus the first button
    await declineButton.focus()
    await expect(declineButton).toBeFocused()

    // Pressing Enter should not be intercepted by the focus trap
    await page.keyboard.press('Enter')
    // The consent banner should be dismissed (Decline was activated)
    await expect(banner).not.toBeVisible()
  })

  test('Escape key on consent banner does not throw errors', async ({ page }) => {
    const banner = page.getByRole('dialog', { name: 'Cookie consent' })
    await expect(banner).toBeVisible()

    // Collect any page errors during the Escape press
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    // Focus inside the banner and press Escape
    await banner.getByRole('button', { name: 'Decline' }).focus()
    await page.keyboard.press('Escape')

    // Allow a moment for any async errors to surface
    await page.waitForTimeout(200)

    // No JavaScript errors should have been thrown
    expect(errors).toEqual([])

    // Banner should still be visible (createFocusTrap only handles Tab, not Escape)
    await expect(banner).toBeVisible()
  })
})
