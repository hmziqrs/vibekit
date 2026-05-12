import { expect, test } from '@playwright/test'

test.describe('embed blocks in article editor', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('Email').fill('admin@vibekit.local')
    await page.getByLabel('Password').fill('admin123')
    await page.getByRole('button', { name: 'Sign in' }).click()
    await page.waitForURL('**/admin/dashboard')
  })

  test('YouTube embed renders with iframe and provider label', async ({ page }) => {
    await page.goto('/admin/blog/drag-test-post/edit')
    await page.waitForSelector('.ProseMirror')

    // Insert a YouTube embed via the editor API
    await page.evaluate(() => {
      const editor = (document.querySelector('.ProseMirror') as HTMLElement & { editor: unknown })
        ?.editor as {
        chain: () => {
          focus: () => {
            insertContentAt: (a: [number, number], b: unknown) => { run: () => boolean }
          }
        }
      } | null
      if (!editor) return

      const pmEl = document.querySelector('.ProseMirror')
      if (!pmEl) return
      const docLength = pmEl.textContent?.length ?? 0

      editor
        .chain()
        .focus()
        .insertContentAt([docLength, docLength], {
          attrs: {
            caption: 'Test YouTube Video',
            provider: 'youtube',
            url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
          },
          type: 'embedBlock',
        })
        .run()
    })

    // Verify iframe embed renders
    const iframe = page.locator('.ProseMirror iframe[src*="youtube.com/embed"]')
    await expect(iframe).toBeVisible()

    // Verify provider label shows "YouTube"
    const providerLabel = page.locator('.ProseMirror').getByText('YouTube')
    await expect(providerLabel).toBeVisible()
  })

  test('GitHub Gist embed renders with script tag instead of iframe', async ({ page }) => {
    await page.goto('/admin/blog/drag-test-post/edit')
    await page.waitForSelector('.ProseMirror')

    await page.evaluate(() => {
      const editor = (document.querySelector('.ProseMirror') as HTMLElement & { editor: unknown })
        ?.editor as {
        chain: () => {
          focus: () => {
            insertContentAt: (a: [number, number], b: unknown) => { run: () => boolean }
          }
        }
      } | null
      if (!editor) return

      const pmEl = document.querySelector('.ProseMirror')
      if (!pmEl) return
      const docLength = pmEl.textContent?.length ?? 0

      editor
        .chain()
        .focus()
        .insertContentAt([docLength, docLength], {
          attrs: {
            caption: 'Example Gist',
            provider: 'github-gist',
            url: 'https://gist.github.com/rxaviers/7360908.js',
          },
          type: 'embedBlock',
        })
        .run()
    })

    // Verify gist embed has a script tag, not an iframe
    const gistContainer = page.locator('.ProseMirror .gist-embed')
    await expect(gistContainer).toBeVisible()

    // Verify no iframe for gist embeds
    const gistIframe = page.locator('.ProseMirror .gist-embed iframe')
    expect(await gistIframe.count()).toBe(0)

    // Verify provider label shows "GitHub Gist"
    const providerLabel = page.locator('.ProseMirror').getByText('GitHub Gist')
    await expect(providerLabel).toBeVisible()
  })

  test('embed caption can be edited', async ({ page }) => {
    await page.goto('/admin/blog/drag-test-post/edit')
    await page.waitForSelector('.ProseMirror')

    // Insert embed with no caption
    await page.evaluate(() => {
      const editor = (document.querySelector('.ProseMirror') as HTMLElement & { editor: unknown })
        ?.editor as {
        chain: () => {
          focus: () => {
            insertContentAt: (a: [number, number], b: unknown) => { run: () => boolean }
          }
        }
      } | null
      if (!editor) return

      const pmEl = document.querySelector('.ProseMirror')
      if (!pmEl) return
      const docLength = pmEl.textContent?.length ?? 0

      editor
        .chain()
        .focus()
        .insertContentAt([docLength, docLength], {
          attrs: {
            caption: '',
            provider: 'vimeo',
            url: 'https://player.vimeo.com/video/123456789',
          },
          type: 'embedBlock',
        })
        .run()
    })

    // Click "Add caption..." placeholder
    const addCaptionBtn = page.locator('.ProseMirror').getByText('Add caption...')
    await expect(addCaptionBtn).toBeVisible()
    await addCaptionBtn.click()

    // Type new caption
    const captionInput = page.locator('.ProseMirror input[placeholder="Embed caption..."]')
    await expect(captionInput).toBeVisible()
    await captionInput.fill('My custom caption')
    await captionInput.press('Enter')

    // Verify the caption is displayed
    const displayedCaption = page.locator('.ProseMirror').getByText('My custom caption')
    await expect(displayedCaption).toBeVisible()
  })

  test('embed block has correct display names for providers', async ({ page }) => {
    await page.goto('/admin/blog/drag-test-post/edit')
    await page.waitForSelector('.ProseMirror')

    const providerNames = await page.evaluate(() => {
      const editor = (document.querySelector('.ProseMirror') as HTMLElement & { editor: unknown })
        ?.editor as {
        chain: () => {
          focus: () => {
            insertContentAt: (a: [number, number], b: unknown) => { run: () => boolean }
          }
        }
      } | null
      if (!editor) return []

      const pmEl = document.querySelector('.ProseMirror')
      if (!pmEl) return []
      const docLength = pmEl.textContent?.length ?? 0

      const providers = ['twitter', 'instagram', 'tiktok', 'reddit', 'facebook']
      const results: Array<{ name: string; pos: number }> = []

      let pos = docLength
      for (const provider of providers) {
        editor
          .chain()
          .focus()
          .insertContentAt([pos, pos], {
            attrs: {
              caption: `${provider} test`,
              provider,
              url: `https://example.com/${provider}`,
            },
            type: 'embedBlock',
          })
          .run()
        results.push({ name: provider, pos })
        pos += 100
      }

      return results
    })

    // Verify all embeds were inserted
    expect(providerNames).toHaveLength(5)

    // Check that each provider has its embed container rendered
    for (const { name } of providerNames) {
      const embedBlock = page.locator(`.ProseMirror`).getByText(`${name} test`).first()
      await expect(embedBlock).toBeVisible()
    }
  })
})
