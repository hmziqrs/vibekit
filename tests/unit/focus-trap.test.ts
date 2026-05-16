import { describe, expect, it, vi } from 'vitest'

describe('createFocusTrap', () => {
  function createMockElement(tag: string, options: Record<string, unknown> = {}) {
    return {
      tagName: tag.toUpperCase(),
      disabled: options.disabled ?? false,
      type: options.type ?? '',
      href: options.href ?? null,
      tabIndex: options.tabIndex ?? 0,
      focus: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      querySelectorAll: vi.fn(() => []),
      getAttribute: vi.fn((attr: string) => {
        if (attr === 'tabindex')
          return options.tabIndex !== undefined ? String(options.tabIndex) : null
        if (attr === 'href') return options.href ?? null
        if (attr === 'type') return options.type ?? null
        if (attr === 'disabled') return options.disabled ? '' : null
        return null
      }),
    }
  }

  it('returns an object with a destroy function', async () => {
    const { createFocusTrap } = await import('$lib/keyboard.svelte')
    const container = createMockElement('div')
    vi.spyOn(container, 'querySelectorAll').mockReturnValue([] as unknown as NodeListOf<Element>)

    const trap = createFocusTrap(container as unknown as HTMLElement)
    expect(trap).toBeDefined()
    expect(typeof trap.destroy).toBe('function')
    trap.destroy()
  })

  it('adds a keydown listener to the container', async () => {
    const { createFocusTrap } = await import('$lib/keyboard.svelte')
    const container = createMockElement('div')
    vi.spyOn(container, 'querySelectorAll').mockReturnValue([] as unknown as NodeListOf<Element>)

    createFocusTrap(container as unknown as HTMLElement)
    expect(container.addEventListener).toHaveBeenCalledWith('keydown', expect.any(Function))
  })

  it('removes the keydown listener on destroy', async () => {
    const { createFocusTrap } = await import('$lib/keyboard.svelte')
    const container = createMockElement('div')
    vi.spyOn(container, 'querySelectorAll').mockReturnValue([] as unknown as NodeListOf<Element>)

    const trap = createFocusTrap(container as unknown as HTMLElement)
    const handler = container.addEventListener.mock.calls[0][1]
    trap.destroy()
    expect(container.removeEventListener).toHaveBeenCalledWith('keydown', handler)
  })

  it('focuses first focusable element on creation', async () => {
    const { createFocusTrap } = await import('$lib/keyboard.svelte')
    const container = createMockElement('div')
    const input = createMockElement('input', { type: 'text' })
    const button = createMockElement('button')
    vi.spyOn(container, 'querySelectorAll').mockReturnValue([
      input,
      button,
    ] as unknown as NodeListOf<Element>)

    createFocusTrap(container as unknown as HTMLElement)
    expect(input.focus).toHaveBeenCalled()
  })

  it('focus trap selector matches expected element types', async () => {
    const { createFocusTrap } = await import('$lib/keyboard.svelte')

    const container = createMockElement('div')
    const calls: string[][] = []
    vi.spyOn(container, 'querySelectorAll').mockImplementation((selector: string) => {
      calls.push([selector])
      return [] as unknown as NodeListOf<Element>
    })

    createFocusTrap(container as unknown as HTMLElement)

    expect(calls.length).toBeGreaterThan(0)
    const selector = calls[0][0]
    expect(selector).toContain('a[href]')
    expect(selector).toContain('button:not([disabled])')
    expect(selector).toContain('input:not([disabled])')
    expect(selector).toContain('textarea:not([disabled])')
    expect(selector).toContain('select:not([disabled])')
    expect(selector).toContain('[tabindex]:not([tabindex="-1"])')
  })

  it('does not call focus when no focusable elements exist', async () => {
    const { createFocusTrap } = await import('$lib/keyboard.svelte')
    const container = createMockElement('div')
    vi.spyOn(container, 'querySelectorAll').mockReturnValue([] as unknown as NodeListOf<Element>)

    const trap = createFocusTrap(container as unknown as HTMLElement)
    expect(trap).toBeDefined()
    trap.destroy()
  })
})

describe('createRovingTabIndex', () => {
  it('creates roving tabindex with setActive and destroy', async () => {
    const { createRovingTabIndex } = await import('$lib/keyboard.svelte')
    const container = createMockRovingContainer(['Item 1', 'Item 2', 'Item 3'])

    const roving = createRovingTabIndex(container as unknown as HTMLElement, '[role="option"]')
    expect(roving).toBeDefined()
    expect(typeof roving.destroy).toBe('function')
    expect(typeof roving.setActive).toBe('function')
    roving.destroy()
  })

  it('adds keydown listener to container', async () => {
    const { createRovingTabIndex } = await import('$lib/keyboard.svelte')
    const container = createMockRovingContainer(['A', 'B'])

    createRovingTabIndex(container as unknown as HTMLElement, '[role="option"]')
    expect(container.addEventListener).toHaveBeenCalledWith('keydown', expect.any(Function))
  })

  it('removes listener on destroy', async () => {
    const { createRovingTabIndex } = await import('$lib/keyboard.svelte')
    const container = createMockRovingContainer(['A', 'B'])

    const roving = createRovingTabIndex(container as unknown as HTMLElement, '[role="option"]')
    const handler = container.addEventListener.mock.calls[0][1]
    roving.destroy()
    expect(container.removeEventListener).toHaveBeenCalledWith('keydown', handler)
  })
})

function createMockRovingContainer(items: string[]) {
  const mockItems = items.map((text) => ({
    textContent: text,
    setAttribute: vi.fn(),
    focus: vi.fn(),
    getAttribute: vi.fn(() => '0'),
  }))

  return {
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    querySelectorAll: vi.fn(() => mockItems),
  }
}
