<script lang="ts">
  import type { Editor } from '@tiptap/core'
  import { Button } from '$lib/components/ui/button'
  import { cn } from '$lib/utils'
  import {
    Bold,
    Italic,
    Underline,
    Strikethrough,
    Link,
    Quote,
    Eye,
  } from '@lucide/svelte'
  import type { Component } from 'svelte'

  let { editor }: { editor: Editor | null } = $props()

  function toggleBold(e: Editor) { e.chain().focus().toggleBold().run() }
  function toggleItalic(e: Editor) { e.chain().focus().toggleItalic().run() }
  function toggleUnderlineAction(e: Editor) { e.chain().focus().toggleUnderline().run() }
  function toggleStrike(e: Editor) { e.chain().focus().toggleStrike().run() }
  function toggleBlockquote(e: Editor) { e.chain().focus().toggleBlockquote().run() }
  function isBold(e: Editor) { return e.isActive('bold') }
  function isItalic(e: Editor) { return e.isActive('italic') }
  function isUnderline(e: Editor) { return e.isActive('underline') }
  function isStrike(e: Editor) { return e.isActive('strike') }
  function isBlockquote(e: Editor) { return e.isActive('blockquote') }
  function isLink(e: Editor) { return e.isActive('link') }

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

  function fetchLinkPreview() {
    if (!editor) return
    const href = editor.getAttributes('link').href as string | undefined
    if (!href) return
    editor.chain().focus().setLinkPreviewCard({
      description: '',
      image: '',
      siteName: '',
      title: '',
      url: href,
    }).run()
  }

  interface BubbleAction {
    icon: Component
    label: string
    action: (e: Editor) => void
    isActive?: (e: Editor) => boolean
  }

  const actions: BubbleAction[] = [
    { action: toggleBold, icon: Bold, isActive: isBold, label: 'Bold' },
    { action: toggleItalic, icon: Italic, isActive: isItalic, label: 'Italic' },
    { action: toggleUnderlineAction, icon: Underline, isActive: isUnderline, label: 'Underline' },
    { action: toggleStrike, icon: Strikethrough, isActive: isStrike, label: 'Strike' },
    { action: toggleBlockquote, icon: Quote, isActive: isBlockquote, label: 'Blockquote' },
    { action: () => handleLink(), icon: Link, isActive: isLink, label: 'Link' },
    { action: () => fetchLinkPreview(), icon: Eye, label: 'Link Preview' },
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
