<script lang="ts">
  import { Editor } from '@tiptap/core'
  import { StarterKit } from '@tiptap/starter-kit'
  import { BubbleMenu } from '@tiptap/extension-bubble-menu'
  import { FloatingMenu } from '@tiptap/extension-floating-menu'
  import { Link } from '@tiptap/extension-link'
  import { Image } from '@tiptap/extension-image'
  import { Placeholder } from '@tiptap/extension-placeholder'
  import { Typography } from '@tiptap/extension-typography'
  import { TextAlign } from '@tiptap/extension-text-align'
  import { Underline } from '@tiptap/extension-underline'
  import { Table } from '@tiptap/extension-table'
  import { TableRow } from '@tiptap/extension-table-row'
  import { TableCell } from '@tiptap/extension-table-cell'
  import { TableHeader } from '@tiptap/extension-table-header'
  import { CharacterCount } from '@tiptap/extension-character-count'
  import EditorToolbar from './editor-toolbar.svelte'
  import BubbleMenuContent from './bubble-menu.svelte'
  import FloatingMenuContent from './floating-menu.svelte'
  import { FigureImage } from './extensions/figure-image'
  import { ImageDrop } from './extensions/image-drop'
  import { EmbedBlock } from './extensions/embed-block'
  import { PullQuote } from './extensions/pull-quote'
  import { FactBox } from './extensions/fact-box'
  import { RelatedArticle } from './extensions/related-article'
  import { CorrectionNote } from './extensions/correction-note'
  import { UpdateNote } from './extensions/update-note'
  import { SlashCommand } from './extensions/slash-command'
  import { SourceBlock } from './extensions/source-block'
  import { TimelineBlock } from './extensions/timeline-block'
  import { CleanPaste } from './utils/clean-paste'
  import { clearDraft, loadDraft, saveDraft } from './utils/draft-recovery'

  interface UpdatePayload {
    html: string
    json: object
    text: string
  }

  interface Props {
    content?: object | string | null
    placeholder?: string
    editable?: boolean
    draftId?: string
    onUpdate?: (payload: UpdatePayload) => void
    onAutoSave?: (payload: { json: object }) => void
  }

  let {
    content = null,
    placeholder = 'Start writing your article...',
    editable = true,
    draftId,
    onUpdate,
    onAutoSave,
  }: Props = $props()

  let editorEl = $state<HTMLDivElement>()
  let bubbleMenuEl = $state<HTMLDivElement>()
  let floatingMenuEl = $state<HTMLDivElement>()
  let editor = $state<Editor | null>(null)
  let autoSaveTimer = $state<ReturnType<typeof setTimeout> | null>(null)
  let wordCount = $state(0)
  let charCount = $state(0)

  function getExtensions() {
    return [
      StarterKit.configure({
        heading: { levels: [2, 3, 4] },
        link: false,
        underline: false,
      }),
      BubbleMenu.configure({
        element: bubbleMenuEl,
      }),
      FloatingMenu.configure({
        element: floatingMenuEl,
      }),
      Placeholder.configure({ placeholder }),
      Link.configure({
        autolink: true,
        linkOnPaste: true,
        openOnClick: false,
      }),
      Image.configure({
        allowBase64: false,
        inline: false,
      }),
      Underline,
      Typography,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Table.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
      CharacterCount,
      CleanPaste,
      CorrectionNote,
      EmbedBlock,
      FactBox,
      FigureImage,
      ImageDrop,
      PullQuote,
      RelatedArticle,
      SlashCommand,
      SourceBlock,
      TimelineBlock,
      UpdateNote,
    ]
  }

  function updateCounts(e: Editor) {
    wordCount = e.storage.characterCount.words()
    charCount = e.storage.characterCount.characters()
  }

  $effect(() => {
    const el = editorEl
    if (!el || !bubbleMenuEl || !floatingMenuEl) return

    const instance = new Editor({
      content: draftId ? (loadDraft(draftId)?.json ?? content ?? undefined) : (content ?? undefined),
      editable,
      element: el,
      extensions: getExtensions(),
      onCreate: ({ editor: e }) => updateCounts(e),
      onUpdate: ({ editor: e }) => {
        updateCounts(e)
        onUpdate?.({
          html: e.getHTML(),
          json: e.getJSON(),
          text: e.getText(),
        })

        if (onAutoSave || draftId) {
          if (autoSaveTimer) clearTimeout(autoSaveTimer)
          autoSaveTimer = setTimeout(() => {
            const json = e.getJSON()
            if (draftId) saveDraft(draftId, json)
            onAutoSave?.({ json })
          }, 5000)
        }
      },
    })

    editor = instance

    return () => {
      if (autoSaveTimer) clearTimeout(autoSaveTimer)
      instance.destroy()
      editor = null
    }
  })
</script>

<div class="overflow-hidden rounded-lg border border-border bg-surface-base">
  <EditorToolbar {editor} />

  <div class="relative min-h-[500px] px-6 py-4">
    <div bind:this={editorEl}></div>
  </div>

  <div class="flex items-center gap-4 border-t border-border px-4 py-2 text-xs text-text-muted">
    <span>{wordCount} words</span>
    <span>{charCount} characters</span>
    {#if wordCount > 0}
      <span>{Math.max(1, Math.ceil(wordCount / 200))} min read</span>
    {/if}
  </div>
</div>

<div bind:this={bubbleMenuEl} style="visibility: hidden; position: absolute;">
  <BubbleMenuContent editor={editor} />
</div>
<div bind:this={floatingMenuEl} style="visibility: hidden; position: absolute;">
  <FloatingMenuContent editor={editor} />
</div>

<style>
  :global(.ProseMirror) {
    min-height: 500px;
    outline: none;
  }

  :global(.ProseMirror > p + p) {
    margin-top: 0.75rem;
    line-height: 1.8;
  }

  :global(.ProseMirror h2) {
    font-size: 1.75rem;
    font-weight: 700;
    margin-top: 2rem;
    line-height: 1.3;
  }

  :global(.ProseMirror h3) {
    font-size: 1.35rem;
    font-weight: 700;
    margin-top: 1.5rem;
    line-height: 1.4;
  }

  :global(.ProseMirror h4) {
    font-size: 1.15rem;
    font-weight: 600;
    margin-top: 1.25rem;
    line-height: 1.5;
  }

  :global(.ProseMirror blockquote) {
    border-left: 4px solid var(--brand);
    padding-left: 1rem;
    opacity: 0.85;
    font-style: italic;
  }

  :global(.ProseMirror img) {
    max-width: 100%;
    border-radius: 0.75rem;
    margin: 1rem 0;
  }

  :global(.ProseMirror table) {
    border-collapse: collapse;
    width: 100%;
    margin: 1rem 0;
  }

  :global(.ProseMirror td),
  :global(.ProseMirror th) {
    border: 1px solid var(--border);
    padding: 0.5rem;
  }

  :global(.ProseMirror th) {
    background: var(--muted);
    font-weight: 600;
  }

  :global(.ProseMirror p.is-editor-empty:first-child::before) {
    content: attr(data-placeholder);
    float: left;
    color: var(--text-faint);
    pointer-events: none;
    height: 0;
  }

  :global(.ProseMirror ul) {
    list-style: disc;
    padding-left: 1.5rem;
    margin: 0.75rem 0;
  }

  :global(.ProseMirror ol) {
    list-style: decimal;
    padding-left: 1.5rem;
    margin: 0.75rem 0;
  }

  :global(.ProseMirror a) {
    color: var(--brand);
    text-decoration: underline;
    cursor: pointer;
  }

  :global(.ProseMirror hr) {
    border: none;
    border-top: 2px solid var(--border);
    margin: 2rem 0;
  }

  :global(.ProseMirror pre) {
    background: var(--muted);
    border-radius: 0.5rem;
    padding: 1rem;
    overflow-x: auto;
    font-family: monospace;
  }
</style>
