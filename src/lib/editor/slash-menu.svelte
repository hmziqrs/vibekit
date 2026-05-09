<script lang="ts">
  import { Button } from '$lib/components/ui/button'
  import { cn } from '$lib/utils'
  import type { Editor } from '@tiptap/core'

  export interface SlashMenuItem {
    aliases?: string[]
    command: (editor: Editor) => void
    description: string
    icon?: string
    label: string
  }

  interface Props {
    editor: Editor | null
    items: SlashMenuItem[]
    selectedIndex: number
    onSelect: (item: SlashMenuItem) => void
    onHover: (index: number) => void
  }

  let {
    editor,
    items,
    selectedIndex,
    onSelect,
    onHover,
  }: Props = $props()
</script>

{#if items.length > 0}
  <div
    class="slash-menu absolute z-50 max-h-64 w-56 overflow-y-auto rounded-lg border border-border bg-surface-elevated shadow-lg"
    role="listbox"
  >
    {#each items as item, i}
      <button
        type="button"
        role="option"
        aria-selected={i === selectedIndex}
        class={cn(
          'flex w-full flex-col items-start px-3 py-2 text-left',
          i === selectedIndex ? 'bg-muted text-text-primary' : 'text-text-secondary',
        )}
        onmouseenter={() => onHover(i)}
        onmousedown={(e) => { e.preventDefault(); onSelect(item) }}
        onclick={() => onSelect(item)}
      >
        <span class="text-sm font-medium">{item.label}</span>
        <span class="text-xs text-text-muted">{item.description}</span>
      </button>
    {/each}
  </div>
{/if}
