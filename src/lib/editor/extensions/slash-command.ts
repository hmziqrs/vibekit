import { Extension, type Editor } from '@tiptap/core'
import { Suggestion } from '@tiptap/suggestion'
import { mount, unmount } from 'svelte'

import SlashMenuContent, { type SlashMenuItem } from '../slash-menu.svelte'

export interface SlashCommandOptions {
  HTMLAttributes: Record<string, unknown>
}

function getSlashItems(_editor: Editor): SlashMenuItem[] {
  return [
    {
      aliases: ['p', 'text'],
      command: (e) => e.chain().focus().setParagraph().run(),
      description: 'Plain text block',
      label: 'Paragraph',
    },
    {
      aliases: ['h2', 'heading'],
      command: (e) => e.chain().focus().toggleHeading({ level: 2 }).run(),
      description: 'Large section heading',
      label: 'Heading 2',
    },
    {
      aliases: ['h3', 'heading'],
      command: (e) => e.chain().focus().toggleHeading({ level: 3 }).run(),
      description: 'Medium section heading',
      label: 'Heading 3',
    },
    {
      aliases: ['h4', 'heading'],
      command: (e) => e.chain().focus().toggleHeading({ level: 4 }).run(),
      description: 'Small section heading',
      label: 'Heading 4',
    },
    {
      aliases: ['ul', 'bullet'],
      command: (e) => e.chain().focus().toggleBulletList().run(),
      description: 'Unordered list',
      label: 'Bullet List',
    },
    {
      aliases: ['ol', 'number'],
      command: (e) => e.chain().focus().toggleOrderedList().run(),
      description: 'Ordered list',
      label: 'Ordered List',
    },
    {
      aliases: ['quote', 'blockquote'],
      command: (e) => e.chain().focus().toggleBlockquote().run(),
      description: 'Block quotation',
      label: 'Blockquote',
    },
    {
      aliases: ['pullquote', 'pull'],
      command: (e) => e.chain().focus().setPullQuote({ attribution: '', text: '' }).run(),
      description: 'Pull quote with attribution',
      label: 'Pull Quote',
    },
    {
      aliases: ['facts', 'info', 'keyfacts'],
      command: (e) => e.chain().focus().setFactBox().run(),
      description: 'Key facts / info box',
      label: 'Fact Box',
    },
    {
      aliases: ['image', 'photo', 'img'],
      command: (e) => {
        const src = prompt('Enter image URL:')
        if (!src) return
        const alt = prompt('Alt text (optional):') || ''
        const caption = prompt('Caption (optional):') || ''
        e.chain().focus().setFigureImage({ alt, caption, src }).run()
      },
      description: 'Image with caption and credit',
      label: 'Image',
    },
    {
      aliases: ['embed', 'youtube', 'video'],
      command: (e) => {
        const url = prompt('Embed URL (YouTube, Vimeo):')
        if (!url) return
        e.chain().focus().setEmbedBlock({ caption: '', provider: 'generic', url }).run()
      },
      description: 'YouTube, Vimeo, or other embed',
      label: 'Embed',
    },
    {
      aliases: ['related', 'link'],
      command: (e) => {
        const title = prompt('Article title:') || ''
        const slug = prompt('Article slug:') || ''
        e.chain().focus().setRelatedArticle({ articleId: '', excerpt: '', slug, title }).run()
      },
      description: 'Related article card',
      label: 'Related Article',
    },
    {
      aliases: ['correction', 'errata'],
      command: (e) => {
        const text = prompt('Correction text:') || ''
        e.chain().focus().setCorrectionNote({ text }).run()
      },
      description: 'Correction notice',
      label: 'Correction',
    },
    {
      aliases: ['update', 'note'],
      command: (e) => {
        const text = prompt('Update text:') || ''
        e.chain().focus().setUpdateNote({ text }).run()
      },
      description: 'Update notice',
      label: 'Update',
    },
    {
      aliases: ['table', 'grid'],
      command: (e) =>
        e.chain().focus().insertTable({ cols: 3, rows: 3, withHeaderRow: true }).run(),
      description: '3x3 table with headers',
      label: 'Table',
    },
    {
      aliases: ['divider', 'separator'],
      command: (e) => e.chain().focus().setHorizontalRule().run(),
      description: 'Horizontal divider',
      label: 'Divider',
    },
    {
      aliases: ['timeline', 'events'],
      command: (e) => e.chain().focus().setTimelineBlock().run(),
      description: 'Event timeline with timestamps',
      label: 'Timeline',
    },
    {
      aliases: ['source', 'reference', 'ref'],
      command: (e) => {
        const label = prompt('Source label:') || ''
        e.chain().focus().setSourceBlock({ label }).run()
      },
      description: 'Source / reference citation',
      label: 'Source',
    },
  ]
}

export const SlashCommand = Extension.create<SlashCommandOptions>({
  addProseMirrorPlugins() {
    return [
      // oxlint-disable-next-line new-cap
      Suggestion({
        char: '/',
        command: ({ editor, range, props }) => {
          editor.chain().focus().deleteRange(range).run()
          props.command(editor)
        },
        editor: this.editor,
        items: ({ query, editor }) => {
          const all = getSlashItems(editor)
          if (!query) return all
          const lower = query.toLowerCase()
          const filtered = all.filter(
            (item) =>
              item.label.toLowerCase().includes(lower) ||
              item.description.toLowerCase().includes(lower) ||
              item.aliases?.some((a) => a.includes(lower))
          )
          return filtered
        },
        render: () => {
          let commandCallback: ((item: SlashMenuItem) => void) | null = null
          let component: Record<string, unknown> | null = null
          let filteredItems: SlashMenuItem[] = []
          let popup: HTMLDivElement | null = null
          let selectedIndex = 0
          let editorRef: Editor | null = null

          function positionPopup(clientRect: (() => DOMRect | null) | null | undefined) {
            if (!popup || !clientRect) return
            const rect = clientRect()
            if (!rect) return
            popup.style.left = `${rect.left}px`
            popup.style.top = `${rect.bottom + 4}px`
          }

          function mountMenu() {
            if (!popup) return
            if (component) {
              unmount(component)
            }
            popup.innerHTML = ''

            const svelteProps = {
              editor: editorRef,
              items: filteredItems,
              onHover: (i: number) => {
                selectedIndex = i
                mountMenu()
              },
              onSelect: (item: SlashMenuItem) => {
                commandCallback?.(item)
              },
              selectedIndex,
            }

            component = mount(SlashMenuContent, { props: svelteProps, target: popup })
          }

          return {
            onExit() {
              if (component && popup) {
                unmount(component)
              }
              if (popup) {
                popup.remove()
              }
              commandCallback = null
              component = null
              editorRef = null
              popup = null
            },

            onKeyDown({ event }) {
              if (event.key === 'ArrowUp') {
                selectedIndex = (selectedIndex - 1 + filteredItems.length) % filteredItems.length
                mountMenu()
                return true
              }

              if (event.key === 'ArrowDown') {
                selectedIndex = (selectedIndex + 1) % filteredItems.length
                mountMenu()
                return true
              }

              if (event.key === 'Enter') {
                const item = filteredItems[selectedIndex]
                if (item) commandCallback?.(item)
                return true
              }

              if (event.key === 'Escape') {
                return true
              }

              return false
            },

            onStart(props) {
              commandCallback = props.command
              editorRef = props.editor
              filteredItems = props.items
              selectedIndex = 0

              popup = document.createElement('div')
              popup.style.position = 'absolute'
              popup.style.zIndex = '50'
              document.body.appendChild(popup)
              positionPopup(props.clientRect)
              mountMenu()
            },

            onUpdate(props) {
              commandCallback = props.command
              filteredItems = props.items
              selectedIndex = 0
              mountMenu()
              positionPopup(props.clientRect)
            },
          }
        },
      }),
    ]
  },

  name: 'slashCommand',
})
