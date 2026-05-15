<script lang="ts">
  import type { Editor } from '@tiptap/core'
  import { extractToc, type TocItem } from '$lib/editor/utils/extract-toc'

  interface Props {
    editor: Editor | null
  }

  let { editor }: Props = $props()
  let items = $state<TocItem[]>([])

  $effect(() => {
    if (!editor) return
    const handler = () => {
      const json = editor.getJSON()
      items = extractToc(json)
    }
    editor.on('update', handler)
    handler()
    return () => {
      editor.off('update', handler)
    }
  })

  function scrollTo(item: TocItem) {
    const headings = document.querySelectorAll('.ProseMirror h2, .ProseMirror h3, .ProseMirror h4')
    for (const h of headings) {
      if (h.textContent?.trim() === item.text) {
        h.scrollIntoView({ behavior: 'smooth', block: 'start' })
        break
      }
    }
  }

  function indentClass(level: number): string {
    if (level === 3) return 'ps-3'
    if (level === 4) return 'ps-6'
    return ''
  }
</script>

<div class="space-y-1">
  <h3 class="text-sm font-medium text-text-secondary mb-3">Table of Contents</h3>

  {#if items.length === 0}
    <p class="text-xs text-text-faint">Add headings to generate a table of contents.</p>
  {:else}
    <nav class="space-y-0.5">
      {#each items as item (item.id)}
        <button
          onclick={() => scrollTo(item)}
          class="block w-full text-start text-xs text-text-muted hover:text-brand transition-colors py-0.5 truncate {indentClass(item.level)}"
          title={item.text}
        >
          {item.text}
        </button>
      {/each}
    </nav>
  {/if}
</div>
