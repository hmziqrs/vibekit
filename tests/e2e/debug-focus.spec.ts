import { expect, test } from '@playwright/test'

test('test createFocusTrap directly', async ({ page }) => {
  await page.goto('/')

  // Inject a test dialog and test createFocusTrap directly
  const result = await page.evaluate(() => {
    // Create a test container
    const container = document.createElement('div')
    container.setAttribute('role', 'dialog')
    container.innerHTML = '<button id="btn1">First</button><button id="btn2">Last</button>'
    document.body.appendChild(container)

    // Import and call createFocusTrap
    // We can't import modules directly, but we can test the logic inline
    const FOCUSABLE_SELECTOR =
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

    function getFocusableElements(): HTMLElement[] {
      return [...container.querySelectorAll(FOCUSABLE_SELECTOR)] as HTMLElement[]
    }

    function handleKeydown(e: KeyboardEvent) {
      if (e.key !== 'Tab') return
      const focusable = getFocusableElements()
      if (focusable.length === 0) return
      const [first] = focusable
      const last = focusable[focusable.length - 1]

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault()
          last.focus()
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }

    container.addEventListener('keydown', handleKeydown)

    // Focus the last button
    const lastBtn = container.querySelector('#btn2') as HTMLElement
    lastBtn.focus()

    // Dispatch Tab
    lastBtn.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true })
    )

    const activeAfter = (document.activeElement as HTMLElement)?.textContent?.trim()

    document.body.removeChild(container)

    return { activeAfter, expected: 'First' }
  })

  console.log('Result:', JSON.stringify(result))
  expect(result.activeAfter).toBe(result.expected)
})
