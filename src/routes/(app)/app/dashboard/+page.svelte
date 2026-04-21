<script lang="ts">
  import { createQuery } from '@tanstack/svelte-query'
  import { useSession } from '$lib/auth-client'

  interface ItemData {
    id: string
    name: string
    description: string | null
    status: string
    createdAt: string
    updatedAt: string
  }

  const session = useSession()

  const itemsQuery = createQuery(() => ({
    queryKey: ['items', 'recent'],
    queryFn: async (): Promise<ItemData[]> => {
      const res = await fetch('/api/items?status=active')
      if (!res.ok) throw new Error('Failed to fetch items')
      const data = (await res.json()) as { items: ItemData[] }
      return data.items
    },
  }))

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }
</script>

<div class="mx-auto max-w-5xl">
  <!-- Welcome -->
  <div class="mb-8">
    <h1 class="text-2xl font-semibold text-text-primary">
      Welcome back, {$session.data?.user?.name || 'User'}
    </h1>
    <p class="mt-1 text-[14px] text-text-muted">Here is what is happening with your items.</p>
  </div>

  <!-- Stats -->
  <div class="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
    {#if itemsQuery.isLoading}
      {#each [1, 2, 3] as skeleton (skeleton)}
        <div class="h-[88px] animate-pulse rounded-xl border border-white/[0.06] bg-surface"></div>
      {/each}
    {:else if itemsQuery.error}
      <div class="col-span-full rounded-xl border border-destructive/20 bg-surface p-6">
        <p class="text-[14px] text-destructive">
          Failed to load stats. Please refresh the page.
        </p>
      </div>
    {:else}
      <div class="rounded-xl border border-white/[0.06] bg-surface p-6">
        <p class="text-[13px] text-text-muted">Active Items</p>
        <p class="mt-2 text-2xl font-semibold text-text-primary">{itemsQuery.data?.length ?? 0}</p>
      </div>
      <div class="rounded-xl border border-white/[0.06] bg-surface p-6">
        <p class="text-[13px] text-text-muted">Total Created</p>
        <p class="mt-2 text-2xl font-semibold text-text-primary">{itemsQuery.data?.length ?? 0}</p>
      </div>
      <div class="rounded-xl border border-white/[0.06] bg-surface p-6">
        <p class="text-[13px] text-text-muted">Quick Action</p>
        <a
          href="/app/items/new"
          class="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-[13px] font-medium text-brand-foreground transition-colors hover:bg-brand-hover"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          Create Item
        </a>
      </div>
    {/if}
  </div>

  <!-- Recent Items -->
  <div class="rounded-xl border border-white/[0.06] bg-surface">
    <div class="border-b border-white/[0.06] px-6 py-4">
      <h2 class="text-[15px] font-medium text-text-primary">Recent Items</h2>
    </div>

    {#if itemsQuery.isLoading}
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
              <p class="mt-0.5 text-[11px] text-text-subtle">{formatDate(item.createdAt)}</p>
            </div>
            <span
              class="ml-4 shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium {item.status === 'active'
                ? 'bg-emerald-500/10 text-emerald-400'
                : 'bg-amber-500/10 text-amber-400'}"
            >
              {item.status}
            </span>
          </a>
        {/each}
      </div>
    {/if}
  </div>
</div>
