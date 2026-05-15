<script lang="ts">
  import type { Editor } from '@tiptap/core'
  import { X } from '@lucide/svelte'
  import { createFocusTrap } from '$lib/keyboard.svelte'

  interface Props {
    editor: Editor
    onClose: () => void
  }

  let { editor, onClose }: Props = $props()
  let query = $state('')
  let results = $state<{ excerpt: string | null; id: string; slug: string; title: string }[]>([])
  let loading = $state(false)
  let searchTimer: ReturnType<typeof setTimeout> | null = null
  let dialogEl: HTMLDivElement | undefined = $state()

  $effect(() => {
    if (dialogEl) {
      const trap = createFocusTrap(dialogEl)
      return () => trap.destroy()
    }
  })

  $effect(() => {
    if (searchTimer) clearTimeout(searchTimer)
    if (query.length < 2) {
      results = []
      return
    }
    loading = true
    searchTimer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/blog/search?q=${encodeURIComponent(query)}`)
        if (!res.ok) throw new Error('Failed')
        const { results: fetched } = (await res.json()) as { results: typeof results }
        results = fetched
      } catch {
        results = []
      } finally {
        loading = false
      }
    }, 300)
  })

  function insertAsRelated(result: (typeof results)[number]) {
    editor.chain().focus().setRelatedArticle({
      articleId: result.id,
      excerpt: result.excerpt ?? '',
      slug: result.slug,
      title: result.title,
    }).run()
    onClose()
  }

  function insertAsEmbed(result: (typeof results)[number]) {
    editor.chain().focus().setArticleSectionEmbed({
      articleId: result.id,
      articleSlug: result.slug,
      articleTitle: result.title,
      content: result.excerpt ?? '',
    }).run()
    onClose()
  }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50" role="dialog" tabindex="-1" aria-label="Insert article" onkeydown={(e) => { if (e.key === 'Escape') onClose() }}>
  <div bind:this={dialogEl} class="w-full max-w-lg rounded-lg border border-border bg-surface-base p-6">
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-lg font-semibold text-text-primary">Insert Article</h2>
      <button onclick={onClose} class="text-text-muted hover:text-text-primary" aria-label="Close">
        <X class="size-5" />
      </button>
    </div>

    <input
      type="text"
      bind:value={query}
      placeholder="Search articles..."
      aria-label="Search articles"
      class="w-full rounded-lg border border-border bg-transparent px-3 py-2 text-sm text-text-primary outline-none focus:border-brand mb-4"
      autofocus
    />

    {#if loading}
      <p class="text-sm text-text-muted text-center py-4">Searching...</p>
    {:else if query.length >= 2 && results.length === 0}
      <p class="text-sm text-text-faint text-center py-4">No articles found.</p>
    {:else}
      <div class="space-y-2 max-h-64 overflow-y-auto">
        {#each results as result (result.id)}
          <div class="rounded border border-border p-3 hover:border-brand/50 transition-colors">
            <p class="text-sm font-medium text-text-primary">{result.title}</p>
            {#if result.excerpt}
              <p class="text-xs text-text-muted mt-1 line-clamp-1">{result.excerpt}</p>
            {/if}
            <div class="flex gap-2 mt-2">
              <button
                onclick={() => insertAsRelated(result)}
                class="text-xs px-2 py-1 rounded border border-border text-text-muted hover:text-brand hover:border-brand transition-colors"
              >
                Reference Card
              </button>
              <button
                onclick={() => insertAsEmbed(result)}
                class="text-xs px-2 py-1 rounded border border-border text-text-muted hover:text-brand hover:border-brand transition-colors"
              >
                Embed Section
              </button>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>
