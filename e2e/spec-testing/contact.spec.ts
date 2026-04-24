import { expect, test } from '@playwright/test'
import { captureServerHTML, detectStrategy } from './helpers'

test.describe('Group: (public)/contact — CSR override', () => {
  test('/contact — client-side only rendering', async ({ page }) => {
    const serverHTML = await captureServerHTML(page, '/contact')
    const { detected, details } = await detectStrategy(page, '/contact', serverHTML)

    console.log(`\n[/contact] Detected strategy: ${detected}`)
    console.log(`  Server HTML length: ${details.serverHTMLLength}`)
    console.log(`  Final body text length: ${details.finalBodyTextLength}`)
    console.log(`  Body text delta: ${details.bodyTextDelta}`)

    // In SPA mode (ssr=false), server returns an empty shell
    expect(details.serverBodyTextLength).toBeLessThan(500)
    // Client JS populates content
    expect(details.finalBodyTextLength).toBeGreaterThan(500)
    expect(detected).toBe('csr-only')
  })
})
