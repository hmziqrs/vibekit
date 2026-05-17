<script lang="ts">
  import { page } from '$app/state'
  import Pagination from '$lib/components/pagination.svelte'

  let results = $state<{ content: string; entityId: string; entityType: string; score: number; title: string }[]>([])
  let total = $state(0)
  let isLoading = $state(false)
  let error = $state('')
  let currentOffset = $state(0)
  let activeType = $state('')
  const limit = 20

  const entityTypes = [
    { label: 'All', value: '' },
    { label: 'Blog Posts', value: 'blog_post' },
    { label: 'Items', value: 'item' },
    { label: 'Users', value: 'user' },
    { label: 'Pages', value: 'page' },
  ]

  let query = $derived(page.url.searchParams.get('q') ?? '')

  $effect(() => {
    const q = page.url.searchParams.get('q')
    const t = page.url.searchParams.get('type') ?? ''
    if (q !== undefined) {
      activeType = t
      currentOffset = 0
      fetchResults(q ?? '', t, 0)
    }
  })

  async function fetchResults(q: string, type: string, offset: number) {
    if (!q || q.trim().length < 2) {
      results = []
      total = 0
      return
    }

    isLoading = true
    error = ''
    try {
      const params = new URLSearchParams({
        limit: String(limit),
        offset: String(offset),
        q: q.trim(),
      })
      if (type) params.set('types', type)
      const res = await fetch(`/api/search?${params}`)
      if (res.ok) {
        const data: { hits?: typeof results; total?: number } = await res.json()
        results = data.hits ?? []
        total = data.total ?? 0
        currentOffset = offset
      } else {
        error = 'Search failed. Please try again.'
      }
    } catch {
      error = 'Network error. Please check your connection.'
    } finally {
      isLoading = false
    }
  }

  function setType(type: string) {
    const params = new URLSearchParams(page.url.searchParams)
    if (type) {
      params.set('type', type)
    } else {
      params.delete('type')
    }
    params.delete('offset')
    window.history.replaceState({}, '', `/app/search?${params}`)
    fetchResults(query, type, 0)
  }

  function goToPage(offset: number) {
    fetchResults(query, activeType, offset)
    window.scrollTo({ behavior: 'smooth', top: 0 })
  }

  function getTypeLabel(type: string): string {
    switch (type) {
      case 'blog_post': {
        return 'Blog Post'
      }
      case 'user': {
        return 'User'
      }
      case 'item': {
        return 'Item'
      }
      case 'page': {
        return 'Page'
      }
      default: {
        return type
      }
    }
  }

  function getResultUrl(result: { entityId: string; entityType: string }): string {
    switch (result.entityType) {
      case 'blog_post': {
        return `/admin/blog/${result.entityId}/edit`
      }
      case 'user': {
        return `/admin/users`
      }
      case 'item': {
        return `/app/items`
      }
      default: {
        return '#'
      }
    }
  }

  import { highlightMatch } from '$lib/utils/highlight-match'

  function getTypeCount(type: string): number {
    if (!type) return total
    return results.filter((r) => r.entityType === type).length
  }
</script>

<svelte:head>
  <title>Search{query ? `: ${query}` : ''} — Vibekit</title>
</svelte:head>

<div class="mx-auto max-w-3xl">
  <div class="mb-6">
    <h1 class="text-xl font-semibold text-text-primary">Search Results</h1>
    {#if query}
      <p class="mt-1 text-[14px] text-text-muted">
        {#if !isLoading}
          {total} result{total !== 1 ? 's' : ''} for "{query}"
        {:else}
          Searching...
        {/if}
      </p>
    {/if}
  </div>

  <!-- Type filters -->
  <div class="mb-6 flex flex-wrap gap-2">
    {#each entityTypes as type (type.value)}
      <button
        class="rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors {activeType === type.value
          ? 'bg-brand text-brand-foreground'
          : 'bg-white/[0.04] text-text-muted hover:bg-white/[0.06] hover:text-text-primary'}"
        onclick={() => setType(type.value)}
      >
        {type.label}
      </button>
    {/each}
  </div>

  <!-- Error -->
  {#if error}
    <div class="mb-4 rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-[13px] text-destructive-foreground">
      {error}
    </div>
  {/if}

  <!-- Loading -->
  {#if isLoading}
    <div class="space-y-4">
      {#each Array(5) as _, i}
        <div class="animate-pulse rounded-lg border border-white/[0.06] bg-surface p-4">
          <div class="mb-2 h-4 w-1/3 rounded bg-white/[0.06]"></div>
          <div class="mb-1 h-3 w-full rounded bg-white/[0.04]"></div>
          <div class="h-3 w-2/3 rounded bg-white/[0.04]"></div>
        </div>
      {/each}
    </div>
  {:else if results.length > 0}
    <!-- Results list -->
    <div class="space-y-3">
      {#each results as result (result.entityId + result.entityType)}
        <a
          href={getResultUrl(result)}
          class="block rounded-lg border border-white/[0.06] bg-surface p-4 transition-colors hover:border-white/[0.1] hover:bg-surface-deep"
        >
          <div class="mb-1 flex items-start justify-between gap-3">
            <h3 class="text-[14px] font-medium text-text-primary">
              {@html highlightMatch(result.title, query)}
            </h3>
            <span class="shrink-0 rounded-md bg-white/[0.04] px-2 py-0.5 text-[11px] font-medium text-text-muted">
              {getTypeLabel(result.entityType)}
            </span>
          </div>
          <p class="line-clamp-2 text-[13px] leading-relaxed text-text-muted">
            {@html highlightMatch(result.content.slice(0, 200), query)}
          </p>
        </a>
      {/each}
    </div>

    <!-- Pagination -->
    {#if total > limit}
      <div class="mt-6">
        <Pagination
          currentPage={Math.floor(currentOffset / limit) + 1}
          totalPages={Math.ceil(total / limit)}
          totalItems={total}
          pageSize={limit}
          onPageChange={(page: number) => goToPage((page - 1) * limit)}
        />
      </div>
    {/if}
  {:else if query && query.length >= 2}
    <div class="rounded-lg border border-white/[0.06] bg-surface px-6 py-12 text-center">
      <svg
        class="mx-auto mb-3 text-text-faint"
        width="32"
        height="32"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.3-4.3" />
      </svg>
      <p class="text-[14px] text-text-muted">No results found for "{query}"</p>
      <p class="mt-1 text-[13px] text-text-faint">Try different keywords or remove filters</p>
    </div>
  {:else}
    <div class="rounded-lg border border-white/[0.06] bg-surface px-6 py-12 text-center">
      <p class="text-[14px] text-text-muted">Enter a search query to get started</p>
    </div>
  {/if}
</div>
