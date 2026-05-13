<script lang="ts">
  import type { Editor } from '@tiptap/core'
  import ConfirmDialog from '$lib/components/confirm-dialog.svelte'
  import { cn } from '$lib/utils'
  import { FileText, Image, LayoutGrid, List, Music, Search, Trash2, Upload, X } from '@lucide/svelte'

  interface MediaItem {
    contentType?: string
    key: string
    lastModified?: string
    size: number
  }

  interface Props {
    editor?: Editor | null
    onClose: () => void
  }

  let { editor, onClose }: Props = $props()

  let items = $state<MediaItem[]>([])
  let viewMode = $state<'grid' | 'list'>('grid')
  let searchQuery = $state('')
  let fileTypeFilter = $state<'all' | 'image' | 'video' | 'audio' | 'document'>('all')
  let nextCursor = $state<string | undefined>(undefined)
  let hasMore = $state(false)
  let loading = $state(true)
  let loadingMore = $state(false)
  let error = $state('')
  let uploading = $state(false)
  let uploadError = $state('')
  let previewItem = $state<MediaItem | null>(null)
  let deleteTarget = $state<MediaItem | null>(null)
  let showDeleteDialog = $state(false)
  let deleting = $state(false)

  function formatSize(bytes: number) {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  function fileIcon(contentType?: string) {
    if (!contentType) return FileText
    if (contentType.startsWith('image/')) return Image
    if (contentType.startsWith('video/')) return FileText
    if (contentType.startsWith('audio/')) return Music
    return FileText
  }

  let filteredItems = $derived(() => {
    let result = items
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      result = result.filter((i) => i.key.toLowerCase().includes(q))
    }
    if (fileTypeFilter !== 'all') {
      result = result.filter((i) => {
        const ct = i.contentType ?? ''
        switch (fileTypeFilter) {
          case 'image': { return ct.startsWith('image/')
          }
          case 'video': { return ct.startsWith('video/')
          }
          case 'audio': { return ct.startsWith('audio/')
          }
          case 'document': { return !ct.startsWith('image/') && !ct.startsWith('video/') && !ct.startsWith('audio/')
          }
        }
      })
    }
    return result
  })

  async function fetchMedia(append = false) {
    if (append) {
      loadingMore = true
    } else {
      loading = true
    }
    error = ''
    try {
      const params = new URLSearchParams()
      params.set('limit', '24')
      if (append && nextCursor) params.set('cursor', nextCursor)
      const res = await fetch(`/api/blog/media?${params}`)
      if (!res.ok) throw new Error('Failed to fetch')
      const data = (await res.json()) as { items: MediaItem[]; nextCursor?: string; truncated?: boolean }
      if (append) {
        items = [...items, ...data.items]
      } else {
        ({ items } = data)
      }
      ({ nextCursor } = data)
      hasMore = data.truncated ?? false
    } catch (e) {
      console.error('Failed to load media', e)
      error = 'Failed to load media'
    } finally {
      loading = false
      loadingMore = false
    }
  }

  async function handleUpload(e: Event) {
    const input = e.target as HTMLInputElement
    const file = input.files?.[0]
    if (!file) return

    uploading = true
    uploadError = ''
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/blog/upload', { body: formData, method: 'POST' })
      if (!res.ok) throw new Error('Upload failed')
      const { key } = (await res.json()) as { key: string; url: string }
      items = [{ contentType: file.type, key, lastModified: new Date().toISOString(), size: file.size }, ...items]
    } catch (e) {
      console.error('Failed to upload file', e)
      uploadError = 'Upload failed'
    } finally {
      uploading = false
      input.value = ''
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    deleting = true
    try {
      const res = await fetch(`/api/blog/media/${encodeURIComponent(deleteTarget.key)}`, { method: 'DELETE' })
      if (res.ok) {
        items = items.filter((i) => i.key !== deleteTarget!.key)
        if (previewItem?.key === deleteTarget.key) previewItem = null
        deleteTarget = null
        showDeleteDialog = false
      }
    } finally {
      deleting = false
    }
  }

  function insertImage(key: string) {
    if (!editor) return
    editor.chain().focus().setFigureImage({ caption: '', src: `/cdn/blog/${key}` }).run()
    onClose()
  }

  fetchMedia()
</script>

<ConfirmDialog
  bind:open={showDeleteDialog}
  title="Delete File"
  message="Permanently delete this file? This cannot be undone."
  confirmLabel="Delete"
  variant="danger"
  onConfirm={confirmDelete}
/>

{#if previewItem}
  <div class="fixed inset-0 z-[60] flex items-center justify-center bg-black/60" role="dialog">
    <div class="w-full max-w-3xl rounded-lg border border-border bg-surface-base p-6">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-[14px] font-medium text-text-primary truncate mr-4">{previewItem.key}</h3>
        <button onclick={() => previewItem = null} class="shrink-0 text-text-muted hover:text-text-primary">
          <X class="size-5" />
        </button>
      </div>
      <div class="flex items-center justify-center bg-surface rounded-lg p-4 mb-4">
        {#if previewItem.contentType?.startsWith('image/')}
          <img src={`/cdn/blog/${previewItem.key}`} alt={previewItem.key} class="max-h-[50vh] max-w-full rounded object-contain" />
        {:else}
          <div class="py-12 text-text-muted">Preview not available for this file type</div>
        {/if}
      </div>
      <div class="flex items-center gap-4 text-[12px] text-text-muted mb-4">
        <span>{formatSize(previewItem.size)}</span>
        {#if previewItem.contentType}
          <span>{previewItem.contentType}</span>
        {/if}
      </div>
      <div class="flex items-center gap-2">
        {#if editor}
          <button
            onclick={() => insertImage(previewItem!.key)}
            class="rounded-lg bg-brand px-4 py-2 text-[12px] font-semibold text-brand-foreground hover:bg-brand-hover"
          >
            Insert into editor
          </button>
        {/if}
        <button
          onclick={() => { deleteTarget = previewItem; showDeleteDialog = true }}
          class="rounded-lg border border-red-500/30 px-4 py-2 text-[12px] font-medium text-red-400 hover:bg-red-500/10"
        >
          Delete
        </button>
        <button onclick={() => previewItem = null} class="rounded-lg border border-white/[0.1] px-4 py-2 text-[12px] text-text-muted hover:text-text-primary">
          Close
        </button>
      </div>
    </div>
  </div>
{/if}

<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50" role="dialog">
  <div class="w-full max-w-4xl rounded-lg border border-border bg-surface-base p-6">
    <!-- Header -->
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-lg font-semibold text-text-primary">Media Library</h2>
      <div class="flex items-center gap-2">
        <label class="cursor-pointer rounded-lg border border-white/[0.1] px-3 py-1.5 text-[12px] font-medium text-text-muted hover:bg-white/[0.04] hover:text-text-primary {uploading ? 'opacity-50 pointer-events-none' : ''}">
          <input type="file" accept="image/*,video/*,audio/*" class="hidden" onchange={handleUpload} disabled={uploading} />
          {uploading ? 'Uploading...' : 'Upload'}
        </label>
        <button onclick={onClose} class="text-text-muted hover:text-text-primary">
          <X class="size-5" />
        </button>
      </div>
    </div>

    {#if uploadError}
      <p class="mb-3 text-[12px] text-red-400">{uploadError}</p>
    {/if}

    <!-- Toolbar -->
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
      <div class="flex items-center gap-1">
        {#each [
          { label: 'All', value: 'all' as const },
          { label: 'Images', value: 'image' as const },
          { label: 'Video', value: 'video' as const },
          { label: 'Audio', value: 'audio' as const },
          { label: 'Docs', value: 'document' as const },
        ] as tab}
          <button
            onclick={() => fileTypeFilter = tab.value}
            class="rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors {fileTypeFilter === tab.value
              ? 'bg-brand/15 text-brand'
              : 'text-text-muted hover:bg-white/[0.04] hover:text-text-primary'}"
          >
            {tab.label}
          </button>
        {/each}
      </div>

      <div class="flex items-center gap-2">
        <div class="relative">
          <Search class="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-text-faint" />
          <input
            type="text"
            placeholder="Search files..."
            bind:value={searchQuery}
            class="w-48 rounded-lg border border-border bg-input py-1.5 pl-8 pr-3 text-[12px] text-text-primary placeholder:text-text-faint focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          />
        </div>
        <div class="flex items-center rounded-lg border border-border">
          <button
            onclick={() => viewMode = 'grid'}
            class={cn('p-1.5 transition-colors', viewMode === 'grid' ? 'bg-white/8 text-text-primary' : 'text-text-muted hover:text-text-primary')}
          >
            <LayoutGrid class="size-3.5" />
          </button>
          <button
            onclick={() => viewMode = 'list'}
            class={cn('p-1.5 transition-colors', viewMode === 'list' ? 'bg-white/8 text-text-primary' : 'text-text-muted hover:text-text-primary')}
          >
            <List class="size-3.5" />
          </button>
        </div>
      </div>
    </div>

    <!-- Content -->
    {#if loading}
      <div class="grid grid-cols-4 gap-3">
        {#each Array(8) as _}
          <div class="aspect-square animate-pulse rounded-lg bg-white/[0.06]"></div>
        {/each}
      </div>
    {:else if error}
      <p class="py-8 text-center text-[13px] text-red-400">{error}</p>
    {:else if filteredItems().length === 0 && items.length === 0}
      <p class="py-8 text-center text-[13px] text-text-muted">No files uploaded yet.</p>
    {:else if filteredItems().length === 0}
      <p class="py-8 text-center text-[13px] text-text-muted">No files match your search.</p>
    {:else if viewMode === 'grid'}
      <div class="grid grid-cols-4 gap-3 max-h-[70vh] overflow-y-auto">
        {#each filteredItems() as item (item.key)}
          <div class="group relative overflow-hidden rounded-lg border border-border transition-all hover:border-brand hover:ring-1 hover:ring-brand">
            <button onclick={() => previewItem = item} class="aspect-square w-full bg-surface">
              {#if item.contentType?.startsWith('image/')}
                <img src={`/cdn/blog/${item.key}`} alt={item.key} class="h-full w-full object-cover" loading="lazy" />
              {:else}
                <div class="flex h-full w-full items-center justify-center">
                  <FileText class="size-8 text-text-faint" />
                </div>
              {/if}
            </button>
            <div class="flex items-center justify-between p-2">
              <div class="min-w-0 flex-1">
                <p class="truncate text-[11px] text-text-muted">{item.key}</p>
                <p class="text-[10px] text-text-faint">{formatSize(item.size)}</p>
              </div>
              <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {#if editor}
                  <button onclick={() => insertImage(item.key)} class="p-1 text-text-muted hover:text-brand" title="Insert">
                    <Upload class="size-3" />
                  </button>
                {/if}
                <button
                  onclick={() => { deleteTarget = item; showDeleteDialog = true }}
                  class="p-1 text-text-muted hover:text-red-400"
                  title="Delete"
                >
                  <Trash2 class="size-3" />
                </button>
              </div>
            </div>
          </div>
        {/each}
      </div>
    {:else}
      <!-- List view -->
      <div class="max-h-[70vh] overflow-y-auto space-y-1">
        {#each filteredItems() as item (item.key)}
          <div class="flex items-center gap-3 rounded-lg border border-border px-3 py-2 transition-colors hover:bg-white/[0.02]">
            <div class="size-10 shrink-0 overflow-hidden rounded bg-surface">
              {#if item.contentType?.startsWith('image/')}
                <img src={`/cdn/blog/${item.key}`} alt={item.key} class="size-full object-cover" loading="lazy" />
              {:else}
                {@const Icon = fileIcon(item.contentType)}
                <div class="flex size-full items-center justify-center">
                  <Icon class="size-4 text-text-faint" />
                </div>
              {/if}
            </div>
            <div class="min-w-0 flex-1">
              <p class="truncate text-[13px] text-text-primary">{item.key}</p>
              <p class="text-[11px] text-text-faint">{formatSize(item.size)} {item.contentType ? `· ${item.contentType}` : ''}</p>
            </div>
            <div class="flex items-center gap-2">
              <button onclick={() => previewItem = item} class="text-[11px] text-text-muted hover:text-text-primary">View</button>
              {#if editor}
                <button onclick={() => insertImage(item.key)} class="text-[11px] text-brand hover:text-brand-hover">Insert</button>
              {/if}
              <button
                onclick={() => { deleteTarget = item; showDeleteDialog = true }}
                class="text-[11px] text-red-400 hover:text-red-300"
              >
                Delete
              </button>
            </div>
          </div>
        {/each}
      </div>
    {/if}

    {#if hasMore}
      <div class="mt-4 text-center">
        <button
          onclick={() => fetchMedia(true)}
          disabled={loadingMore}
          class="rounded-lg border border-white/[0.1] px-4 py-2 text-[12px] font-medium text-text-muted hover:bg-white/[0.04] hover:text-text-primary disabled:opacity-50"
        >
          {loadingMore ? 'Loading...' : 'Load more'}
        </button>
      </div>
    {/if}
  </div>
</div>
