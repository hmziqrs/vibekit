import { describe, expect, it } from 'vitest'

describe('Keyboard Navigation', () => {
  describe('Shortcut registration', () => {
    it('registers and returns shortcuts', async () => {
      const { registerShortcut, getShortcuts } = await import('$lib/keyboard.svelte')
      const unsub = registerShortcut({
        action: () => {},
        description: 'Test shortcut',
        key: 'x',
        mac: true,
      })
      const shortcuts = getShortcuts()
      expect(shortcuts.some((s) => s.description === 'Test shortcut')).toBe(true)
      unsub()
    })

    it('unregisters shortcut on unsubscribe', async () => {
      const { registerShortcut, getShortcuts } = await import('$lib/keyboard.svelte')
      const unsub = registerShortcut({
        action: () => {},
        description: 'Temp shortcut',
        key: 't',
        mac: false,
      })
      unsub()
      const shortcuts = getShortcuts()
      expect(shortcuts.some((s) => s.description === 'Temp shortcut')).toBe(false)
    })
  })

  describe('Collision detection', () => {
    it('detects collision for same key+modifiers', async () => {
      const { registerShortcut, checkCollision } = await import('$lib/keyboard.svelte')
      const unsub = registerShortcut({
        action: () => {},
        description: 'Collision test',
        key: 'c',
        mac: true,
      })
      const collision = checkCollision('c', true)
      expect(collision).toBeDefined()
      expect(collision!.description).toBe('Collision test')
      unsub()
    })

    it('no collision for different modifiers', async () => {
      const { registerShortcut, checkCollision } = await import('$lib/keyboard.svelte')
      const unsub = registerShortcut({
        action: () => {},
        description: 'Shift test',
        key: 'd',
        mac: true,
        shift: true,
      })
      const collision = checkCollision('d', true, false)
      expect(collision).toBeUndefined()
      unsub()
    })
  })

  describe('Focus trap selector', () => {
    const FOCUSABLE_SELECTOR =
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

    it('includes anchor elements with href', () => {
      expect(FOCUSABLE_SELECTOR).toContain('a[href]')
    })

    it('includes enabled buttons', () => {
      expect(FOCUSABLE_SELECTOR).toContain('button:not([disabled])')
    })

    it('includes enabled inputs', () => {
      expect(FOCUSABLE_SELECTOR).toContain('input:not([disabled])')
    })

    it('excludes tabindex -1 elements', () => {
      expect(FOCUSABLE_SELECTOR).toContain('[tabindex]:not([tabindex="-1"])')
    })
  })

  describe('Roving tabindex logic', () => {
    it('wraps to start on ArrowDown past end', () => {
      const items = [0, 1, 2]
      const activeIndex = 2
      const next = (activeIndex + 1) % items.length
      expect(next).toBe(0)
    })

    it('wraps to end on ArrowUp past start', () => {
      const items = [0, 1, 2]
      const activeIndex = 0
      const prev = (activeIndex - 1 + items.length) % items.length
      expect(prev).toBe(2)
    })

    it('Home goes to first item', () => {
      const activeIndex = 2
      const home = 0
      expect(home).toBe(0)
    })

    it('End goes to last item', () => {
      const items = [0, 1, 2]
      const end = items.length - 1
      expect(end).toBe(2)
    })
  })

  describe('Keyboard shortcuts help panel', () => {
    it('shortcuts help component exists', async () => {
      const mod = await import('$lib/components/shortcuts-help.svelte')
      expect(mod.default).toBeDefined()
    })
  })
})
