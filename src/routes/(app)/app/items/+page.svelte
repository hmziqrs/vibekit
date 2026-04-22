<script lang="ts">
  import ConfirmDialog from '$lib/components/confirm-dialog.svelte'
  import FilterTabs from '$lib/components/filter-tabs.svelte'
  import SearchInput from '$lib/components/search-input.svelte'
  import StatusBadge from '$lib/components/status-badge.svelte'
  import { createQuery, useQueryClient } from '@tanstack/svelte-query'

  interface ItemData {
    id: string
    name: string
    description: string | null
    status: string
    createdAt: string
    updatedAt: string
  }

  let statusFilter = $state<string>('active')
  let search = $state('')
  let deleteTarget = $state<ItemData | null>(null)

  const queryClient = useQueryClient()

  const itemsQuery = createQuery(() => ({
    queryKey: ['items', { status: statusFilter, search }],
    queryFn: async (): Promise<ItemData[]> => {
      const params = new URLSearchParams()
      if (statusFilter && statusFilter !== 'all') params.set('status', statusFilter)
      if (search) params.set('search', search)
      const res = await fetch(`/api/items?${params}`)
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

  async function toggleArchive(id: string, currentStatus: string) {
    const newStatus = currentStatus === 'active' ? 'archived' : 'active'
    const res = await fetch(`/api/items/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
    if (res.ok) {
      await queryClient.invalidateQueries({ queryKey: ['items'] })
    }
  }

  async function deleteItem() {
    if (!deleteTarget) return
    const res = await fetch(`/api/items/${deleteTarget.id}`, { method: 'DELETE' })
    if (res.ok) {
      deleteTarget = null
      await queryClient.invalidateQueries({ queryKey: ['items'] })
    }
  }

  const filterTabs = [
    { value: 'all', label: 'All' },
    { value: 'active', label: 'Active' },
    { value: 'archived', label: 'Archived' },
  ]
</script>

<ConfirmDialog
  bind:open={deleteTarget}
  title="Delete Item"
  message="Are you sure you want to delete this item? This action can be undone within 30 days."
  confirmLabel="Delete"
  variant="danger"
  onConfirm={deleteItem}
/>

<div class="mx-auto max-w-5xl">
  <!-- Header -->
  <div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
    <h1 class="text-2xl font-semibold text-text-primary">Items</h1>
    <a
      href="/app/items/new"
      class="inline-flex items-center justify-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-[13px] font-medium text-brand-foreground transition-colors hover:bg-brand-hover"
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

  <!-- Filters -->
  <div class="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
    <FilterTabs tabs={filterTabs} bind:active={statusFilter} />
    <div class="sm:w-64">
      <SearchInput bind:value={search} placeholder="Search items..." />
    </div>
  </div>

  <!-- Items list -->
  {#if itemsQuery.isLoading}
    <div class="rounded-xl border border-white/[0.06] bg-surface">
      <div class="divide-y divide-white/[0.04] p-1">
        {#each [1, 2, 3, 4, 5] as skeleton (skeleton)}
          <div class="flex items-center justify-between px-5 py-3">
            <div class="space-y-2">
              <div class="h-4 w-48 animate-pulse rounded bg-white/[0.04]"></div>
              <div class="h-3 w-24 animate-pulse rounded bg-white/[0.04]"></div>
            </div>
            <div class="h-6 w-16 animate-pulse rounded-full bg-white/[0.04]"></div>
          </div>
        {/each}
      </div>
    </div>
  {:else if itemsQuery.error}
    <div class="rounded-xl border border-destructive/20 bg-surface p-8 text-center">
      <p class="text-[14px] text-destructive">Failed to load items.</p>
      <button
        onclick={() => itemsQuery.refetch()}
        class="mt-2 text-[13px] font-medium text-brand transition-colors hover:text-brand-hover"
      >
        Try again
      </button>
    </div>
  {:else if !itemsQuery.data?.length}
    <div class="rounded-xl border border-white/[0.06] bg-surface p-8 text-center">
      <p class="text-[14px] text-text-muted">
        {search ? 'No items match your search.' : 'No items yet.'}
      </p>
      {#if !search}
        <a
          href="/app/items/new"
          class="mt-2 inline-block text-[13px] font-medium text-brand transition-colors hover:text-brand-hover"
        >
          Create your first item
        </a>
      {/if}
    </div>
  {:else}
    <div class="rounded-xl border border-white/[0.06] bg-surface">
      <div class="divide-y divide-white/[0.04]">
        {#each itemsQuery.data as item (item.id)}
          <div class="flex items-center justify-between px-5 py-3">
            <a
              href="/app/items/{item.id}/edit"
              class="min-w-0 flex-1 transition-colors hover:opacity-80"
            >
              <p class="truncate text-[13px] font-medium text-text-primary">{item.name}</p>
              <p class="mt-0.5 text-[11px] text-text-subtle">{formatDate(item.createdAt)}</p>
            </a>

            <div class="ml-4 flex items-center gap-2">
              <StatusBadge status={item.status} />

              <button
                onclick={() => toggleArchive(item.id, item.status)}
                class="rounded-lg p-1.5 text-text-muted transition-colors hover:bg-white/[0.04] hover:text-text-primary"
                title={item.status === 'active' ? 'Archive' : 'Restore'}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  {#if item.status === 'active'}
                    <polyline points="21 8 21 21 3 21 3 8"></polyline>
                    <rect x="1" y="3" width="22" height="5"></rect>
                    <line x1="10" y1="12" x2="14" y2="12"></line>
                  {:else}
                    <polyline points="1 4 1 10 7 10"></polyline>
                    <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
                  {/if}
                </svg>
              </button>

              <a
                href="/app/items/{item.id}/edit"
                class="rounded-lg p-1.5 text-text-muted transition-colors hover:bg-white/[0.04] hover:text-text-primary"
                title="Edit"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <path
                    d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"
                  ></path>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                </svg>
              </a>

              <button
                onclick={() => (deleteTarget = item)}
                class="rounded-lg p-1.5 text-text-muted transition-colors hover:bg-destructive/10 hover:text-destructive"
                title="Delete"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path
                    d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
                  ></path>
                </svg>
              </button>
            </div>
          </div>
        {/each}
      </div>
    </div>
  {/if}
</div>
