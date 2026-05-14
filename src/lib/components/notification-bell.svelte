<script lang="ts">
  import { createQuery, useQueryClient } from '@tanstack/svelte-query'
  import { goto } from '$app/navigation'
  import { onDestroy } from 'svelte'
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

  let open = $state(false)
  let dropdownEl: HTMLDivElement | undefined = $state(undefined)

  const queryClient = useQueryClient()

  const unreadQuery = createQuery(() => ({
    queryFn: async (): Promise<{ count: number }> => {
      const res = await fetch('/api/notifications/unread-count')
      if (!res.ok) return { count: 0 }
      return (await res.json()) as { count: number }
    },
    queryKey: ['notifications', 'unread-count'],
    refetchInterval: 30_000,
    retry: 0,
  }))

  const listQuery = createQuery(() => ({
    enabled: open,
    queryFn: async (): Promise<{ notifications: NotificationData[] }> => {
      const res = await fetch('/api/notifications?limit=10')
      if (!res.ok) return { notifications: [] }
      return (await res.json()) as { notifications: NotificationData[] }
    },
    queryKey: ['notifications', 'list'],
    retry: 0,
  }))

  const unreadCount = $derived(unreadQuery.data?.count ?? 0)

  function toggle() {
    open = !open
  }

  function handleClickOutside(e: MouseEvent) {
    if (dropdownEl && !dropdownEl.contains(e.target as Node)) {
      open = false
    }
  }

  function handleEscapeKey(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      open = false
    }
  }

  async function markAsRead(id: string) {
    try {
      await fetch(`/api/notifications/${id}/read`, { method: 'PATCH' })
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    } catch (error) {
      console.error('Failed to mark notification as read', error)
    }
  }

  function getNotificationLink(n: NotificationData): string | null {
    if (n.link) return n.link
    if (n.entityType && n.entityId) {
      return `/${n.entityType.replace('_', '-')}/${n.entityId}`
    }
    return null
  }

  async function handleNotificationClick(n: NotificationData) {
    if (!n.readAt) {
      await markAsRead(n.id)
    }
    const link = getNotificationLink(n)
    if (link) {
      open = false
      goto(link)
    }
  }

  async function markAllRead() {
    try {
      await fetch('/api/notifications/read-all', { method: 'PATCH' })
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    } catch (error) {
      console.error('Failed to mark all notifications as read', error)
    }
  }

  $effect(() => {
    if (open) {
      document.addEventListener('click', handleClickOutside)
      document.addEventListener('keydown', handleEscapeKey)
    } else {
      document.removeEventListener('click', handleClickOutside)
      document.removeEventListener('keydown', handleEscapeKey)
    }
  })

  onDestroy(() => {
    document.removeEventListener('click', handleClickOutside)
    document.removeEventListener('keydown', handleEscapeKey)
  })
</script>

<div class="relative" bind:this={dropdownEl}>
  <button
    onclick={toggle}
    class="relative rounded-lg p-2 text-text-muted transition-colors hover:bg-surface hover:text-text-primary"
    aria-label="Notifications"
    aria-expanded={open}
    aria-haspopup="true"
  >
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
    {#if unreadCount > 0}
      <span class="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
        {unreadCount > 9 ? '9+' : unreadCount}
      </span>
    {/if}
  </button>

  {#if open}
    <div class="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-xl border border-border bg-surface shadow-xl">
      <div class="flex items-center justify-between border-b border-border px-4 py-3">
        <h3 class="text-[13px] font-semibold text-text-primary">Notifications</h3>
        {#if unreadCount > 0}
          <button
            onclick={markAllRead}
            class="text-[11px] text-brand hover:text-brand-hover"
          >
            Mark all read
          </button>
        {/if}
      </div>

      <div class="max-h-80 overflow-y-auto">
        {#if listQuery.isPending}
          <div class="px-4 py-6 text-center text-[12px] text-text-muted">Loading...</div>
        {:else if listQuery.data?.notifications.length === 0}
          <div class="px-4 py-6 text-center text-[12px] text-text-muted">No notifications</div>
        {:else}
          {#each listQuery.data?.notifications ?? [] as n (n.id)}
            <button
              onclick={() => handleNotificationClick(n)}
              class="flex w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-surface {n.readAt ? 'opacity-60' : ''}"
            >
              <div class="mt-0.5 size-2 shrink-0 rounded-full {notificationTypeColor(n.type)} bg-current"></div>
              <div class="min-w-0 flex-1">
                <p class="text-[13px] font-medium text-text-primary">{n.title}</p>
                {#if n.body}
                  <p class="mt-0.5 truncate text-[12px] text-text-muted">{n.body}</p>
                {/if}
                <p class="mt-1 text-[11px] text-text-faint">{formatTimeAgo(n.createdAt)}</p>
              </div>
              {#if !n.readAt}
                <div class="mt-1 size-1.5 shrink-0 rounded-full bg-brand self-start"></div>
              {/if}
            </button>
          {/each}
        {/if}
      </div>
    </div>
  {/if}
</div>
