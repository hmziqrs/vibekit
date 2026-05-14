<script lang="ts">
  import { createQuery } from '@tanstack/svelte-query'

  interface AdminStats {
    audit: {
      action: string
      createdAt: string
      entityId: string | null
      entityType: string | null
      id: string
      metadata: Record<string, unknown> | null
      userName: string
    }[]
    items: { active: number; total: number }
    posts: { draft: number; published: number; total: number }
    users: { active: number; newThisWeek: number; suspended: number; total: number }
  }

  const statsQuery = createQuery(() => ({
    queryFn: async (): Promise<AdminStats> => {
      const res = await fetch('/api/admin/stats')
      if (!res.ok) throw new Error('Failed to fetch stats')
      return (await res.json()) as AdminStats
    },
    queryKey: ['admin', 'stats'],
    retry: 1,
  }))

  function getActionColor(action: string): string {
    const colors: Record<string, string> = {
      'item.create': 'text-success',
      'item.delete': 'text-destructive',
      'item.update': 'text-info',
      'organization.create': 'text-success',
      'organization.delete': 'text-destructive',
      'organization.update': 'text-info',
      'user.login': 'text-brand',
      'user.register': 'text-success',
    }
    return colors[action] ?? 'text-text-secondary'
  }

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
      'organization.delete': 'Deleted organization',
      'organization.member.invite': 'Invited member',
      'organization.member.remove': 'Removed member',
      'organization.update': 'Updated organization',
      'user.login': 'Logged in',
      'user.register': 'Registered',
    }
    return labels[action] ?? action
  }
</script>

<div class="space-y-8">
  <div>
    <h1 class="text-2xl font-bold text-text-primary">Admin Dashboard</h1>
    <p class="mt-1 text-[14px] text-text-muted">Overview of your application.</p>
  </div>

  {#if statsQuery.isPending}
    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {#each Array(4) as _}
        <div class="animate-pulse rounded-xl border border-border bg-surface p-6">
          <div class="h-4 w-20 rounded bg-muted"></div>
          <div class="mt-3 h-8 w-16 rounded bg-muted"></div>
        </div>
      {/each}
    </div>
  {:else if statsQuery.isError}
    <div class="rounded-lg border border-destructive/30 bg-destructive/10 p-6 text-center text-sm text-destructive">
      Failed to load dashboard stats
    </div>
  {:else if statsQuery.data}
    {@const stats = statsQuery.data}

    <!-- Stat cards -->
    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <!-- Users -->
      <div class="rounded-xl border border-border bg-surface p-6">
        <div class="flex items-center justify-between">
          <p class="text-[13px] text-text-muted">Users</p>
          <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-brand/10">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-brand">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
            </svg>
          </div>
        </div>
        <p class="mt-2 text-2xl font-semibold text-text-primary">{stats.users.total}</p>
        <div class="mt-1 flex items-center gap-2">
          <span class="text-[12px] text-success">+{stats.users.newThisWeek} this week</span>
          {#if stats.users.suspended > 0}
            <span class="text-[12px] text-destructive">{stats.users.suspended} suspended</span>
          {/if}
        </div>
      </div>

      <!-- Blog Posts -->
      <div class="rounded-xl border border-border bg-surface p-6">
        <div class="flex items-center justify-between">
          <p class="text-[13px] text-text-muted">Blog Posts</p>
          <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-brand/10">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-brand">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
          </div>
        </div>
        <p class="mt-2 text-2xl font-semibold text-text-primary">{stats.posts.total}</p>
        <div class="mt-1 flex items-center gap-2">
          <span class="text-[12px] text-success">{stats.posts.published} published</span>
          <span class="text-[12px] text-text-subtle">{stats.posts.draft} drafts</span>
        </div>
      </div>

      <!-- Items -->
      <div class="rounded-xl border border-border bg-surface p-6">
        <div class="flex items-center justify-between">
          <p class="text-[13px] text-text-muted">Items</p>
          <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-brand/10">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-brand">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
            </svg>
          </div>
        </div>
        <p class="mt-2 text-2xl font-semibold text-text-primary">{stats.items.total}</p>
        <span class="text-[12px] text-success">{stats.items.active} active</span>
      </div>

      <!-- Active Users -->
      <div class="rounded-xl border border-border bg-surface p-6">
        <div class="flex items-center justify-between">
          <p class="text-[13px] text-text-muted">Active Users</p>
          <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-brand/10">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-brand">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
        </div>
        <p class="mt-2 text-2xl font-semibold text-text-primary">{stats.users.active}</p>
        <span class="text-[12px] text-text-subtle">{stats.users.total > 0 ? Math.round((stats.users.active / stats.users.total) * 100) : 0}% of total</span>
      </div>
    </div>

    <!-- Recent Activity -->
    <div>
      <div class="flex items-center justify-between">
        <h2 class="text-[16px] font-semibold text-text-primary">Recent Activity</h2>
        <a href="/admin/audit" class="text-[13px] text-brand hover:underline">View all</a>
      </div>
      {#if stats.audit.length === 0}
        <div class="mt-4 rounded-xl border border-border bg-surface p-6">
          <p class="text-[13px] text-text-muted">No activity recorded yet.</p>
        </div>
      {:else}
        <div class="mt-4 overflow-hidden rounded-xl border border-border bg-surface">
          <div class="divide-y divide-white/[0.04]">
            {#each stats.audit as entry (entry.id)}
              <div class="flex items-center justify-between px-4 py-3">
                <div class="flex items-center gap-3">
                  <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-medium text-text-secondary">
                    {entry.userName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p class="text-[13px] text-text-primary">
                      <span class="font-medium">{entry.userName}</span>
                      <span class="ms-1 {getActionColor(entry.action)}">{formatAction(entry.action)}</span>
                    </p>
                    {#if entry.entityType}
                      <p class="text-[11px] text-text-subtle">{entry.entityType}</p>
                    {/if}
                  </div>
                </div>
                <span class="shrink-0 text-[11px] text-text-faint">{formatTimeAgo(entry.createdAt)}</span>
              </div>
            {/each}
          </div>
        </div>
      {/if}
    </div>
  {/if}
</div>
