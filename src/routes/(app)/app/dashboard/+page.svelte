<script lang="ts">
  import { getContext } from 'svelte'
  import type { AuthContext } from '$lib/auth.svelte'
  import { createQuery } from '@tanstack/svelte-query'
  import { page } from '$app/state'
  import type { ItemData } from '$lib/types'
  import { formatDate } from '$lib/i18n.svelte'

  const auth = getContext<AuthContext>('auth')
  const userName = $derived(auth.user?.name ?? 'User')
  let showWelcomeBanner = $state(page.url.searchParams.get('onboarded') === 'true')

  interface Stats {
    activeItems: number
    itemsThisWeek: number
    totalItems: number
  }

  interface AuditEntry {
    action: string
    createdAt: string
    entityId: string
    entityType: string
    id: string
    metadata: string | null
  }

  const statsQuery = createQuery(() => ({
    queryFn: async (): Promise<Stats> => {
      const res = await fetch('/api/stats')
      if (!res.ok) throw new Error('Failed to fetch stats')
      return (await res.json()) as Stats
    },
    queryKey: ['stats'],
  }))

  const itemsQuery = createQuery(() => ({
    queryFn: async (): Promise<ItemData[]> => {
      const res = await fetch('/api/items?status=active')
      if (!res.ok) throw new Error('Failed to fetch items')
      const data = (await res.json()) as { items: ItemData[] }
      return data.items
    },
    queryKey: ['items', 'recent'],
  }))

  const activityQuery = createQuery(() => ({
    queryFn: async (): Promise<AuditEntry[]> => {
      const res = await fetch('/api/audit-log?limit=10')
      if (!res.ok) throw new Error('Failed to fetch activity')
      const data = (await res.json()) as { entries: AuditEntry[] }
      return data.entries
    },
    queryKey: ['audit-log'],
  }))

  function formatTimeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60_000)
    if (mins < 1) return 'just now'
    if (mins < 60) return `${mins}m ago`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    if (days < 7) return `${days}d ago`
    return formatDate(dateStr, { day: 'numeric', month: 'short', year: 'numeric' })
  }

  function getActionLabel(action: string) {
    const labels: Record<string, string> = {
      'account.export': 'Exported account data',
      'item.create': 'Created an item',
      'item.delete': 'Deleted an item',
      'item.update': 'Updated an item',
    }
    return labels[action] ?? action
  }

  function getActionColor(action: string) {
    if (action.includes('create')) return 'text-success'
    if (action.includes('delete')) return 'text-destructive'
    if (action.includes('update')) return 'text-info'
    return 'text-text-secondary'
  }
</script>

<div class="mx-auto max-w-5xl">
  <!-- Onboarding Welcome Banner -->
  {#if showWelcomeBanner}
    <div class="mb-6 flex items-center justify-between rounded-xl border border-brand/20 bg-brand/5 px-5 py-3">
      <p class="text-[14px] text-text-primary">
        Your account is set up! Start by creating your first item.
      </p>
      <button
        onclick={() => (showWelcomeBanner = false)}
        class="ml-4 text-text-muted transition-colors hover:text-text-primary"
        aria-label="Dismiss"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    </div>
  {/if}

  <!-- Welcome -->
  <div class="mb-8">
    <h1 class="text-2xl font-semibold text-text-primary">
      Welcome back, {userName}
    </h1>
    <p class="mt-1 text-[14px] text-text-muted">Here is what is happening with your items.</p>
  </div>

  <!-- Stats -->
  <div class="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
    {#if statsQuery.isPending}
      {#each [1, 2, 3, 4] as skeleton (skeleton)}
        <div class="h-[88px] animate-pulse rounded-xl border border-white/[0.06] bg-surface"></div>
      {/each}
    {:else if statsQuery.error}
      <div class="col-span-full rounded-xl border border-destructive/20 bg-surface p-6">
        <p class="text-[14px] text-destructive">Failed to load stats. Please refresh.</p>
      </div>
    {:else}
      <div class="rounded-xl border border-white/[0.06] bg-surface p-6">
        <p class="text-[13px] text-text-muted">Active Items</p>
        <p class="mt-2 text-2xl font-semibold text-text-primary">
          {statsQuery.data?.activeItems ?? 0}
        </p>
      </div>
      <div class="rounded-xl border border-white/[0.06] bg-surface p-6">
        <p class="text-[13px] text-text-muted">Total Created</p>
        <p class="mt-2 text-2xl font-semibold text-text-primary">
          {statsQuery.data?.totalItems ?? 0}
        </p>
      </div>
      <div class="rounded-xl border border-white/[0.06] bg-surface p-6">
        <p class="text-[13px] text-text-muted">This Week</p>
        <p class="mt-2 text-2xl font-semibold text-text-primary">
          {statsQuery.data?.itemsThisWeek ?? 0}
        </p>
      </div>
      <div class="rounded-xl border border-white/[0.06] bg-surface p-6">
        <p class="text-[13px] text-text-muted">Quick Actions</p>
        <div class="mt-2 flex gap-2">
          <a
            href="/app/items/new"
            class="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-[12px] font-medium text-brand-foreground transition-colors hover:bg-brand-hover"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            New Item
          </a>
          <a
            href="/app/profile"
            class="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.06] px-3 py-1.5 text-[12px] font-medium text-text-muted transition-colors hover:bg-white/[0.04] hover:text-text-primary"
          >
            Edit Profile
          </a>
        </div>
      </div>
    {/if}
  </div>

  <div class="grid gap-6 lg:grid-cols-5">
    <!-- Recent Items -->
    <div class="rounded-xl border border-white/[0.06] bg-surface lg:col-span-3">
      <div class="border-b border-white/[0.06] px-6 py-4">
        <h2 class="text-[15px] font-medium text-text-primary">Recent Items</h2>
      </div>

      {#if itemsQuery.isPending}
        <div class="space-y-3 p-6">
          {#each [1, 2, 3, 4, 5] as skeleton (skeleton)}
            <div class="h-10 animate-pulse rounded-lg bg-white/[0.04]"></div>
          {/each}
        </div>
      {:else if itemsQuery.error}
        <div class="p-6">
          <p class="text-[14px] text-destructive">Failed to load items.</p>
        </div>
      {:else if !itemsQuery.data?.length}
        <div class="p-6">
          <p class="text-[14px] text-text-muted">No items yet.</p>
          <a
            href="/app/items/new"
            class="mt-2 inline-block text-[13px] font-medium text-brand transition-colors hover:text-brand-hover"
          >
            Create your first item
          </a>
        </div>
      {:else}
        <div class="divide-y divide-white/[0.04]">
          {#each (itemsQuery.data ?? []).slice(0, 5) as item (item.id)}
            <a
              href="/app/items/{item.id}/edit"
              class="flex items-center justify-between px-6 py-3 transition-colors hover:bg-white/[0.02]"
            >
              <div class="min-w-0">
                <p class="truncate text-[13px] font-medium text-text-primary">{item.name}</p>
                <p class="mt-0.5 text-[11px] text-text-subtle">{formatDate(item.createdAt, { day: 'numeric', month: 'short', year: 'numeric' })}</p>
              </div>
              <span
                class="ml-4 shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium {item.status === 'active'
                  ? 'bg-success/10 text-success'
                  : 'bg-warning/10 text-warning'}"
              >
                {item.status}
              </span>
            </a>
          {/each}
        </div>
      {/if}
    </div>

    <!-- Activity Feed -->
    <div class="rounded-xl border border-white/[0.06] bg-surface lg:col-span-2">
      <div class="border-b border-white/[0.06] px-6 py-4">
        <h2 class="text-[15px] font-medium text-text-primary">Recent Activity</h2>
      </div>

      {#if activityQuery.isPending}
        <div class="space-y-3 p-6">
          {#each [1, 2, 3, 4] as skeleton (skeleton)}
            <div class="h-8 animate-pulse rounded-lg bg-white/[0.04]"></div>
          {/each}
        </div>
      {:else if activityQuery.error}
        <div class="p-6">
          <p class="text-[14px] text-text-muted">Could not load activity.</p>
        </div>
      {:else if !activityQuery.data?.length}
        <div class="p-6">
          <p class="text-[14px] text-text-muted">No recent activity.</p>
        </div>
      {:else}
        <div class="divide-y divide-white/[0.04]">
          {#each (activityQuery.data ?? []).slice(0, 8) as entry (entry.id)}
            <div class="flex items-start gap-3 px-6 py-3">
              <div class="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full {getActionColor(entry.action).replace('text-', 'bg-')}"></div>
              <div class="min-w-0 flex-1">
                <p class="truncate text-[13px] text-text-primary">
                  {getActionLabel(entry.action)}
                </p>
                <p class="mt-0.5 text-[11px] text-text-subtle">
                  {formatTimeAgo(entry.createdAt)}
                </p>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  </div>
</div>
