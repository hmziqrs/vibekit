<script lang="ts">
  interface Props {
    provider: string
    url: string
    embedId?: string
    caption?: string
    sourceName?: string
    onUpdateAttrs: (attrs: Record<string, unknown>) => void
  }

  let {
    provider,
    url,
    embedId = '',
    caption = '',
    sourceName = '',
    onUpdateAttrs,
  }: Props = $props()

  let editingCaption = $state(false)
  // oxlint-disable-next-line capitalized-comments
  // svelte-ignore state_referenced_locally
  let captionInput = $state(caption)

  const PROVIDER_DISPLAY: Record<string, string> = {
    facebook: 'Facebook',
    'github-gist': 'GitHub Gist',
    instagram: 'Instagram',
    reddit: 'Reddit',
    tiktok: 'TikTok',
    twitter: 'X / Twitter',
    vimeo: 'Vimeo',
    youtube: 'YouTube',
  }

  let isGist = $derived(provider === 'github-gist')
  let displayProvider = $derived(PROVIDER_DISPLAY[provider] ?? provider)

  function saveCaption() {
    editingCaption = false
    onUpdateAttrs({ caption: captionInput })
  }
</script>

<div class="my-4 overflow-hidden rounded-lg border border-border" contenteditable="false">
  {#if isGist}
    <div class="gist-embed bg-surface-deep min-h-[60px] p-4">
      <script src={url}></script>
      <noscript>
        <a href={url} target="_blank" rel="noopener noreferrer" class="text-brand hover:underline">
          View GitHub Gist
        </a>
      </noscript>
    </div>
  {:else}
    <div class="relative aspect-video w-full bg-surface-deep">
      <iframe
        src={url}
        class="size-full"
        allowfullscreen
        loading="lazy"
        title="{provider} embed"
      ></iframe>
    </div>
  {/if}

  <div class="px-3 py-2 text-center text-sm">
    {#if editingCaption}
      <input
        type="text"
        bind:value={captionInput}
        aria-label="Embed caption"
        class="w-full rounded border border-border bg-transparent px-2 py-1 text-center text-text-secondary outline-none focus:border-brand"
        placeholder="Embed caption..."
        onkeydown={(e) => { if (e.key === 'Enter') saveCaption() }}
        onblur={saveCaption}
      />
    {:else if caption}
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <p
        class="cursor-text italic text-text-muted"
        onclick={() => { editingCaption = true; captionInput = caption }}
      >
        {caption}
      </p>
    {:else}
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <p
        class="cursor-text italic text-text-muted opacity-50"
        onclick={() => { editingCaption = true; captionInput = '' }}
      >
        Add caption...
      </p>
    {/if}

    {#if sourceName}
      <p class="mt-1 text-xs text-text-subtle">
        Source: {sourceName}
      </p>
    {/if}

    <p class="mt-1 text-xs text-text-faint">
      {displayProvider}
    </p>
  </div>
</div>
