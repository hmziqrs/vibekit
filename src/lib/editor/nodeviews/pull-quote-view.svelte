<script lang="ts">
  interface Props {
    text?: string
    attribution?: string
    onUpdateAttrs: (attrs: Record<string, unknown>) => void
  }

  let {
    text = '',
    attribution = '',
    onUpdateAttrs,
  }: Props = $props()

  let editingAttribution = $state(false)
  let editingText = $state(false)
  // oxlint-disable-next-line capitalized-comments
  // svelte-ignore state_referenced_locally
  let attributionInput = $state(attribution)
  // oxlint-disable-next-line capitalized-comments
  // svelte-ignore state_referenced_locally
  let textInput = $state(text)

  function saveAttribution() {
    editingAttribution = false
    onUpdateAttrs({ attribution: attributionInput })
  }

  function saveText() {
    editingText = false
    onUpdateAttrs({ text: textInput })
  }
</script>

<blockquote class="my-4 border-s-4 border-brand bg-surface-deep py-4 ps-4 pe-6" contenteditable="false">
  {#if editingText}
    <textarea
      bind:value={textInput}
      class="w-full resize-none bg-transparent text-lg italic text-text-secondary outline-none"
      placeholder="Enter quote text..."
      rows={3}
      onkeydown={(e) => { if (e.key === 'Enter' && e.metaKey) saveText() }}
      onblur={saveText}
    ></textarea>
  {:else if text}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <p
      class="cursor-text text-lg italic text-text-secondary leading-relaxed"
      onclick={() => { editingText = true; textInput = text }}
    >
      {text}
    </p>
  {:else}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <p
      class="cursor-text text-lg italic text-text-muted leading-relaxed opacity-50"
      onclick={() => { editingText = true; textInput = '' }}
    >
      Add quote...
    </p>
  {/if}

  {#if editingAttribution}
    <input
      type="text"
      bind:value={attributionInput}
      aria-label="Attribution"
      class="mt-2 w-full border-b border-border bg-transparent text-sm text-text-muted outline-none focus:border-brand"
      placeholder="Attribution..."
      onkeydown={(e) => { if (e.key === 'Enter') saveAttribution() }}
      onblur={saveAttribution}
    />
  {:else if attribution}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <p
      class="mt-2 cursor-text text-sm text-text-muted"
      onclick={() => { editingAttribution = true; attributionInput = attribution }}
    >
      — {attribution}
    </p>
  {:else}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <p
      class="mt-2 cursor-text text-sm text-text-muted opacity-50"
      onclick={() => { editingAttribution = true; attributionInput = '' }}
    >
      Add attribution...
    </p>
  {/if}
</blockquote>
