<script lang="ts">
  import { tick } from 'svelte'

  let {
    open = $bindable(false),
  }: {
    open?: boolean
  } = $props()

  let query = $state('')
  let results = $state<{ content: string; entityId: string; entityType: string; score: number; title: string }[]>([])
  let total = $state(0)
  let isLoading = $state(false)
  let selectedIndex = $state(-1)
  let recentSearches = $state<string[]>([])
  let inputEl: HTMLInputElement | undefined = $state()
  let debounceTimer: ReturnType<typeof setTimeout> | undefined

  const STORAGE_KEY = 'vibekit:recent-searches'
  const MAX_RECENT = 5

  $effect(() => {
    if (open) {
      loadRecentSearches()
      tick().then(() => inputEl?.focus())
    } else {
      query = ''
      results = []
      total = 0
      selectedIndex = -1
      isLoading = false
    }
  })

  function loadRecentSearches() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      recentSearches = stored ? JSON.parse(stored) : []
    } catch (error) {
      console.error('Failed to load recent searches', error)
      recentSearches = []
    }
  }

  function saveRecentSearch(term: string) {
    const trimmed = term.trim()
    if (!trimmed) return
    const updated = [trimmed, ...recentSearches.filter((s) => s !== trimmed)].slice(0, MAX_RECENT)
    recentSearches = updated
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    } catch (error) {
      console.error('Failed to save recent searches', error)
    }
  }

  function clearRecentSearches() {
    recentSearches = []
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch (error) {
      console.error('Failed to clear recent searches', error)
    }
  }

  async function search(term: string) {
    const trimmed = term.trim()
    if (trimmed.length < 2) {
      results = []
      total = 0
      return
    }

    isLoading = true
    selectedIndex = -1
    try {
      const params = new URLSearchParams({ limit: '10', q: trimmed })
      const res = await fetch(`/api/search?${params}`)
      if (res.ok) {
        const data: { hits?: typeof results; total?: number } = await res.json()
        results = data.hits ?? []
        total = data.total ?? 0
      }
    } catch (error) {
      console.error('Failed to search', error)
      results = []
      total = 0
    } finally {
      isLoading = false
    }
  }

  function handleInput(e: Event) {
    const target = e.target as HTMLInputElement
    query = target.value
    clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => search(query), 250)
  }

  function handleKeydown(e: KeyboardEvent) {
    const itemCount = results.length > 0 ? results.length : recentSearches.length

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      selectedIndex = selectedIndex < itemCount - 1 ? selectedIndex + 1 : 0
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      selectedIndex = selectedIndex > 0 ? selectedIndex - 1 : itemCount - 1
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (selectedIndex >= 0) {
        if (results.length > 0) {
          goToResult(results[selectedIndex])
        } else {
          selectRecent(recentSearches[selectedIndex])
        }
      } else if (query.trim().length >= 2) {
        goToFullResults()
      }
    } else if (e.key === 'Escape') {
      open = false
    }
  }

  function goToResult(result: { entityId: string; entityType: string; title: string }) {
    saveRecentSearch(query)
    const url = buildResultUrl(result)
    open = false
    window.location.href = url
  }

  function goToFullResults() {
    saveRecentSearch(query)
    open = false
    window.location.href = `/app/search?q=${encodeURIComponent(query.trim())}`
  }

  function selectRecent(term: string) {
    query = term
    search(term)
  }

  function buildResultUrl(result: { entityId: string; entityType: string }): string {
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
        return `/app/search?q=${encodeURIComponent(query)}`
      }
    }
  }

  function getTypeLabel(type: string): string {
    switch (type) {
      case 'blog_post': {
        return 'Blog'
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

  function getTypeIcon(type: string): string {
    switch (type) {
      case 'blog_post': {
        return 'M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7'
      }
      case 'user': {
        return 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2'
      }
      case 'item': {
        return 'M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z'
      }
      default: {
        return 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z'
      }
    }
  }

  function escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
  }

  function highlightMatch(text: string, term: string): string {
    const escaped = escapeHtml(text)
    if (!term) return escaped
    const escapedTerm = escapeHtml(term)
    const regex = new RegExp(`(${escapedTerm.replace(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`)})`, 'gi')
    return escaped.replace(regex, '<mark class="bg-brand/20 text-text-primary rounded px-0.5">$1</mark>')
  }
</script>

{#if open}
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="fixed inset-0 z-50 flex items-start justify-center bg-black/60 pt-[15vh]" role="dialog" aria-label="Search"
    onclick={() => (open = false)}
    onkeydown={(e) => e.key === 'Escape' && (open = false)}
  >
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      class="mx-4 w-full max-w-xl rounded-xl border border-white/[0.06] bg-surface shadow-2xl"
      onclick={(e) => e.stopPropagation()}
      onkeydown={handleKeydown}
    >
      <!-- Search input -->
      <div class="flex items-center gap-3 border-b border-white/[0.06] px-4 py-3">
        <svg
          class="shrink-0 text-text-faint"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <input
          bind:this={inputEl}
          type="text"
          value={query}
          oninput={handleInput}
          placeholder="Search everything..."
          class="flex-1 bg-transparent text-[14px] text-text-primary placeholder:text-text-faint focus:outline-none"
          aria-label="Search"
          role="combobox"
          aria-expanded={results.length > 0 || (query.length < 2 && recentSearches.length > 0)}
          aria-controls="search-results"
        />
        <kbd class="rounded border border-white/[0.08] bg-white/[0.04] px-1.5 py-0.5 text-[10px] text-text-faint">ESC</kbd>
      </div>

      <!-- Results -->
      <div id="search-results" class="max-h-80 overflow-y-auto" role="listbox">
        {#if isLoading}
          <div class="flex items-center justify-center py-8">
            <div class="h-5 w-5 animate-spin rounded-full border-2 border-brand border-t-transparent"></div>
          </div>
        {:else if query.length >= 2 && results.length > 0}
          {#each results as result, i (result.entityId + result.entityType)}
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <button
              class="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors {selectedIndex === i ? 'bg-white/[0.04]' : 'hover:bg-white/[0.03]'}"
              onclick={() => goToResult(result)}
              onmouseenter={() => (selectedIndex = i)}
              role="option"
              aria-selected={selectedIndex === i}
            >
              <div class="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-white/[0.04]">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  class="text-text-muted"
                >
                  <path d={getTypeIcon(result.entityType)}></path>
                </svg>
              </div>
              <div class="min-w-0 flex-1">
                <div class="truncate text-[13px] font-medium text-text-primary">
                  {@html highlightMatch(result.title, query)}
                </div>
                <div class="truncate text-[12px] text-text-subtle">
                  {@html highlightMatch(result.content.slice(0, 120), query)}
                </div>
              </div>
              <span class="mt-0.5 shrink-0 rounded-md bg-white/[0.04] px-2 py-0.5 text-[10px] font-medium text-text-muted">
                {getTypeLabel(result.entityType)}
              </span>
            </button>
          {/each}

          {#if total > results.length}
            <button
              class="flex w-full items-center justify-center border-t border-white/[0.06] px-4 py-3 text-[13px] text-text-muted transition-colors hover:bg-white/[0.03] hover:text-text-primary"
              onclick={goToFullResults}
            >
              View all {total} results
            </button>
          {/if}
        {:else if query.length >= 2 && !isLoading}
          <div class="px-4 py-8 text-center text-[13px] text-text-muted">
            No results for "{query}"
          </div>
        {:else if query.length < 2 && recentSearches.length > 0}
          <div class="flex items-center justify-between px-4 pt-3 pb-1">
            <span class="text-[11px] font-medium uppercase tracking-wider text-text-faint">Recent</span>
            <button
              class="text-[11px] text-text-faint hover:text-text-muted"
              onclick={clearRecentSearches}
            >
              Clear
            </button>
          </div>
          {#each recentSearches as term, i (term)}
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <button
              class="flex w-full items-center gap-3 px-4 py-2 text-left text-[13px] text-text-secondary transition-colors {selectedIndex === i ? 'bg-white/[0.04]' : 'hover:bg-white/[0.03]'}"
              onclick={() => selectRecent(term)}
              onmouseenter={() => (selectedIndex = i)}
              role="option"
              aria-selected={selectedIndex === i}
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
                class="shrink-0 text-text-faint"
              >
                <polyline points="1 4 1 10 7 10"></polyline>
                <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
              </svg>
              {term}
            </button>
          {/each}
        {:else if query.length < 2}
          <div class="px-4 py-8 text-center text-[13px] text-text-muted">
            Type at least 2 characters to search
          </div>
        {/if}
      </div>

      <!-- Footer -->
      <div class="flex items-center gap-4 border-t border-white/[0.06] px-4 py-2">
        <span class="flex items-center gap-1 text-[11px] text-text-faint">
          <kbd class="rounded border border-white/[0.08] bg-white/[0.04] px-1 py-0.5 text-[10px]">&uarr;&darr;</kbd>
          Navigate
        </span>
        <span class="flex items-center gap-1 text-[11px] text-text-faint">
          <kbd class="rounded border border-white/[0.08] bg-white/[0.04] px-1 py-0.5 text-[10px]">&crarr;</kbd>
          Select
        </span>
        <span class="flex items-center gap-1 text-[11px] text-text-faint">
          <kbd class="rounded border border-white/[0.08] bg-white/[0.04] px-1 py-0.5 text-[10px]">esc</kbd>
          Close
        </span>
      </div>
    </div>
  </div>
{/if}
