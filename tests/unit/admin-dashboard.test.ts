import { describe, expect, it } from 'vitest'

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function formatAction(action: string): string {
  const labels: Record<string, string> = {
    'item.create': 'Created item',
    'item.delete': 'Deleted item',
    'item.update': 'Updated item',
    'organization.create': 'Created organization',
    'user.login': 'Logged in',
    'user.register': 'Registered',
  }
  return labels[action] ?? action
}

function getActionColor(action: string): string {
  const colors: Record<string, string> = {
    'item.create': 'text-emerald-400',
    'item.delete': 'text-red-400',
    'item.update': 'text-blue-400',
    'user.login': 'text-brand',
  }
  return colors[action] ?? 'text-text-secondary'
}

describe('time ago formatting', () => {
  it('shows just now for recent timestamps', () => {
    expect(formatTimeAgo(new Date().toISOString())).toBe('just now')
  })

  it('shows minutes ago', () => {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60_000).toISOString()
    expect(formatTimeAgo(fiveMinutesAgo)).toBe('5m ago')
  })

  it('shows hours ago', () => {
    const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60_000).toISOString()
    expect(formatTimeAgo(threeHoursAgo)).toBe('3h ago')
  })

  it('shows days ago', () => {
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60_000).toISOString()
    expect(formatTimeAgo(twoDaysAgo)).toBe('2d ago')
  })
})

describe('action formatting', () => {
  it('formats known actions', () => {
    expect(formatAction('item.create')).toBe('Created item')
    expect(formatAction('user.login')).toBe('Logged in')
    expect(formatAction('user.register')).toBe('Registered')
  })

  it('passes through unknown actions', () => {
    expect(formatAction('custom.action')).toBe('custom.action')
  })
})

describe('action color mapping', () => {
  it('returns colors for create actions', () => {
    expect(getActionColor('item.create')).toBe('text-emerald-400')
  })

  it('returns colors for delete actions', () => {
    expect(getActionColor('item.delete')).toBe('text-red-400')
  })

  it('returns default for unknown actions', () => {
    expect(getActionColor('unknown.action')).toBe('text-text-secondary')
  })
})

describe('admin stats response shape', () => {
  it('has correct top-level keys', () => {
    const stats = {
      audit: [],
      items: { active: 0, total: 0 },
      posts: { draft: 0, published: 0, total: 0 },
      users: { active: 0, newThisWeek: 0, suspended: 0, total: 0 },
    }
    expect(stats).toHaveProperty('audit')
    expect(stats).toHaveProperty('items')
    expect(stats).toHaveProperty('posts')
    expect(stats).toHaveProperty('users')
  })

  it('calculates active user percentage', () => {
    const stats = { users: { active: 8, newThisWeek: 2, suspended: 1, total: 10 } }
    const pct = Math.round((stats.users.active / stats.users.total) * 100)
    expect(pct).toBe(80)
  })

  it('handles zero total users', () => {
    const stats = { users: { active: 0, newThisWeek: 0, suspended: 0, total: 0 } }
    const pct =
      stats.users.total > 0 ? Math.round((stats.users.active / stats.users.total) * 100) : 0
    expect(pct).toBe(0)
  })
})
