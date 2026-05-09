import { mergeAttributes, Node } from '@tiptap/core'
import { mount, unmount } from 'svelte'

import NoteBlockView from '../nodeviews/note-block-view.svelte'

export interface CorrectionNoteOptions {
  HTMLAttributes: Record<string, unknown>
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    correctionNote: {
      setCorrectionNote: (attrs: { text?: string }) => ReturnType
    }
  }
}

export const CorrectionNote = Node.create<CorrectionNoteOptions>({
  addAttributes() {
    return {
      text: { default: '' },
    }
  },

  addCommands() {
    return {
      setCorrectionNote:
        (attrs) =>
        ({ commands }) =>
          commands.insertContent({ attrs, type: this.name }),
    }
  },

  addNodeView() {
    return ({ editor, getPos, node }) => {
      const dom = document.createElement('div')
      dom.classList.add('correction-note-nodeview')

      const props = {
        onUpdateAttrs: (attrs: Record<string, unknown>) => {
          const pos = getPos()
          if (pos === undefined) return
          editor.commands.updateAttributes('correctionNote', attrs)
        },
        text: node.attrs.text,
        type: 'correction' as const,
      }

      const component = mount(NoteBlockView, {
        props,
        target: dom,
      })

      return {
        destroy() {
          unmount(component)
        },
        dom,
        update(updatedNode) {
          if (updatedNode.type.name !== 'correctionNote') return false
          props.text = updatedNode.attrs.text
          return true
        },
      }
    }
  },

  atom: true,

  group: 'block',

  name: 'correctionNote',

  parseHTML() {
    return [{ tag: 'div[data-correction-note]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(this.options.HTMLAttributes, { 'data-correction-note': '' }),
      HTMLAttributes.text || '',
    ]
  },
})
