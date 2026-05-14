<script lang="ts">
  import { createMutation, createQuery, useQueryClient } from '@tanstack/svelte-query'
  import { cn } from '$lib/utils'

  const queryClient = useQueryClient()

  let typeFilter = $state<string>('')
  let prefixFilter = $state<string>('')
  let selectedKeys = $state<Set<string>>(new Set())
  let viewMode = $state<'grid' | 'list'>('grid')
  let uploading = $state(false)

  const mediaQuery = createQuery(() => ({
    queryFn: async () => {
      const params = new URLSearchParams()
      if (typeFilter) params.set('type', typeFilter)
      if (prefixFilter) params.set('prefix', prefixFilter)
      params.set('limit', '100')
      const res = await fetch(`/api/admin/media?${params}`)
      if (!res.ok) throw new Error('Failed to fetch media')
      return res.json() as Promise<{
        items: {
          contentType?: string
          key: string
          lastModified: string
          size: number
        }[]
        nextCursor?: string
        truncated: boolean
      }>
    },
    queryKey: ['admin', 'media', typeFilter, prefixFilter],
  }))

  const uploadMutation = createMutation(() => ({
    mutationFn: async (files: FileList) => {
      const results = []
      for (const file of files) {
        const formData = new FormData()
        formData.append('file', file)
        // oxlint-disable-next-line no-await-in-loop
        const res = await fetch('/api/admin/media/upload', {
          body: formData,
          method: 'POST',
        })
        if (!res.ok) throw new Error(`Failed to upload ${file.name}`)
        // oxlint-disable-next-line no-await-in-loop
        results.push(await res.json())
      }
      return results
    },
    onSuccess: () => {
      uploading = false
      void queryClient.invalidateQueries({ queryKey: ['admin', 'media'] })
    },
  }))

  const deleteMutation = createMutation(() => ({
    mutationFn: async (keys: string[]) => {
      const res = await fetch('/api/admin/media/bulk-delete', {
        body: JSON.stringify({ keys }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      })
      if (!res.ok) throw new Error('Failed to delete')
      return res.json()
    },
    onSuccess: () => {
      selectedKeys = new Set()
      void queryClient.invalidateQueries({ queryKey: ['admin', 'media'] })
    },
  }))

  function handleFileInput(e: Event) {
    const input = e.target as HTMLInputElement
    if (input.files && input.files.length > 0) {
      uploading = true
      uploadMutation.mutate(input.files)
    }
  }

  function toggleSelect(key: string) {
    const next = new Set(selectedKeys)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    selectedKeys = next
  }

  function selectAll() {
    if (!mediaQuery.data) return
    selectedKeys = selectedKeys.size === mediaQuery.data.items.length
      ? new Set()
      : new Set(mediaQuery.data.items.map((i) => i.key))
  }

  function formatSize(bytes: number) {
    if (bytes < 1024) return `${bytes}B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
  }

  function fileIcon(contentType?: string) {
    if (!contentType) return '📄'
    if (contentType.startsWith('image/')) return '🖼️'
    if (contentType.startsWith('video/')) return '🎬'
    if (contentType.startsWith('audio/')) return '🎵'
    if (contentType.includes('pdf')) return '📕'
    return '📄'
  }

  function thumbnailUrl(key: string) {
    return `/cdn/blog/${key}`
  }

  const types = [
    { label: 'All', value: '' },
    { label: 'Images', value: 'image' },
    { label: 'Videos', value: 'video' },
    { label: 'Audio', value: 'audio' },
    { label: 'Documents', value: 'document' },
  ]
</script>

<div class="space-y-6">
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-xl font-semibold text-text-primary">Media Library</h1>
      <p class="mt-1 text-sm text-text-muted">Browse, upload, and manage media files</p>
    </div>
    <div class="flex items-center gap-2">
      <div class="flex rounded-lg border border-white/[0.06] bg-surface-deep p-0.5">
        <button
          class={cn(
            'rounded-md px-2 py-1 text-xs transition-colors',
            viewMode === 'grid' ? 'bg-brand text-brand-foreground' : 'text-text-muted',
          )}
          onclick={() => (viewMode = 'grid')}
        >
          Grid
        </button>
        <button
          class={cn(
            'rounded-md px-2 py-1 text-xs transition-colors',
            viewMode === 'list' ? 'bg-brand text-brand-foreground' : 'text-text-muted',
          )}
          onclick={() => (viewMode = 'list')}
        >
          List
        </button>
      </div>
      <label
        class="cursor-pointer rounded-lg bg-brand px-4 py-2 text-sm font-medium text-brand-foreground transition-colors hover:bg-brand-hover"
      >
        {uploading ? 'Uploading...' : 'Upload'}
        <input
          type="file"
          class="hidden"
          multiple
          accept="image/*,video/*,audio/*,.pdf"
          onchange={handleFileInput}
          disabled={uploading}
        />
      </label>
    </div>
  </div>

  {#if uploadMutation.isError}
    <div class="rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
      Upload failed: {uploadMutation.error?.message}
    </div>
  {/if}

  <!-- Filters -->
  <div class="flex items-center gap-3">
    <div class="flex gap-1 rounded-lg bg-white/[0.03] p-1">
      {#each types as t (t.value)}
        <button
          class={cn(
            'rounded-md px-3 py-1 text-xs font-medium transition-colors',
            typeFilter === t.value ? 'bg-white/8 text-text-primary' : 'text-text-muted hover:text-text-secondary',
          )}
          onclick={() => (typeFilter = t.value)}
        >{t.label}</button>
      {/each}
    </div>
    <input
      type="text"
      placeholder="Filter by prefix..."
      bind:value={prefixFilter}
      class="w-48 rounded-md border border-white/[0.08] bg-surface-base px-3 py-1.5 text-xs text-text-primary placeholder:text-text-faint focus:border-brand focus:outline-none"
    />
    {#if selectedKeys.size > 0}
      <button
        onclick={() => {
          if (confirm(`Delete ${selectedKeys.size} file(s)?`)) {
            deleteMutation.mutate([...selectedKeys])
          }
        }}
        class="rounded-lg bg-destructive/10 px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/20"
      >
        Delete ({selectedKeys.size})
      </button>
    {/if}
  </div>

  <!-- Content -->
  {#if mediaQuery.isPending}
    <div class="flex items-center justify-center py-12">
      <div class="h-6 w-6 animate-spin rounded-full border-2 border-brand border-t-transparent"></div>
    </div>
  {:else if mediaQuery.data}
    {@const items = mediaQuery.data.items}
    {#if items.length === 0}
      <div class="rounded-lg border border-white/[0.06] bg-surface p-8 text-center">
        <p class="text-sm text-text-muted">No media files found. Upload some to get started.</p>
      </div>
    {:else if viewMode === 'grid'}
      <div class="flex items-center justify-end text-xs text-text-muted">
        <button onclick={selectAll} class="hover:text-text-secondary">
          {selectedKeys.size === items.length ? 'Deselect all' : 'Select all'}
        </button>
      </div>
      <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {#each items as item (item.key)}
          {@const isSelected = selectedKeys.has(item.key)}
          {@const isImage = item.contentType?.startsWith('image/')}
          <button
            class={cn(
              'group relative overflow-hidden rounded-lg border transition-all',
              isSelected
                ? 'border-brand ring-2 ring-brand/30'
                : 'border-white/[0.06] hover:border-white/[0.12]',
            )}
            onclick={() => toggleSelect(item.key)}
          >
            <div class="aspect-square bg-surface-base">
              {#if isImage}
                <img
                  src={thumbnailUrl(item.key)}
                  alt={item.key}
                  class="h-full w-full object-cover"
                  loading="lazy"
                />
              {:else}
                <div class="flex h-full flex-col items-center justify-center gap-1">
                  <span class="text-2xl">{fileIcon(item.contentType)}</span>
                  <span class="max-w-full truncate px-2 text-[10px] text-text-muted">{item.key.split('/').pop()}</span>
                </div>
              {/if}
            </div>
            <div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-foreground/60 to-transparent p-2">
              <p class="truncate text-[10px] text-brand-foreground">{item.key.split('/').pop()}</p>
              <p class="text-[9px] text-brand-foreground/60">{formatSize(item.size)}</p>
            </div>
          </button>
        {/each}
      </div>
    {:else}
      <!-- List view -->
      <div class="flex items-center justify-end text-xs text-text-muted">
        <button onclick={selectAll} class="hover:text-text-secondary">
          {selectedKeys.size === items.length ? 'Deselect all' : 'Select all'}
        </button>
      </div>
      <div class="overflow-hidden rounded-lg border border-white/[0.06]">
        <table class="w-full">
          <thead>
            <tr class="border-b border-white/[0.06] bg-surface-deep">
              <th class="w-10 px-3 py-2"></th>
              <th class="px-3 py-2 text-left text-xs font-medium text-text-muted">File</th>
              <th class="px-3 py-2 text-left text-xs font-medium text-text-muted">Type</th>
              <th class="px-3 py-2 text-right text-xs font-medium text-text-muted">Size</th>
              <th class="px-3 py-2 text-right text-xs font-medium text-text-muted">Modified</th>
              <th class="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {#each items as item (item.key)}
              {@const isSelected = selectedKeys.has(item.key)}
              <tr class={cn('border-b border-white/[0.04]', isSelected && 'bg-brand/5')}>
                <td class="px-3 py-2">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onchange={() => toggleSelect(item.key)}
                    class="rounded border-white/[0.12]"
                  />
                </td>
                <td class="px-3 py-2">
                  <div class="flex items-center gap-2">
                    <span class="text-sm">{fileIcon(item.contentType)}</span>
                    <span class="max-w-48 truncate text-sm text-text-primary">
                      {item.key.split('/').pop()}
                    </span>
                  </div>
                </td>
                <td class="px-3 py-2 text-xs text-text-muted">{item.contentType ?? 'unknown'}</td>
                <td class="px-3 py-2 text-right text-xs text-text-secondary">{formatSize(item.size)}</td>
                <td class="px-3 py-2 text-right text-xs text-text-muted">
                  {new Date(item.lastModified).toLocaleDateString()}
                </td>
                <td class="px-3 py-2">
                  <button
                    onclick={() => {
                      if (confirm('Delete this file?')) {
                        deleteMutation.mutate([item.key])
                      }
                    }}
                    class="rounded px-2 py-1 text-xs text-text-faint hover:bg-destructive/10 hover:text-destructive"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  {:else if mediaQuery.isError}
    <div class="rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
      Failed to load media files
    </div>
  {/if}
</div>
