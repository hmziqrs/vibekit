<script lang="ts">
  import type { Editor } from '@tiptap/core'
  import { Button } from '$lib/components/ui/button'
  import { cn } from '$lib/utils'
  import {
    Heading2,
    Heading3,
    List,
    ListOrdered,
    Quote,
    Pilcrow,
  } from '@lucide/svelte'
  import type { Component } from 'svelte'

  let { editor }: { editor: Editor | null } = $props()

  function setParagraph(e: Editor) { e.chain().focus().setParagraph().run() }
  function toggleH2(e: Editor) { e.chain().focus().toggleHeading({ level: 2 }).run() }
  function toggleH3(e: Editor) { e.chain().focus().toggleHeading({ level: 3 }).run() }
  function toggleBulletList(e: Editor) { e.chain().focus().toggleBulletList().run() }
  function toggleOrderedList(e: Editor) { e.chain().focus().toggleOrderedList().run() }
  function toggleBlockquote(e: Editor) { e.chain().focus().toggleBlockquote().run() }
  function isParagraph(e: Editor) { return e.isActive('paragraph') && !e.isActive('heading') }
  function isH2(e: Editor) { return e.isActive('heading', { level: 2 }) }
  function isH3(e: Editor) { return e.isActive('heading', { level: 3 }) }
  function isBulletList(e: Editor) { return e.isActive('bulletList') }
  function isOrderedList(e: Editor) { return e.isActive('orderedList') }
  function isBlockquote(e: Editor) { return e.isActive('blockquote') }

  interface FloatingAction {
    icon: Component
    label: string
    action: (e: Editor) => void
    isActive?: (e: Editor) => boolean
  }

  const actions: FloatingAction[] = [
    { action: setParagraph, icon: Pilcrow, isActive: isParagraph, label: 'Paragraph' },
    { action: toggleH2, icon: Heading2, isActive: isH2, label: 'Heading 2' },
    { action: toggleH3, icon: Heading3, isActive: isH3, label: 'Heading 3' },
    { action: toggleBulletList, icon: List, isActive: isBulletList, label: 'Bullet List' },
    { action: toggleOrderedList, icon: ListOrdered, isActive: isOrderedList, label: 'Ordered List' },
    { action: toggleBlockquote, icon: Quote, isActive: isBlockquote, label: 'Blockquote' },
  ]
</script>

<div class="flex items-center gap-0.5 rounded-lg border border-border bg-surface-elevated px-1 py-1 shadow-lg">
  {#each actions as item}
    {@const Icon = item.icon}
    <Button
      variant="ghost"
      size="icon-sm"
      class={cn(
        'size-7',
        editor && item.isActive?.(editor) && 'bg-muted text-text-primary',
      )}
      disabled={!editor}
      onclick={() => editor && item.action(editor)}
      title={item.label}
    >
      <Icon class="size-4" />
    </Button>
  {/each}
</div>
