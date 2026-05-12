<script lang="ts">
  import ConfirmDialog from '$lib/components/confirm-dialog.svelte'
  import DataTable from '$lib/components/data-table.svelte'
  import FilterTabs from '$lib/components/filter-tabs.svelte'
  import Pagination from '$lib/components/pagination.svelte'
  import SearchInput from '$lib/components/search-input.svelte'
  import StatusBadge from '$lib/components/status-badge.svelte'
  import { createQuery } from '@tanstack/svelte-query'

  interface PostRow {
    coverImageUrl: string | null
    createdAt: string
    deletedAt: string | null
    excerpt: string | null
    id: string
    publishedAt: string | null
    scheduledAt: string | null
    slug: string
    status: string
    title: string
    updatedAt: string
  }

  let statusFilter = $state('all')
  let search = $state('')
  let searchDebounced = $state('')
  let currentPage = $state(1)
  let sortKey = $state('createdAt')
  let sortDir = $state<'asc' | 'desc'>('desc')
  let selectedIds = $state<Set<string>>(new Set())
  let deleteTarget = $state<PostRow | null>(null)
  let showConfirmDialog = $state(false)
  let bulkAction = $state<'delete' | 'archive' | null>(null)
  let bulkError = $state('')

  const pageSize = 20

  const statusColors: Record<string, string> = {
    archived: 'bg-red-500/15 text-red-400',
    deleted: 'bg-white/[0.06] text-text-muted',
    draft: 'bg-yellow-500/15 text-yellow-400',
    published: 'bg-green-500/15 text-green-400',
    scheduled: 'bg-blue-500/15 text-blue-400',
    trash: 'bg-white/[0.06] text-text-muted',
  }

  let debounceTimer: ReturnType<typeof setTimeout> | null = null
  $effect(() => {
    const q = search
    if (debounceTimer) clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => {
      searchDebounced = q
      currentPage = 1
    }, 300)
    return () => { if (debounceTimer) clearTimeout(debounceTimer) }
  })

  $effect(() => {
    void statusFilter
    selectedIds = new Set()
    bulkError = ''
  })

  const postsQuery = createQuery(() => ({
    queryFn: async () => {
      const params = new URLSearchParams()
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (searchDebounced) params.set('q', searchDebounced)
      params.set('page', String(currentPage))
      params.set('sort', `${sortKey}:${sortDir}`)
      const res = await fetch(`/api/blog?${params}`)
      if (!res.ok) throw new Error('Failed to fetch posts')
      return (await res.json()) as { limit: number; page: number; posts: PostRow[]; total: number }
    },
    queryKey: ['admin', 'posts', { page: currentPage, q: searchDebounced, sort: `${sortKey}:${sortDir}`, status: statusFilter }],
    retry: 1,
  }))

  const columns = [
    { class: 'min-w-[200px]', key: 'title', label: 'Title', sortable: true },
    { class: 'min-w-[140px]', key: 'slug', label: 'Slug', sortable: true },
    { class: 'w-[100px]', key: 'status', label: 'Status', sortable: true },
    { class: 'w-[120px]', key: 'publishedAt', label: 'Published', sortable: true },
    { class: 'w-[120px]', key: 'createdAt', label: 'Created', sortable: true },
    { class: 'w-[160px]', key: 'actions', label: '' },
  ]

  function formatDate(val: string | null): string {
    if (!val) return '—'
    return new Date(val).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })

  }

  async function deletePost() {
    if (!deleteTarget) return
    const res = await fetch(`/api/blog/${deleteTarget.id}`, { method: 'DELETE' })
    if (res.ok) {
      deleteTarget = null
      showConfirmDialog = false
      postsQuery.refetch()
    }
  }

  async function restorePost(id: string) {
    const res = await fetch(`/api/blog/${id}/restore`, { method: 'POST' })
    if (res.ok) postsQuery.refetch()
  }

  async function executeBulkAction() {
    if (!bulkAction || selectedIds.size === 0) return
    bulkError = ''
    const endpoint = bulkAction === 'delete' ? '/api/blog/bulk-delete' : '/api/blog/bulk-archive'
    const res = await fetch(endpoint, {
      body: JSON.stringify({ ids: [...selectedIds] }),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    })
    if (res.ok) {
      selectedIds = new Set()
      bulkAction = null
      showConfirmDialog = false
      postsQuery.refetch()
    } else {
      bulkError = 'Bulk action failed'
    }
  }

  function handleSort(key: string, dir: 'asc' | 'desc') {
    sortKey = key
    sortDir = dir
    currentPage = 1
  }

  function handlePageChange(page: number) {
    currentPage = page
    selectedIds = new Set()
  }

  const tabs = [
    { label: 'All', value: 'all' },
    { label: 'Draft', value: 'draft' },
    { label: 'Scheduled', value: 'scheduled' },
    { label: 'Published', value: 'published' },
    { label: 'Archived', value: 'archived' },
    { label: 'Trash', value: 'trash' },
  ]

  const sortOptions = [
    { label: 'Newest first', value: 'createdAt:desc' },
    { label: 'Oldest first', value: 'createdAt:asc' },
    { label: 'Title A-Z', value: 'title:asc' },
    { label: 'Title Z-A', value: 'title:desc' },
    { label: 'Published newest', value: 'publishedAt:desc' },
    { label: 'Status', value: 'status:asc' },
  ]

  let sortValue = $derived(`${sortKey}:${sortDir}`)

  function handleSortChange(value: string) {
    const [key, dir] = value.split(':')
    sortKey = key
    sortDir = dir as 'asc' | 'desc'
    currentPage = 1
  }
</script>

<ConfirmDialog
  bind:open={showConfirmDialog}
  title={bulkAction ? `Bulk ${bulkAction === 'delete' ? 'Delete' : 'Archive'}` : 'Delete Post'}
  message={bulkAction
    ? `${bulkAction === 'delete' ? 'Move' : 'Archive'} ${selectedIds.size} selected post${selectedIds.size > 1 ? 's' : ''}?`
    : 'Move this post to trash? It can be restored.'}
  confirmLabel={bulkAction ? 'Confirm' : 'Delete'}
  variant="danger"
  onConfirm={bulkAction ? executeBulkAction : deletePost}
/>

<div class="flex items-center justify-between">
  <h1 class="text-2xl font-bold text-text-primary">Blog Posts</h1>
  <a
    href="/admin/blog/new"
    class="rounded-lg bg-brand px-4 py-2 text-[13px] font-semibold text-brand-foreground transition-all hover:bg-brand-hover"
  >
    New Post
  </a>
</div>

<div class="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
  <FilterTabs tabs={tabs} bind:active={statusFilter} />
  <div class="flex items-center gap-2 sm:max-w-xs sm:flex-1">
    <div class="flex-1">
      <SearchInput bind:value={search} placeholder="Search posts..." />
    </div>
    <select
      value={sortValue}
      onchange={(e) => handleSortChange((e.target as HTMLSelectElement).value)}
      class="rounded-lg border border-border bg-input px-3 py-2 text-[12px] text-text-primary focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
    >
      {#each sortOptions as opt (opt.value)}
        <option value={opt.value}>{opt.label}</option>
      {/each}
    </select>
  </div>
</div>

{#if selectedIds.size > 0}
  <div class="mt-4 flex items-center gap-3 rounded-lg border border-border bg-surface px-4 py-2.5">
    <span class="text-[12px] text-text-muted">{selectedIds.size} selected</span>
    <button
      onclick={() => { bulkAction = 'delete'; showConfirmDialog = true }}
      class="rounded-lg border border-red-500/30 px-3 py-1 text-[12px] font-medium text-red-400 hover:bg-red-500/10"
    >
      Delete
    </button>
    <button
      onclick={() => { bulkAction = 'archive'; showConfirmDialog = true }}
      class="rounded-lg border border-white/[0.1] px-3 py-1 text-[12px] font-medium text-text-muted hover:bg-white/[0.04] hover:text-text-primary"
    >
      Archive
    </button>
    <button
      onclick={() => selectedIds = new Set()}
      class="ml-auto text-[12px] text-text-muted hover:text-text-primary"
    >
      Clear
    </button>
  </div>
{/if}

{#if bulkError}
  <p class="mt-2 text-[12px] text-red-400">{bulkError}</p>
{/if}

<div class="mt-4">
  <DataTable
    {columns}
    rows={postsQuery.data?.posts ?? []}
    loading={postsQuery.isPending}
    selectable
    {selectedIds}
    onSelectionChange={(ids) => selectedIds = ids}
    {sortKey}
    {sortDir}
    onSort={handleSort}
    error={postsQuery.error ? 'Failed to load posts.' : ''}
    onRetry={() => postsQuery.refetch()}
    emptyMessage={statusFilter === 'trash' ? 'No trashed posts.' : 'No posts yet. Create your first post!'}
  >
    {#snippet children({ row, columnKey })}
      {#if columnKey === 'title'}
        <span class="truncate font-medium">{row.title}</span>
      {:else if columnKey === 'slug'}
        <span class="text-text-muted">/blog/{row.slug}</span>
      {:else if columnKey === 'status'}
        <StatusBadge
          status={statusFilter === 'trash' ? 'deleted' : (row.status as string)}
          colorMap={statusColors}
        />
      {:else if columnKey === 'publishedAt'}
        {#if row.status === 'scheduled' && row.scheduledAt}
          <span class="text-blue-400">{formatDate(row.scheduledAt as string)}</span>
        {:else}
          <span class="text-text-muted">{formatDate(row.publishedAt as string | null)}</span>
        {/if}
      {:else if columnKey === 'createdAt'}
        <span class="text-text-muted">{formatDate(row.createdAt as string)}</span>
      {:else if columnKey === 'actions'}
        <div class="flex items-center gap-2">
          {#if statusFilter === 'trash'}
            <button
              class="rounded-lg border border-white/[0.06] px-3 py-1 text-[12px] font-medium text-text-muted hover:bg-white/[0.04] hover:text-text-primary"
              onclick={() => restorePost(row.id as string)}
            >
              Restore
            </button>
          {:else}
            <a
              href="/admin/blog/{row.id}/edit"
              class="rounded-lg border border-white/[0.06] px-3 py-1 text-[12px] font-medium text-text-muted hover:bg-white/[0.04] hover:text-text-primary"
            >
              Edit
            </a>
            <button
              class="rounded-lg border border-red-500/30 px-3 py-1 text-[12px] font-medium text-red-400 hover:bg-red-500/10"
              onclick={() => { deleteTarget = row as PostRow; bulkAction = null; showConfirmDialog = true }}
            >
              Delete
            </button>
          {/if}
        </div>
      {/if}
    {/snippet}
  </DataTable>
</div>

{#if postsQuery.data && postsQuery.data.total > pageSize}
  <div class="mt-4">
    <Pagination
      currentPage={currentPage}
      pageSize={pageSize}
      totalItems={postsQuery.data.total}
      totalPages={Math.ceil(postsQuery.data.total / pageSize)}
      onPageChange={handlePageChange}
    />
  </div>
{/if}
