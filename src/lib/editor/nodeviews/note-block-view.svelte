<script lang="ts">
  interface Props {
    type: 'correction' | 'update'
    text?: string
    onUpdateAttrs: (attrs: Record<string, unknown>) => void
  }

  let { text = '', type, onUpdateAttrs }: Props = $props()

  let editingText = $state(false)
  // svelte-ignore state_referenced_locally
  let textInput = $state(text)

  const label = $derived(type === 'correction' ? 'Correction:' : 'Update:')

  const borderClass = $derived(
    type === 'correction' ? 'border-l-[var(--terminal-yellow)]' : 'border-l-[var(--sidebar-primary)]',
  )

  const prefixColorClass = $derived(
    type === 'correction' ? 'text-[var(--terminal-yellow)]' : 'text-[var(--sidebar-primary)]',
  )

  function saveText() {
    editingText = false
    onUpdateAttrs({ text: textInput })
  }
</script>

<div class="my-4 border-l-4 {borderClass} bg-surface-deep py-3 pl-4 pr-6" contenteditable="false">
  <span class="text-sm font-semibold {prefixColorClass}">{label}</span>

  {#if editingText}
    <textarea
      bind:value={textInput}
      class="mt-1 w-full resize-none bg-transparent text-sm text-text-secondary outline-none"
      placeholder="Enter note text..."
      rows={3}
      onkeydown={(e) => { if (e.key === 'Enter' && e.metaKey) saveText() }}
      onblur={saveText}
    ></textarea>
  {:else if text}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <p
      class="mt-1 cursor-text text-sm text-text-secondary leading-relaxed"
      onclick={() => { editingText = true; textInput = text }}
    >
      {text}
    </p>
  {:else}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <p
      class="mt-1 cursor-text text-sm text-text-muted opacity-50"
      onclick={() => { editingText = true; textInput = '' }}
    >
      Add note...
    </p>
  {/if}
</div>
