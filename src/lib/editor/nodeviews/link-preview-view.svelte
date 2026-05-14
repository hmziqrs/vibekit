<script lang="ts">
  interface Props {
    url: string
    title: string
    description: string
    image: string
    siteName: string
    fetching: boolean
    fetchError: boolean
    onUpdateAttrs: (attrs: Record<string, unknown>) => void
  }

  let {
    url,
    title = '',
    description = '',
    image = '',
    siteName = '',
    fetching = false,
    fetchError = false,
    onUpdateAttrs,
  }: Props = $props()

  let domain = $derived(() => {
    try {
      return new URL(url).hostname
    } catch {
      return url
    }
  })

  $effect(() => {
    if (!url || fetching || title || fetchError) return
    onUpdateAttrs({ fetching: true })
    fetch('/api/blog/link-preview', {
      body: JSON.stringify({ url }),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    })
      .then((res) => {
        if (!res.ok) throw new Error('Failed')
        return res.json() as Promise<{
          title?: string
          description?: string
          image?: string
          siteName?: string
        }>
      })
      .then((data) => {
        onUpdateAttrs({
          description: data.description ?? '',
          fetchError: false,
          fetching: false,
          image: data.image ?? '',
          siteName: data.siteName ?? '',
          title: data.title ?? '',
        })
      })
      .catch(() => {
        onUpdateAttrs({ fetchError: true, fetching: false })
      })
  })
</script>

<div class="my-3 rounded-lg border border-border overflow-hidden" contenteditable="false">
  {#if fetching}
    <div class="p-4 flex items-center gap-3">
      <div class="size-5 border-2 border-brand border-t-transparent rounded-full animate-spin"></div>
      <span class="text-xs text-text-muted">Fetching preview...</span>
    </div>
  {:else if fetchError}
    <div class="p-4 flex items-center justify-between">
      <div>
        <p class="text-xs text-destructive">Failed to fetch preview</p>
        <a href={url} target="_blank" rel="noopener noreferrer" class="text-xs text-brand hover:underline">{url}</a>
      </div>
    </div>
  {:else}
    <a href={url} target="_blank" rel="noopener noreferrer" class="flex hover:bg-surface/50 transition-colors">
      {#if image}
        <img src={image} alt="" class="w-24 h-24 object-cover flex-shrink-0" loading="lazy" />
      {/if}
      <div class="p-3 space-y-1 min-w-0">
        <p class="text-sm font-medium text-text-primary truncate">{title || domain()}</p>
        {#if description}
          <p class="text-xs text-text-muted line-clamp-2">{description}</p>
        {/if}
        <p class="text-[11px] text-text-faint">{siteName || domain()}</p>
      </div>
    </a>
  {/if}
</div>
