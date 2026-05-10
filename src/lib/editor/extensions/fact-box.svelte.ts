import { mergeAttributes, Node } from '@tiptap/core'
import { mount, unmount } from 'svelte'

import FactBoxHeaderView from '../nodeviews/fact-box-header-view.svelte'

export interface FactBoxOptions {
  HTMLAttributes: Record<string, unknown>
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    factBox: {
      setFactBox: (attrs?: { title?: string }) => ReturnType
    }
  }
}

export const FactBox = Node.create<FactBoxOptions>({
  addAttributes() {
    return {
      title: { default: 'Key Facts' },
    }
  },

  addCommands() {
    return {
      setFactBox:
        (attrs) =>
        ({ commands }) =>
          commands.insertContent({
            attrs: attrs ?? {},
            content: [{ type: 'paragraph' }],
            type: this.name,
          }),
    }
  },

  addNodeView() {
    return ({ node, getPos, editor }) => {
      const dom = document.createElement('div')
      dom.classList.add('fact-box-nodeview')

      const headerEl = document.createElement('div')
      dom.appendChild(headerEl)

      const contentDOM = document.createElement('div')
      contentDOM.classList.add('fact-box-content')
      dom.appendChild(contentDOM)

      const props = $state({
        onUpdateAttrs: (attrs: Record<string, unknown>) => {
          const pos = getPos()
          if (pos === undefined) return
          editor.commands.updateAttributes('factBox', attrs)
        },
        title: node.attrs.title,
      })

      const component = mount(FactBoxHeaderView, {
        props,
        target: headerEl,
      })

      return {
        contentDOM,
        destroy() {
          unmount(component)
        },
        dom,
        update(updatedNode) {
          if (updatedNode.type.name !== 'factBox') return false
          props.title = updatedNode.attrs.title
          return true
        },
      }
    }
  },

  content: 'block+',

  group: 'block',

  name: 'factBox',

  parseHTML() {
    return [{ tag: 'div[data-fact-box]' }]
  },

  renderHTML({ HTMLAttributes: _HTMLAttributes }) {
    return ['div', mergeAttributes(this.options.HTMLAttributes, { 'data-fact-box': '' }), 0]
  },
})
