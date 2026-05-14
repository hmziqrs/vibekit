import { formatDate } from '$lib/i18n.svelte'

export function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return formatDate(dateStr)
}

export function notificationTypeColor(type: string): string {
  switch (type) {
    case 'success': {
      return 'text-success'
    }
    case 'warning': {
      return 'text-warning'
    }
    case 'error': {
      return 'text-destructive'
    }
    default: {
      return 'text-brand'
    }
  }
}
