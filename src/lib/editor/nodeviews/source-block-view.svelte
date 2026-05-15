<script lang="ts">
  import { cn } from '$lib/utils'
  import { ExternalLink } from '@lucide/svelte'

  interface Props {
    label: string
    onUpdateAttrs: (attrs: Record<string, unknown>) => void
    sourceName?: string
    url?: string
  }

  let { label, onUpdateAttrs, sourceName, url }: Props = $props()

  function update(field: string, value: string) {
    onUpdateAttrs({ [field]: value })
  }
</script>

<div
  class="source-block rounded-lg border border-border bg-surface-elevated p-4"
  contenteditable="false"
>
  <div class="space-y-2">
    <input
      type="text"
      value={label}
      aria-label="Source label"
      placeholder="Source label (e.g. 'Police Report', 'Court Filing')"
      class="w-full rounded border border-border bg-surface-base px-2 py-1 text-sm font-medium text-text-primary"
      oninput={(e) => update('label', (e.target as HTMLInputElement).value)}
    />
    <div class="flex gap-2">
      <input
        type="text"
        value={sourceName}
        aria-label="Source name"
        placeholder="Source name (e.g. 'AP News')"
        class="flex-1 rounded border border-border bg-surface-base px-2 py-1 text-sm text-text-secondary"
        oninput={(e) => update('sourceName', (e.target as HTMLInputElement).value)}
      />
      <div class="relative flex-1">
        <input
          type="url"
          value={url}
          aria-label="Source URL"
          placeholder="https://..."
          class="w-full rounded border border-border bg-surface-base px-2 py-1 pe-8 text-sm text-text-secondary"
          oninput={(e) => update('url', (e.target as HTMLInputElement).value)}
        />
        {#if url}
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            class="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-brand"
          >
            <ExternalLink size={14} />
          </a>
        {/if}
      </div>
    </div>
  </div>
</div>
