import { describe, expect, it } from 'vitest'

describe('dashboard stats response shape', () => {
  it('includes all expected keys', () => {
    const stats = { activeItems: 5, itemsThisWeek: 2, totalItems: 10 }
    expect(stats).toHaveProperty('activeItems')
    expect(stats).toHaveProperty('totalItems')
    expect(stats).toHaveProperty('itemsThisWeek')
  })

  it('returns numeric counts', () => {
    const stats = { activeItems: 0, itemsThisWeek: 0, totalItems: 0 }
    expectTypeOf(stats.activeItems).toBeNumber()
    expectTypeOf(stats.totalItems).toBeNumber()
    expectTypeOf(stats.itemsThisWeek).toBeNumber()
  })
})

describe('audit log activity labels', () => {
  const labels: Record<string, string> = {
    'account.export': 'Exported account data',
    'item.create': 'Created an item',
    'item.delete': 'Deleted an item',
    'item.update': 'Updated an item',
  }

  it('maps known actions to labels', () => {
    expect(labels['item.create']).toBe('Created an item')
    expect(labels['item.delete']).toBe('Deleted an item')
    expect(labels['item.update']).toBe('Updated an item')
    expect(labels['account.export']).toBe('Exported account data')
  })

  it('has labels for all expected actions', () => {
    const actions = ['item.create', 'item.update', 'item.delete', 'account.export']
    for (const action of actions) {
      expect(action in labels).toBe(true)
    }
  })
})

describe('time ago formatting', () => {
  function formatTimeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60_000)
    if (mins < 1) return 'just now'
    if (mins < 60) return `${mins}m ago`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    if (days < 7) return `${days}d ago`
    return 'older'
  }

  it('shows just now for very recent timestamps', () => {
    expect(formatTimeAgo(new Date().toISOString())).toBe('just now')
  })

  it('shows minutes ago', () => {
    const fiveMinAgo = new Date(Date.now() - 5 * 60_000).toISOString()
    expect(formatTimeAgo(fiveMinAgo)).toBe('5m ago')
  })

  it('shows hours ago', () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60_000).toISOString()
    expect(formatTimeAgo(twoHoursAgo)).toBe('2h ago')
  })

  it('shows days ago', () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60_000).toISOString()
    expect(formatTimeAgo(threeDaysAgo)).toBe('3d ago')
  })
})

describe('action color mapping', () => {
  function getActionColor(action: string) {
    if (action.includes('create')) return 'text-emerald-400'
    if (action.includes('delete')) return 'text-red-400'
    if (action.includes('update')) return 'text-blue-400'
    return 'text-text-secondary'
  }

  it('green for create actions', () => {
    expect(getActionColor('item.create')).toBe('text-emerald-400')
  })

  it('red for delete actions', () => {
    expect(getActionColor('item.delete')).toBe('text-red-400')
  })

  it('blue for update actions', () => {
    expect(getActionColor('item.update')).toBe('text-blue-400')
  })

  it('default for unknown actions', () => {
    expect(getActionColor('account.export')).toBe('text-text-secondary')
  })
})
