interface ShortcutEntry {
  description: string
  key: string
  mac: boolean
  shift?: boolean
  alt?: boolean
  action: () => void
}

const shortcuts: ShortcutEntry[] = []

export function registerShortcut(entry: ShortcutEntry): () => void {
  shortcuts.push(entry)
  return () => {
    const idx = shortcuts.indexOf(entry)
    if (idx >= 0) shortcuts.splice(idx, 1)
  }
}

export function getShortcuts(): ShortcutEntry[] {
  return [...shortcuts]
}

export function checkCollision(
  key: string,
  mac: boolean,
  shift?: boolean,
  alt?: boolean
): ShortcutEntry | undefined {
  return shortcuts.find(
    (s) => s.key === key && s.mac === mac && !!s.shift === !!shift && !!s.alt === !!alt
  )
}

export function formatShortcut(entry: ShortcutEntry): string {
  const parts: string[] = []
  if (entry.mac) {
    parts.push(navigator.platform.includes('Mac') ? '⌘' : 'Ctrl')
  }
  if (entry.shift) parts.push('⇧')
  if (entry.alt) parts.push(navigator.platform.includes('Mac') ? '⌥' : 'Alt')
  parts.push(entry.key.toUpperCase())
  return parts.join(' + ')
}

export function createFocusTrap(container: HTMLElement): { destroy: () => void } {
  const FOCUSABLE_SELECTOR =
    'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

  function getFocusableElements(): HTMLElement[] {
    return Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR))
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key !== 'Tab') return

    const focusable = getFocusableElements()
    if (focusable.length === 0) return

    const first = focusable[0]
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

  // Focus the first element
  const focusable = getFocusableElements()
  if (focusable.length > 0) {
    focusable[0].focus()
  }

  return {
    destroy() {
      container.removeEventListener('keydown', handleKeydown)
    },
  }
}

export function createRovingTabIndex(
  container: HTMLElement,
  itemSelector: string
): { destroy: () => void; setActive: (index: number) => void } {
  let activeIndex = 0

  function getItems(): HTMLElement[] {
    return Array.from(container.querySelectorAll(itemSelector))
  }

  function setActive(index: number) {
    const items = getItems()
    items.forEach((item, i) => {
      item.setAttribute('tabindex', i === index ? '0' : '-1')
    })
    activeIndex = index
    items[index]?.focus()
  }

  function handleKeydown(e: KeyboardEvent) {
    const items = getItems()
    if (items.length === 0) return

    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
      e.preventDefault()
      setActive((activeIndex + 1) % items.length)
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
      e.preventDefault()
      setActive((activeIndex - 1 + items.length) % items.length)
    } else if (e.key === 'Home') {
      e.preventDefault()
      setActive(0)
    } else if (e.key === 'End') {
      e.preventDefault()
      setActive(items.length - 1)
    }
  }

  container.addEventListener('keydown', handleKeydown)
  setActive(0)

  return {
    destroy() {
      container.removeEventListener('keydown', handleKeydown)
    },
    setActive,
  }
}
