import SourceBlockView from '$lib/editor/nodeviews/source-block-view.svelte'
import { mergeAttributes, Node } from '@tiptap/core'
import { mount, unmount } from 'svelte'

export interface SourceBlockOptions {
  HTMLAttributes: Record<string, unknown>
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    sourceBlock: {
      setSourceBlock: (attrs: { label: string; sourceName?: string; url?: string }) => ReturnType
    }
  }
}

export const SourceBlock = Node.create<SourceBlockOptions>({
  addAttributes() {
    return {
      label: { default: '' },
      sourceName: { default: '' },
      url: { default: '' },
    }
  },

  addCommands() {
    return {
      setSourceBlock:
        (attrs) =>
        ({ commands }) =>
          commands.insertContent({ attrs, type: this.name }),
    }
  },

  addNodeView() {
    return ({ editor, getPos, node }) => {
      const dom = document.createElement('div')
      dom.classList.add('source-block-nodeview')

      const props = $state({
        label: node.attrs.label,
        onUpdateAttrs: (attrs: Record<string, unknown>) => {
          const pos = getPos()
          if (pos === undefined) return
          editor.commands.updateAttributes('sourceBlock', attrs)
        },
        sourceName: node.attrs.sourceName,
        url: node.attrs.url,
      })

      const component = mount(SourceBlockView, { props, target: dom })

      return {
        destroy() {
          unmount(component)
        },
        dom,
        update(updatedNode) {
          if (updatedNode.type.name !== 'sourceBlock') return false
          props.label = updatedNode.attrs.label
          props.sourceName = updatedNode.attrs.sourceName
          props.url = updatedNode.attrs.url
          return true
        },
      }
    }
  },

  atom: true,

  group: 'block',

  name: 'sourceBlock',

  parseHTML() {
    return [{ tag: 'div[data-source-block]' }]
  },

  renderHTML({ HTMLAttributes: _HTMLAttributes }) {
    return ['div', mergeAttributes(this.options.HTMLAttributes, { 'data-source-block': '' })]
  },
})
