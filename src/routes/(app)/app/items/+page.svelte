<script lang="ts">
  import ConfirmDialog from '$lib/components/confirm-dialog.svelte'
  import FilterTabs from '$lib/components/filter-tabs.svelte'
  import SearchInput from '$lib/components/search-input.svelte'
  import StatusBadge from '$lib/components/status-badge.svelte'
  import { createQuery, useQueryClient } from '@tanstack/svelte-query'
  import type { ItemData } from '$lib/types'
  import { formatDate } from '$lib/i18n.svelte'

  let statusFilter = $state<string>('active')
  let search = $state('')
  let deleteTarget = $state<ItemData | null>(null)
  let deleteDialogOpen = $state(false)
  let mutationError = $state('')

  const queryClient = useQueryClient()

  const itemsQuery = createQuery(() => ({
    queryFn: async (): Promise<ItemData[]> => {
      const params = new URLSearchParams()
      if (statusFilter && statusFilter !== 'all') params.set('status', statusFilter)
      if (search) params.set('search', search)
      const res = await fetch(`/api/items?${params}`)
      if (!res.ok) throw new Error('Failed to fetch items')
      const data = (await res.json()) as { items: ItemData[] }
      return data.items
    },
    queryKey: ['items', { search, status: statusFilter }],
  }))

  async function toggleArchive(id: string, currentStatus: string) {
    mutationError = ''
    const newStatus = currentStatus === 'active' ? 'archived' : 'active'
    try {
      const res = await fetch(`/api/items/${id}`, {
        body: JSON.stringify({ status: newStatus }),
        headers: { 'Content-Type': 'application/json' },
        method: 'PATCH',
      })
      if (!res.ok) throw new Error('Failed to update item')
      await queryClient.invalidateQueries({ queryKey: ['items'] })
    } catch {
      mutationError = 'Failed to update item status.'
    }
  }

  async function deleteItem() {
    if (!deleteTarget) {return}
    mutationError = ''
    try {
      const res = await fetch(`/api/items/${deleteTarget.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete item')
      deleteTarget = null
      deleteDialogOpen = false
      await queryClient.invalidateQueries({ queryKey: ['items'] })
    } catch {
      mutationError = 'Failed to delete item.'
    }
  }

  const filterTabs = [
    { label: 'All', value: 'all' },
    { label: 'Active', value: 'active' },
    { label: 'Archived', value: 'archived' },
  ]
</script>

<ConfirmDialog
  bind:open={deleteDialogOpen}
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

  {#if mutationError}
    <p class="mb-4 rounded-lg bg-destructive/10 px-4 py-2 text-[13px] text-destructive">{mutationError}</p>
  {/if}

  <!-- Items list -->
  {#if itemsQuery.isPending}
    <div class="rounded-xl border border-white/6 bg-surface">
      <div class="divide-y divide-white/6 p-1">
        {#each [1, 2, 3, 4, 5] as skeleton (skeleton)}
          <div class="flex items-center justify-between px-5 py-3">
            <div class="space-y-2">
              <div class="h-4 w-48 animate-pulse rounded bg-white/4"></div>
              <div class="h-3 w-24 animate-pulse rounded bg-white/4"></div>
            </div>
            <div class="h-6 w-16 animate-pulse rounded-full bg-white/4"></div>
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
    <div class="rounded-xl border border-white/6 bg-surface p-8 text-center">
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
    <div class="rounded-xl border border-white/6 bg-surface">
      <div class="divide-y divide-white/6">
        {#each itemsQuery.data as item (item.id)}
          <div class="flex items-center justify-between px-5 py-3">
            <a
              href="/app/items/{item.id}/edit"
              class="min-w-0 flex-1 transition-colors hover:opacity-80"
            >
              <p class="truncate text-[13px] font-medium text-text-primary">{item.name}</p>
              <p class="mt-0.5 text-[11px] text-text-subtle">{formatDate(item.createdAt, { day: 'numeric', month: 'short', year: 'numeric' })}</p>
            </a>

            <div class="ms-4 flex items-center gap-2">
              <StatusBadge status={item.status} />

              <button
                onclick={() => toggleArchive(item.id, item.status)}
                aria-label={item.status === 'active' ? 'Archive' : 'Restore'}
                class="rounded-lg p-1.5 text-text-muted transition-colors hover:bg-white/4 hover:text-text-primary"
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
                aria-label="Edit"
                class="rounded-lg p-1.5 text-text-muted transition-colors hover:bg-white/4 hover:text-text-primary"
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
                onclick={() => {
                  deleteTarget = item
                  deleteDialogOpen = true
                }}
                aria-label="Delete"
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
