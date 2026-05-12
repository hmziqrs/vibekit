import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

describe('accessibility Audit', () => {
  describe('cSS accessibility utilities', () => {
    const cssPath = resolve(import.meta.dirname, '..', '..', 'src', 'routes', 'layout.css')
    const css = readFileSync(cssPath, 'utf8')

    it('has reduced-motion media query', () => {
      expect(css).toContain('prefers-reduced-motion')
    })

    it('disables animations in reduced-motion', () => {
      expect(css).toContain('animation-duration: 0.01ms')
    })

    it('disables transitions in reduced-motion', () => {
      expect(css).toContain('transition-duration: 0.01ms')
    })

    it('has focus-visible outline', () => {
      expect(css).toContain(':focus-visible')
    })

    it('uses ring CSS variable for focus outline', () => {
      expect(css).toContain('var(--ring)')
    })

    it('has sr-only utility class', () => {
      expect(css).toContain('.sr-only')
    })

    it('sr-only has clip rect for screen reader hiding', () => {
      expect(css).toContain('clip: rect(0, 0, 0, 0)')
    })
  })

  describe('app layout ARIA landmarks', () => {
    const layoutPath = resolve(
      import.meta.dirname,
      '..',
      '..',
      'src',
      'routes',
      '(app)',
      '+layout.svelte'
    )
    const layout = readFileSync(layoutPath, 'utf8')

    it('sidebar has navigation role', () => {
      expect(layout).toContain('role="navigation"')
    })

    it('sidebar has aria-label', () => {
      expect(layout).toContain('aria-label="Main navigation"')
    })

    it('has semantic header element', () => {
      expect(layout).toContain('<header')
    })

    it('has semantic main element', () => {
      expect(layout).toContain('<main')
    })

    it('has semantic aside element', () => {
      expect(layout).toContain('<aside')
    })

    it('search button has aria-label', () => {
      expect(layout).toContain('aria-label="Search"')
    })

    it('mobile menu button has aria-label', () => {
      expect(layout).toContain('aria-label="Open menu"')
    })

    it('close menu button has aria-label', () => {
      expect(layout).toContain('aria-label="Close menu"')
    })
  })

  describe('search dialog accessibility', () => {
    const dialogPath = resolve(
      import.meta.dirname,
      '..',
      '..',
      'src',
      'lib',
      'components',
      'search-dialog.svelte'
    )
    const dialog = readFileSync(dialogPath, 'utf8')

    it('input has role="combobox"', () => {
      expect(dialog).toContain('role="combobox"')
    })

    it('input has aria-expanded', () => {
      expect(dialog).toContain('aria-expanded')
    })

    it('input has aria-controls', () => {
      expect(dialog).toContain('aria-controls')
    })

    it('input has aria-label', () => {
      expect(dialog).toContain('aria-label')
    })

    it('results container has role="listbox"', () => {
      expect(dialog).toContain('role="listbox"')
    })

    it('result items have role="option"', () => {
      expect(dialog).toContain('role="option"')
    })

    it('result items have aria-selected', () => {
      expect(dialog).toContain('aria-selected')
    })

    it('dialog handles Escape key', () => {
      expect(dialog).toContain("e.key === 'Escape'")
    })
  })

  describe('skip link component', () => {
    const skipLinkPath = resolve(
      import.meta.dirname,
      '..',
      '..',
      'src',
      'lib',
      'components',
      'skip-link.svelte'
    )
    const skipLink = readFileSync(skipLinkPath, 'utf8')

    it('has skip link component', () => {
      expect(skipLink).toBeTruthy()
    })

    it('links to main content', () => {
      expect(skipLink).toContain('#main')
    })
  })

  describe('confirm dialog accessibility', () => {
    const dialogPath = resolve(
      import.meta.dirname,
      '..',
      '..',
      'src',
      'lib',
      'components',
      'confirm-dialog.svelte'
    )
    const dialog = readFileSync(dialogPath, 'utf8')

    it('has z-50 overlay for modal backdrop', () => {
      expect(dialog).toContain('z-50')
    })

    it('handles Escape key', () => {
      expect(dialog).toContain('Escape')
    })

    it('has cancel and confirm buttons', () => {
      expect(dialog).toContain('Cancel')
    })

    it('stops click propagation on inner panel', () => {
      expect(dialog).toContain('stopPropagation')
    })
  })

  describe('image alt text in blog pages', () => {
    const blogListPath = resolve(
      import.meta.dirname,
      '..',
      '..',
      'src',
      'routes',
      '(blog)',
      'blog',
      '+page.svelte'
    )
    const blogList = readFileSync(blogListPath, 'utf8')

    it('blog listing images have alt attributes', () => {
      expect(blogList).toContain('alt={post.title}')
    })

    it('blog images use lazy loading for non-hero', () => {
      expect(blogList).toContain('loading=')
    })
  })
})
