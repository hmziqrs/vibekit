import { mergeAttributes, Node } from '@tiptap/core'
import { mount, unmount } from 'svelte'

import NoteBlockView from '../nodeviews/note-block-view.svelte'

export interface UpdateNoteOptions {
  HTMLAttributes: Record<string, unknown>
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    updateNote: {
      setUpdateNote: (attrs: { text?: string }) => ReturnType
    }
  }
}

export const UpdateNote = Node.create<UpdateNoteOptions>({
  addAttributes() {
    return {
      text: { default: '' },
    }
  },

  addCommands() {
    return {
      setUpdateNote:
        (attrs) =>
        ({ commands }) =>
          commands.insertContent({ attrs, type: this.name }),
    }
  },

  addNodeView() {
    return ({ editor, getPos, node }) => {
      const dom = document.createElement('div')
      dom.classList.add('update-note-nodeview')

      const props = $state({
        onUpdateAttrs: (attrs: Record<string, unknown>) => {
          const pos = getPos()
          if (pos === undefined) return
          editor.commands.updateAttributes('updateNote', attrs)
        },
        text: node.attrs.text,
        type: 'update' as const,
      })

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
          if (updatedNode.type.name !== 'updateNote') return false
          props.text = updatedNode.attrs.text
          return true
        },
      }
    }
  },

  atom: true,

  group: 'block',

  name: 'updateNote',

  parseHTML() {
    return [{ tag: 'div[data-update-note]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(this.options.HTMLAttributes, { 'data-update-note': '' }),
      HTMLAttributes.text || '',
    ]
  },
})
