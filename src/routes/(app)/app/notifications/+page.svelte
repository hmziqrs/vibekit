<script lang="ts">
  import { createQuery, useQueryClient } from '@tanstack/svelte-query'
  import { page } from '$app/state'
  import { goto } from '$app/navigation'
  import { cn } from '$lib/utils'
  import { formatTimeAgo, notificationTypeColor } from '$lib/notification-utils'

  interface NotificationData {
    body: string | null
    createdAt: string
    entityId: string | null
    entityType: string | null
    id: string
    link: string | null
    readAt: string | null
    title: string
    type: 'error' | 'info' | 'success' | 'warning'
  }

  interface NotificationsResponse {
    limit: number
    notifications: NotificationData[]
    page: number
    total: number
  }

  let filterType = $state<string>('all')
  let filterRead = $state<string>('all')
  let mutationError = $state('')
  let selectedIds = $state<Set<string>>(new Set())
  let deleting = $state(false)

  const queryClient = useQueryClient()

  const currentPage = $derived(Number(page.url.searchParams.get('p') ?? '1'))

  const notificationsQuery = createQuery(() => ({
    queryFn: async (): Promise<NotificationsResponse> => {
      const params = new URLSearchParams({
        limit: '20',
        page: String(currentPage),
      })
      const res = await fetch(`/api/notifications?${params}`)
      if (!res.ok) throw new Error('Failed to fetch notifications')
      return (await res.json()) as NotificationsResponse
    },
    queryKey: ['notifications', 'page', currentPage],
  }))

  const filteredNotifications = $derived(() => {
    const notifications = notificationsQuery.data?.notifications ?? []
    return notifications.filter((n) => {
      if (filterType !== 'all' && n.type !== filterType) return false
      if (filterRead === 'unread' && n.readAt) return false
      if (filterRead === 'read' && !n.readAt) return false
      return true
    })
  })

  const totalPages = $derived(
    Math.ceil((notificationsQuery.data?.total ?? 0) / 20),
  )

  async function markAsRead(id: string) {
    mutationError = ''
    try {
      const res = await fetch(`/api/notifications/${id}/read`, { method: 'PATCH' })
      if (!res.ok) throw new Error('Failed to mark as read')
      await queryClient.invalidateQueries({ queryKey: ['notifications'] })
    } catch {
      mutationError = 'Failed to mark notification as read.'
    }
  }

  async function markAllRead() {
    mutationError = ''
    try {
      const res = await fetch('/api/notifications/read-all', { method: 'PATCH' })
      if (!res.ok) throw new Error('Failed to mark all as read')
      await queryClient.invalidateQueries({ queryKey: ['notifications'] })
    } catch {
      mutationError = 'Failed to mark all notifications as read.'
    }
  }

  async function deleteNotification(id: string) {
    mutationError = ''
    try {
      const res = await fetch(`/api/notifications/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete notification')
      selectedIds.delete(id)
      selectedIds = new Set(selectedIds)
      await queryClient.invalidateQueries({ queryKey: ['notifications'] })
    } catch {
      mutationError = 'Failed to delete notification.'
    }
  }

  async function bulkDeleteSelected() {
    if (selectedIds.size === 0) return
    deleting = true
    mutationError = ''
    try {
      const res = await fetch('/api/notifications/bulk-delete', {
        body: JSON.stringify({ ids: [...selectedIds] }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      })
      if (!res.ok) throw new Error('Failed to delete notifications')
      selectedIds = new Set()
      await queryClient.invalidateQueries({ queryKey: ['notifications'] })
    } catch {
      mutationError = 'Failed to delete selected notifications.'
    } finally {
      deleting = false
    }
  }

  async function deleteAll() {
    deleting = true
    mutationError = ''
    try {
      const res = await fetch('/api/notifications/bulk-delete', {
        body: JSON.stringify({}),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      })
      if (!res.ok) throw new Error('Failed to delete all notifications')
      selectedIds = new Set()
      await queryClient.invalidateQueries({ queryKey: ['notifications'] })
    } catch {
      mutationError = 'Failed to delete all notifications.'
    } finally {
      deleting = false
    }
  }

  function toggleSelect(id: string) {
    const next = new Set(selectedIds)
    if (next.has(id)) {
      next.delete(id)
    } else {
      next.add(id)
    }
    selectedIds = next
  }

  function toggleSelectAll() {
    const visible = filteredNotifications()
    selectedIds =
      selectedIds.size === visible.length ? new Set() : new Set(visible.map((n) => n.id))
  }

  function handleNotificationClick(n: NotificationData) {
    if (!n.readAt) {
      markAsRead(n.id)
    }
    const link = n.link
      ?? (n.entityType && n.entityId
        ? `/${n.entityType.replace('_', '-')}/${n.entityId}`
        : null)
    if (link) {
      goto(link)
    }
  }

  function typeBadgeBg(type: string): string {
    switch (type) {
      case 'success': { return 'bg-success/10 text-success' }
      case 'warning': { return 'bg-warning/10 text-warning' }
      case 'error': { return 'bg-destructive/10 text-destructive' }
      default: { return 'bg-brand/10 text-brand' }
    }
  }

  function goToPage(p: number) {
    const params = new URLSearchParams(page.url.searchParams)
    if (p > 1) {
      params.set('p', String(p))
    } else {
      params.delete('p')
    }
    goto(`/app/notifications?${params.toString()}`, { replaceState: true })
  }
</script>

<div class="mx-auto max-w-3xl space-y-6 p-6">
  <div class="flex items-center justify-between">
    <h1 class="text-2xl font-bold text-text-primary">Notifications</h1>
    <div class="flex items-center gap-2">
      {#if selectedIds.size > 0}
        <button
          onclick={bulkDeleteSelected}
          disabled={deleting}
          class="rounded-lg px-3 py-1.5 text-[13px] text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-50"
        >
          Delete selected ({selectedIds.size})
        </button>
      {/if}
      <button
        onclick={markAllRead}
        class="rounded-lg px-3 py-1.5 text-[13px] text-brand transition-colors hover:bg-brand/10"
      >
        Mark all read
      </button>
      <button
        onclick={deleteAll}
        disabled={deleting}
        class="rounded-lg px-3 py-1.5 text-[13px] text-text-muted transition-colors hover:bg-white/[0.04] hover:text-text-primary disabled:opacity-50"
      >
        Delete all
      </button>
    </div>
  </div>

  <div class="flex flex-wrap gap-3">
    <select
      bind:value={filterType}
      aria-label="Filter by type"
      class="rounded-lg border border-white/[0.08] bg-surface px-3 py-1.5 text-[13px] text-text-primary"
    >
      <option value="all">All types</option>
      <option value="info">Info</option>
      <option value="success">Success</option>
      <option value="warning">Warning</option>
      <option value="error">Error</option>
    </select>

    <select
      bind:value={filterRead}
      aria-label="Filter by read status"
      class="rounded-lg border border-white/[0.08] bg-surface px-3 py-1.5 text-[13px] text-text-primary"
    >
      <option value="all">All</option>
      <option value="unread">Unread</option>
      <option value="read">Read</option>
    </select>
  </div>

  {#if mutationError}
    <p class="rounded-lg bg-destructive/10 px-4 py-2 text-[13px] text-destructive">{mutationError}</p>
  {/if}

  {#if notificationsQuery.isPending}
    <div class="space-y-3">
      {#each Array(5) as _}
        <div class="h-16 animate-pulse rounded-xl bg-white/[0.04]"></div>
      {/each}
    </div>
  {:else if notificationsQuery.error}
    <div class="rounded-xl border border-destructive/20 bg-surface p-8 text-center">
      <p class="text-[14px] text-destructive">Failed to load notifications.</p>
      <button
        onclick={() => notificationsQuery.refetch()}
        class="mt-2 text-[13px] font-medium text-brand transition-colors hover:text-brand-hover"
      >
        Try again
      </button>
    </div>
  {:else if filteredNotifications().length === 0}
    <div class="rounded-xl border border-white/[0.06] bg-surface p-8 text-center">
      <p class="text-text-muted">No notifications found</p>
    </div>
  {:else}
    <div class="space-y-2">
      {#each filteredNotifications() as n (n.id)}
        <div
          class={cn(
            'group relative flex items-start gap-4 rounded-xl border border-white/[0.06] bg-surface p-4 transition-colors hover:border-white/[0.1]',
            !n.readAt && 'border-brand/20 bg-brand/[0.02]',
            selectedIds.has(n.id) && 'ring-1 ring-brand/30',
          )}
        >
          <input
            type="checkbox"
            checked={selectedIds.has(n.id)}
            onchange={() => toggleSelect(n.id)}
            aria-label="Select notification"
            class="mt-2 size-4 shrink-0 cursor-pointer rounded border-white/20 bg-transparent accent-brand"
          />
          <button
            onclick={() => handleNotificationClick(n)}
            class="flex min-w-0 flex-1 items-start gap-3 text-start"
          >
            <div class="mt-1 size-2 shrink-0 rounded-full {notificationTypeColor(n.type)} bg-current" aria-hidden="true"></div>
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2">
                <p class="text-[14px] font-medium text-text-primary">{n.title}</p>
                <span class="rounded-full px-1.5 py-0.5 text-[10px] font-medium {typeBadgeBg(n.type)}">{n.type}</span>
              </div>
              {#if n.body}
                <p class="mt-1 text-[13px] text-text-muted">{n.body}</p>
              {/if}
              <p class="mt-1.5 text-[12px] text-text-faint">{formatTimeAgo(n.createdAt)}</p>
            </div>
          </button>

          <div class="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            {#if !n.readAt}
              <button
                onclick={() => markAsRead(n.id)}
                aria-label="Mark as read"
                class="rounded-lg p-1.5 text-text-muted hover:bg-white/[0.06] hover:text-text-primary"
                title="Mark as read"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </button>
            {/if}
            <button
              onclick={() => deleteNotification(n.id)}
              aria-label="Delete notification"
              class="rounded-lg p-1.5 text-text-muted hover:bg-destructive/10 hover:text-destructive"
              title="Delete"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 6h18" />
                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
              </svg>
            </button>
          </div>
        </div>
      {/each}
    </div>

    {#if totalPages > 1}
      <div class="flex items-center justify-center gap-2 pt-4">
        <button
          onclick={() => goToPage(currentPage - 1)}
          disabled={currentPage <= 1}
          class="rounded-lg border border-white/[0.08] px-3 py-1.5 text-[13px] text-text-muted transition-colors hover:bg-white/[0.04] disabled:opacity-40"
        >
          Previous
        </button>
        <span class="text-[13px] text-text-muted">
          {currentPage} / {totalPages}
        </span>
        <button
          onclick={() => goToPage(currentPage + 1)}
          disabled={currentPage >= totalPages}
          class="rounded-lg border border-white/[0.08] px-3 py-1.5 text-[13px] text-text-muted transition-colors hover:bg-white/[0.04] disabled:opacity-40"
        >
          Next
        </button>
      </div>
    {/if}
  {/if}
</div>
