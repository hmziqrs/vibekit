<script lang="ts">
  import type { Editor } from '@tiptap/core'
  import { Button } from '$lib/components/ui/button'
  import { Separator } from '$lib/components/ui/separator'
  import { cn } from '$lib/utils'
  import {
    Bold,
    Italic,
    Underline,
    Strikethrough,
    Heading2,
    Heading3,
    Heading4,
    List,
    ListOrdered,
    Quote,
    Undo2,
    Redo2,
    AlignLeft,
    AlignCenter,
    AlignRight,
    Link,
    ImagePlus,
    Table,
    RemoveFormatting,
    Pilcrow,
  } from '@lucide/svelte'

  let { editor }: { editor: Editor | null } = $props()

  function handleLink() {
    if (!editor) return

    if (editor.isActive('link')) {
      editor.chain().focus().unsetLink().run()
      return
    }

    const url = prompt('Enter URL:')
    if (!url) return

    editor.chain().focus().setLink({ href: url }).run()
  }

  function handleImage() {
    if (!editor) return
    const src = prompt('Enter image URL:')
    if (!src) return
    const alt = prompt('Alt text (optional):') || ''
    const caption = prompt('Caption (optional):') || ''
    editor.chain().focus().setFigureImage({ alt, caption, src }).run()
  }

  function handleTable() {
    if (!editor) return
    editor.chain().focus().insertTable({ cols: 3, rows: 3, withHeaderRow: true }).run()
  }

  interface ToolbarAction {
    icon: typeof Bold
    label: string
    action: (e: Editor) => void
    isActive?: (e: Editor) => boolean
    disabled?: (e: Editor) => boolean
  }

  type ToolbarGroup = (ToolbarAction | 'separator')[]

  function undo(e: Editor) { e.chain().focus().undo().run() }
  function redo(e: Editor) { e.chain().focus().redo().run() }
  function cantUndo(e: Editor) { return !e.can().undo() }
  function cantRedo(e: Editor) { return !e.can().redo() }
  function setParagraph(e: Editor) { e.chain().focus().setParagraph().run() }
  function toggleH2(e: Editor) { e.chain().focus().toggleHeading({ level: 2 }).run() }
  function toggleH3(e: Editor) { e.chain().focus().toggleHeading({ level: 3 }).run() }
  function toggleH4(e: Editor) { e.chain().focus().toggleHeading({ level: 4 }).run() }
  function isParagraph(e: Editor) { return e.isActive('paragraph') && !e.isActive('heading') }
  function isH2(e: Editor) { return e.isActive('heading', { level: 2 }) }
  function isH3(e: Editor) { return e.isActive('heading', { level: 3 }) }
  function isH4(e: Editor) { return e.isActive('heading', { level: 4 }) }
  function toggleBold(e: Editor) { e.chain().focus().toggleBold().run() }
  function toggleItalic(e: Editor) { e.chain().focus().toggleItalic().run() }
  function toggleUnderlineAction(e: Editor) { e.chain().focus().toggleUnderline().run() }
  function toggleStrike(e: Editor) { e.chain().focus().toggleStrike().run() }
  function isBold(e: Editor) { return e.isActive('bold') }
  function isItalic(e: Editor) { return e.isActive('italic') }
  function isUnderline(e: Editor) { return e.isActive('underline') }
  function isStrike(e: Editor) { return e.isActive('strike') }
  function toggleBulletList(e: Editor) { e.chain().focus().toggleBulletList().run() }
  function toggleOrderedList(e: Editor) { e.chain().focus().toggleOrderedList().run() }
  function toggleBlockquote(e: Editor) { e.chain().focus().toggleBlockquote().run() }
  function isBulletList(e: Editor) { return e.isActive('bulletList') }
  function isOrderedList(e: Editor) { return e.isActive('orderedList') }
  function isBlockquote(e: Editor) { return e.isActive('blockquote') }
  function alignLeft(e: Editor) { e.chain().focus().setTextAlign('left').run() }
  function alignCenter(e: Editor) { e.chain().focus().setTextAlign('center').run() }
  function alignRight(e: Editor) { e.chain().focus().setTextAlign('right').run() }
  function isAlignLeft(e: Editor) { return e.isActive({ textAlign: 'left' }) }
  function isAlignCenter(e: Editor) { return e.isActive({ textAlign: 'center' }) }
  function isAlignRight(e: Editor) { return e.isActive({ textAlign: 'right' }) }
  function isLink(e: Editor) { return e.isActive('link') }
  function clearFormat(e: Editor) { e.chain().focus().clearNodes().unsetAllMarks().run() }

  const groups: ToolbarGroup[] = [
    [
      { action: undo, disabled: cantUndo, icon: Undo2, label: 'Undo' },
      { action: redo, disabled: cantRedo, icon: Redo2, label: 'Redo' },
    ],
    [
      { action: setParagraph, icon: Pilcrow, isActive: isParagraph, label: 'Paragraph' },
      { action: toggleH2, icon: Heading2, isActive: isH2, label: 'Heading 2' },
      { action: toggleH3, icon: Heading3, isActive: isH3, label: 'Heading 3' },
      { action: toggleH4, icon: Heading4, isActive: isH4, label: 'Heading 4' },
    ],
    [
      { action: toggleBold, icon: Bold, isActive: isBold, label: 'Bold' },
      { action: toggleItalic, icon: Italic, isActive: isItalic, label: 'Italic' },
      { action: toggleUnderlineAction, icon: Underline, isActive: isUnderline, label: 'Underline' },
      { action: toggleStrike, icon: Strikethrough, isActive: isStrike, label: 'Strike' },
    ],
    [
      { action: toggleBulletList, icon: List, isActive: isBulletList, label: 'Bullet List' },
      { action: toggleOrderedList, icon: ListOrdered, isActive: isOrderedList, label: 'Ordered List' },
      { action: toggleBlockquote, icon: Quote, isActive: isBlockquote, label: 'Blockquote' },
    ],
    [
      { action: alignLeft, icon: AlignLeft, isActive: isAlignLeft, label: 'Align Left' },
      { action: alignCenter, icon: AlignCenter, isActive: isAlignCenter, label: 'Align Center' },
      { action: alignRight, icon: AlignRight, isActive: isAlignRight, label: 'Align Right' },
    ],
    [
      { action: () => handleLink(), icon: Link, isActive: isLink, label: 'Link' },
      { action: () => handleImage(), icon: ImagePlus, label: 'Image' },
      { action: () => handleTable(), icon: Table, label: 'Table' },
    ],
    [
      { action: clearFormat, icon: RemoveFormatting, label: 'Clear Formatting' },
    ],
  ]
</script>

<div class="flex flex-wrap items-center gap-0.5 border-b border-border bg-surface px-2 py-1.5">
  {#each groups as group, gi}
    {#each group as item}
      {#if item === 'separator'}
        <Separator orientation="vertical" class="mx-1 h-6" />
      {:else}
        {@const Icon = item.icon}
        <Button
          variant="ghost"
          size="icon-sm"
          class={cn(
            'size-7',
            editor && item.isActive?.(editor) && 'bg-muted text-text-primary',
          )}
          disabled={!editor || (item.disabled?.(editor) ?? false)}
          onclick={() => editor && item.action(editor)}
          title={item.label}
        >
          <Icon class="size-4" />
        </Button>
      {/if}
    {/each}
    {#if gi < groups.length - 1}
      <Separator orientation="vertical" class="mx-1 h-6" />
    {/if}
  {/each}
</div>
