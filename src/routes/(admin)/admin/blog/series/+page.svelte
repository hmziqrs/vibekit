<script lang="ts">
  import ConfirmDialog from '$lib/components/confirm-dialog.svelte'
  import DataTable from '$lib/components/data-table.svelte'
  import SearchInput from '$lib/components/search-input.svelte'
  import { createQuery } from '@tanstack/svelte-query'
  import { createSeriesSchema, updateSeriesSchema } from '$lib/validators/blog'

  interface SeriesRow {
    coverImageUrl: string | null
    description: string | null
    id: string
    name: string
    postCount: number
    slug: string
  }

  let search = $state('')
  let searchDebounced = $state('')
  let selectedIds = $state<Set<string>>(new Set())
  let deleteTarget = $state<SeriesRow | null>(null)
  let showConfirmDialog = $state(false)
  let showCreateForm = $state(false)
  let editingSeries = $state<SeriesRow | null>(null)

  let newName = $state('')
  let newSlug = $state('')
  let newDescription = $state('')
  let formError = $state('')
  let formSaving = $state(false)

  let debounceTimer: ReturnType<typeof setTimeout> | null = null
  $effect(() => {
    const q = search
    if (debounceTimer) clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => {
      searchDebounced = q
    }, 300)
    return () => {
      if (debounceTimer) clearTimeout(debounceTimer)
    }
  })

  const seriesQuery = createQuery(() => ({
    queryFn: async () => {
      const res = await fetch('/api/blog/series')
      if (!res.ok) throw new Error('Failed to fetch series')
      return (await res.json()) as { series: SeriesRow[] }
    },
    queryKey: ['admin', 'series', { q: searchDebounced }],
    retry: 1,
  }))

  let filteredSeries = $derived(
    searchDebounced
      ? (seriesQuery.data?.series ?? []).filter(
          (s) =>
            s.name.toLowerCase().includes(searchDebounced.toLowerCase()) ||
            s.slug.toLowerCase().includes(searchDebounced.toLowerCase()),
        )
      : (seriesQuery.data?.series ?? []),
  )

  const columns = [
    { class: 'min-w-[200px]', key: 'name', label: 'Name', sortable: true },
    { class: 'min-w-[140px]', key: 'slug', label: 'Slug', sortable: true },
    { class: 'w-[100px]', key: 'postCount', label: 'Posts', sortable: true },
    { class: 'min-w-[200px]', key: 'description', label: 'Description' },
    { class: 'w-[160px]', key: 'actions', label: '' },
  ]

  function generateSlug() {
    newSlug = newName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
  }

  function resetForm() {
    newName = ''
    newSlug = ''
    newDescription = ''
    formError = ''
    showCreateForm = false
    editingSeries = null
  }

  function startEdit(series: SeriesRow) {
    editingSeries = series
    newName = series.name
    newSlug = series.slug
    newDescription = series.description ?? ''
    formError = ''
    showCreateForm = true
  }

  async function handleCreateOrUpdate() {
    formError = ''
    const schema = editingSeries ? updateSeriesSchema : createSeriesSchema
    const payload = editingSeries
      ? { description: newDescription || null, name: newName, slug: newSlug }
      : { description: newDescription || null, name: newName, slug: newSlug }

    const result = schema.safeParse(payload)
    if (!result.success) {
      formError = result.error.issues.map((i) => i.message).join(', ')
      return
    }

    formSaving = true
    try {
      const res = editingSeries
        ? await fetch(`/api/blog/series/${editingSeries.id}`, {
            body: JSON.stringify(payload),
            headers: { 'Content-Type': 'application/json' },
            method: 'PATCH',
          })
        : await fetch('/api/blog/series', {
            body: JSON.stringify(payload),
            headers: { 'Content-Type': 'application/json' },
            method: 'POST',
          })

      if (!res.ok) {
        const data = (await res.json()) as { error?: string }
        formError = data.error ?? 'Failed to save series'
        formSaving = false
        return
      }

      resetForm()
      seriesQuery.refetch()
    } catch {
      formError = 'Network error'
    } finally {
      formSaving = false
    }
  }

  async function deleteSeries() {
    if (!deleteTarget) return
    const res = await fetch(`/api/blog/series/${deleteTarget.id}`, { method: 'DELETE' })
    if (res.ok) {
      deleteTarget = null
      showConfirmDialog = false
      seriesQuery.refetch()
    }
  }

  function handleSort(_key: string, _dir: 'asc' | 'desc') {
    // Client-side sorting handled by filteredSeries
  }
</script>

<ConfirmDialog
  bind:open={showConfirmDialog}
  title="Delete Series"
  message="Delete this series? Posts in the series will not be deleted."
  confirmLabel="Delete"
  variant="danger"
  onConfirm={deleteSeries}
/>

<div class="flex items-center justify-between">
  <h1 class="text-2xl font-bold text-text-primary">Series</h1>
  <div class="flex items-center gap-3">
    <a
      href="/admin/blog"
      class="text-[13px] text-text-muted hover:text-text-primary"
    >
      Back to posts
    </a>
    <button
      onclick={() => {
        if (showCreateForm) {
          resetForm()
        } else {
          resetForm()
          showCreateForm = true
        }
      }}
      class="rounded-lg bg-brand px-4 py-2 text-[13px] font-semibold text-brand-foreground transition-all hover:bg-brand-hover"
    >
      {showCreateForm ? 'Cancel' : 'New Series'}
    </button>
  </div>
</div>

{#if showCreateForm}
  <form
    onsubmit={(e) => {
      e.preventDefault()
      handleCreateOrUpdate()
    }}
    class="mt-6 rounded-lg border border-border bg-surface p-5"
  >
    <h2 class="mb-4 text-sm font-semibold text-text-primary">
      {editingSeries ? 'Edit Series' : 'Create Series'}
    </h2>
    {#if formError}
      <p class="mb-3 rounded-lg bg-destructive/10 px-3 py-2 text-[12px] text-destructive">{formError}</p>
    {/if}
    <div class="flex flex-col gap-4 sm:flex-row sm:items-start">
      <div class="flex-1">
        <label for="series-name" class="mb-1 block text-[12px] font-medium text-text-secondary"
          >Name</label
        >
        <input
          id="series-name"
          bind:value={newName}
          oninput={generateSlug}
          class="w-full rounded-lg border border-border bg-input px-3 py-2 text-[13px] text-text-primary focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
        />
      </div>
      <div class="flex-1">
        <label for="series-slug" class="mb-1 block text-[12px] font-medium text-text-secondary"
          >Slug</label
        >
        <input
          id="series-slug"
          bind:value={newSlug}
          class="w-full rounded-lg border border-border bg-input px-3 py-2 text-[13px] text-text-primary focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
        />
      </div>
      <div class="flex-1">
        <label
          for="series-description"
          class="mb-1 block text-[12px] font-medium text-text-secondary">Description</label
        >
        <input
          id="series-description"
          bind:value={newDescription}
          class="w-full rounded-lg border border-border bg-input px-3 py-2 text-[13px] text-text-primary focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
        />
      </div>
      <button
        type="submit"
        disabled={formSaving}
        class="mt-5 shrink-0 rounded-lg bg-brand px-4 py-2 text-[13px] font-semibold text-brand-foreground transition-all hover:bg-brand-hover disabled:opacity-50"
      >
        {formSaving ? 'Saving...' : editingSeries ? 'Update' : 'Create'}
      </button>
    </div>
  </form>
{/if}

<div class="mt-6 flex items-center gap-3">
  <div class="flex-1 max-w-xs">
    <SearchInput bind:value={search} placeholder="Search series..." />
  </div>
</div>

<div class="mt-4">
  <DataTable
    {columns}
    rows={filteredSeries as unknown as Record<string, unknown>[]}
    loading={seriesQuery.isPending}
    {selectedIds}
    onSelectionChange={(ids) => (selectedIds = ids)}
    sortKey="name"
    sortDir="asc"
    onSort={handleSort}
    error={seriesQuery.error ? 'Failed to load series.' : ''}
    onRetry={() => seriesQuery.refetch()}
    emptyMessage="No series yet. Create your first series!"
  >
    {#snippet children({ row: _row, columnKey })}
      {@const row = _row as unknown as SeriesRow}
      {#if columnKey === 'name'}
        <span class="truncate font-medium">{row.name}</span>
      {:else if columnKey === 'slug'}
        <span class="text-text-muted">/blog/series/{row.slug}</span>
      {:else if columnKey === 'postCount'}
        <span class="text-text-muted">{row.postCount}</span>
      {:else if columnKey === 'description'}
        <span class="line-clamp-1 text-text-muted">{row.description ?? '—'}</span>
      {:else if columnKey === 'actions'}
        <div class="flex items-center gap-2">
          <button
            class="rounded-lg border border-border px-3 py-1 text-[12px] font-medium text-text-muted hover:bg-surface hover:text-text-primary"
            onclick={() => startEdit(row)}
          >
            Edit
          </button>
          <button
            class="rounded-lg border border-destructive/30 px-3 py-1 text-[12px] font-medium text-destructive hover:bg-destructive/10"
            onclick={() => {
              deleteTarget = row
              showConfirmDialog = true
            }}
          >
            Delete
          </button>
        </div>
      {/if}
    {/snippet}
  </DataTable>
</div>
