<script lang="ts">
  interface Props {
    src: string
    alt?: string
    caption?: string
    credit?: string
    sourceUrl?: string
    uploadState?: string
    uploadProgress?: number
    onUpdateAttrs: (attrs: Record<string, unknown>) => void
  }

  let {
    src,
    alt = '',
    caption = '',
    credit = '',
    sourceUrl = '',
    uploadState = 'none',
    uploadProgress = 0,
    onUpdateAttrs,
  }: Props = $props()

  let editingCaption = $state(false)
  let editingCredit = $state(false)
  // oxlint-disable-next-line capitalized-comments
  // svelte-ignore state_referenced_locally
  let captionInput = $state(caption)
  // oxlint-disable-next-line capitalized-comments
  // svelte-ignore state_referenced_locally
  let creditInput = $state(credit)

  let isUploading = $derived(uploadState === 'uploading')
  let hasError = $derived(uploadState === 'error')

  function saveCaption() {
    editingCaption = false
    onUpdateAttrs({ caption: captionInput })
  }

  function saveCredit() {
    editingCredit = false
    onUpdateAttrs({ credit: creditInput })
  }
</script>

<figure class="my-4 relative" contenteditable="false">
  <img
    {src}
    {alt}
    class="w-full rounded-lg {isUploading || hasError ? 'opacity-50' : ''}"
    loading="lazy"
  />

  {#if isUploading}
    <div class="absolute inset-0 flex items-center justify-center">
      <div class="w-3/4">
        <div class="h-1.5 w-full rounded-full bg-surface">
          <div
            class="h-1.5 rounded-full bg-brand transition-all duration-300"
            style="width: {uploadProgress}%"
          ></div>
        </div>
        <p class="mt-1 text-center text-xs text-text-muted">Uploading...</p>
      </div>
    </div>
  {/if}

  {#if hasError}
    <div class="absolute inset-0 flex items-center justify-center">
      <div class="rounded-lg bg-red-500/10 px-4 py-2">
        <p class="text-xs text-red-400">Upload failed</p>
      </div>
    </div>
  {/if}

  {#if !isUploading}
    <div class="mt-2 space-y-1 text-center text-sm text-text-muted">
      {#if editingCaption}
        <input
          type="text"
          bind:value={captionInput}
          class="w-full rounded border border-border bg-transparent px-2 py-1 text-center text-text-secondary outline-none focus:border-brand"
          placeholder="Image caption..."
          onkeydown={(e) => { if (e.key === 'Enter') saveCaption() }}
          onblur={saveCaption}
        />
      {:else if caption}
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <p
          class="cursor-text italic"
          onclick={() => { editingCaption = true; captionInput = caption }}
        >
          {caption}
        </p>
      {:else}
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <p
          class="cursor-text italic opacity-50"
          onclick={() => { editingCaption = true; captionInput = '' }}
        >
          Add caption...
        </p>
      {/if}

      {#if editingCredit}
        <input
          type="text"
          bind:value={creditInput}
          class="w-full rounded border border-border bg-transparent px-2 py-1 text-center text-xs text-text-subtle outline-none focus:border-brand"
          placeholder="Photo credit..."
          onkeydown={(e) => { if (e.key === 'Enter') saveCredit() }}
          onblur={saveCredit}
        />
      {:else if credit}
        {#if sourceUrl}
          <p class="text-xs text-text-subtle">
            Credit:
            <a href={sourceUrl} target="_blank" rel="noopener noreferrer" class="text-brand hover:underline">{credit}</a>
          </p>
        {:else}
          <!-- svelte-ignore a11y_click_events_have_key_events -->
          <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <p
            class="cursor-text text-xs text-text-subtle"
            onclick={() => { editingCredit = true; creditInput = credit }}
          >
            Credit: {credit}
          </p>
        {/if}
      {:else}
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <p
          class="cursor-text text-xs text-text-subtle opacity-50"
          onclick={() => { editingCredit = true; creditInput = '' }}
        >
          Add credit...
        </p>
      {/if}
    </div>
  {/if}
</figure>
