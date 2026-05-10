<script lang="ts">
  interface Props {
    title: string
    onUpdateAttrs: (attrs: Record<string, unknown>) => void
  }

  let { title, onUpdateAttrs }: Props = $props()

  let editing = $state(false)
  // oxlint-disable-next-line capitalized-comments
  // svelte-ignore state_referenced_locally
  let titleInput = $state(title)

  function saveTitle() {
    editing = false
    onUpdateAttrs({ title: titleInput || 'Key Facts' })
  }
</script>

{#if editing}
  <input
    type="text"
    bind:value={titleInput}
    class="w-full border-0 bg-transparent px-0 py-1 text-sm font-semibold text-text-primary outline-none"
    contenteditable="false"
    placeholder="Box title..."
    onblur={saveTitle}
    onkeydown={(e) => { if (e.key === 'Enter') saveTitle() }}
  />
{:else}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <h4
    class="cursor-text pb-2 text-sm font-semibold text-text-primary"
    contenteditable="false"
    onclick={() => { editing = true; titleInput = title }}
  >
    {title}
  </h4>
{/if}
