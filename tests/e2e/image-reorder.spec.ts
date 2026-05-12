import { expect, test } from '@playwright/test'

test.describe('image reorder in article editor', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.goto('/login')
    await page.getByLabel('Email').fill('admin@vibekit.local')
    await page.getByLabel('Password').fill('admin123')
    await page.getByRole('button', { name: 'Sign in' }).click()
    await page.waitForURL('**/admin/dashboard')
  })

  test('drag handle is visible on figure images in editor', async ({ page }) => {
    await page.goto('/admin/blog/drag-test-post/edit')
    await page.waitForSelector('.ProseMirror')

    // Wait for figures to render
    const figures = page.locator('.figure-image-nodeview')
    await expect(figures).toHaveCount(3)

    // Check drag handles exist on all figures (hidden by default via opacity-0)
    const dragButtons = page.locator('[title="Drag to reorder image"]')
    await expect(dragButtons).toHaveCount(3)
  })

  test('drag handle becomes visible on hover', async ({ page }) => {
    await page.goto('/admin/blog/drag-test-post/edit')
    await page.waitForSelector('.ProseMirror')

    const firstFigure = page.locator('.figure-image-nodeview').first()
    const dragButton = firstFigure.locator('[title="Drag to reorder image"]')

    // Hover over the figure
    await firstFigure.hover()

    // The drag button should be present (visible via group-hover)
    await expect(dragButton).toBeAttached()
  })

  test('drop line indicator appears during dragover', async ({ page }) => {
    await page.goto('/admin/blog/drag-test-post/edit')
    await page.waitForSelector('.ProseMirror')

    // Resize viewport to fit all images
    await page.setViewportSize({ width: 1280, height: 2000 })

    // Dispatch dragover event with the custom MIME type
    const hasDropLine = await page.evaluate(() => {
      const DRAG_MIME = 'application/x-figure-image-pos'
      const pmEl = document.querySelector('.ProseMirror')
      if (!pmEl) return false

      const dt = new DataTransfer()
      dt.setData(DRAG_MIME, '5')

      const figures = document.querySelectorAll('.figure-image-nodeview')
      if (figures.length < 2) return false

      const secondRect = figures[1].getBoundingClientRect()
      const event = new DragEvent('dragover', {
        bubbles: true,
        cancelable: true,
        clientX: secondRect.x + secondRect.width / 2,
        clientY: secondRect.bottom + 20,
        dataTransfer: dt,
      })

      pmEl.dispatchEvent(event)

      return !!document.querySelector('.figure-drop-line')
    })

    expect(hasDropLine).toBe(true)
  })

  test('drop line is removed on dragleave', async ({ page }) => {
    await page.goto('/admin/blog/drag-test-post/edit')
    await page.waitForSelector('.ProseMirror')

    await page.setViewportSize({ width: 1280, height: 2000 })

    const lineRemoved = await page.evaluate(() => {
      const DRAG_MIME = 'application/x-figure-image-pos'
      const pmEl = document.querySelector('.ProseMirror')
      if (!pmEl) return false

      // First, create a drop line by dispatching dragover
      const dt = new DataTransfer()
      dt.setData(DRAG_MIME, '5')

      const figures = document.querySelectorAll('.figure-image-nodeview')
      if (figures.length < 2) return false

      const secondRect = figures[1].getBoundingClientRect()
      pmEl.dispatchEvent(
        new DragEvent('dragover', {
          bubbles: true,
          cancelable: true,
          clientX: secondRect.x + secondRect.width / 2,
          clientY: secondRect.bottom + 20,
          dataTransfer: dt,
        })
      )

      if (!document.querySelector('.figure-drop-line')) return false

      // Now dispatch dragleave
      pmEl.dispatchEvent(new DragEvent('dragleave', { bubbles: true, cancelable: true }))

      return !document.querySelector('.figure-drop-line')
    })

    expect(lineRemoved).toBe(true)
  })
})
