<script lang="ts">
  import type { Editor } from '@tiptap/core'
  import { cn } from '$lib/utils'
  import { X } from '@lucide/svelte'

  interface Props {
    editor: Editor
    onClose: () => void
  }

  let { editor, onClose }: Props = $props()
  let items = $state<{ contentType?: string; key: string; lastModified?: string; size: number }[]>([])
  let loading = $state(true)
  let error = $state('')

  async function fetchMedia() {
    loading = true
    error = ''
    try {
      const res = await fetch('/api/blog/media?limit=50')
      if (!res.ok) throw new Error('Failed to fetch')
      const { items: fetched } = (await res.json()) as { items: typeof items }
      items = fetched
    } catch {
      error = 'Failed to load media'
    } finally {
      loading = false
    }
  }

  function insertImage(key: string) {
    editor.chain().focus().setFigureImage({
      caption: '',
      src: `/cdn/blog/${key}`,
    }).run()
    onClose()
  }

  function formatSize(bytes: number) {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  fetchMedia()
</script>

<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50" role="dialog">
  <div class="w-full max-w-2xl rounded-lg border border-border bg-surface-base p-6">
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-lg font-semibold text-text-primary">Media Library</h2>
      <button onclick={onClose} class="text-text-muted hover:text-text-primary">
        <X class="size-5" />
      </button>
    </div>

    {#if loading}
      <div class="flex items-center justify-center py-12">
        <p class="text-text-muted">Loading...</p>
      </div>
    {:else if error}
      <p class="text-red-400 text-sm">{error}</p>
    {:else if items.length === 0}
      <p class="text-text-muted text-sm py-8 text-center">No files uploaded yet.</p>
    {:else}
      <div class="grid grid-cols-4 gap-3 max-h-96 overflow-y-auto">
        {#each items as item}
          <button
            onclick={() => insertImage(item.key)}
            class={cn(
              'group relative rounded-lg border border-border overflow-hidden',
              'hover:border-brand hover:ring-1 hover:ring-brand transition-all',
            )}
          >
            <div class="aspect-square bg-surface flex items-center justify-center">
              <img
                src={`/cdn/blog/${item.key}`}
                alt={item.key}
                class="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
            <div class="p-2">
              <p class="text-xs text-text-muted truncate">{item.key}</p>
              <p class="text-xs text-text-faint">{formatSize(item.size)}</p>
            </div>
          </button>
        {/each}
      </div>
    {/if}
  </div>
</div>
