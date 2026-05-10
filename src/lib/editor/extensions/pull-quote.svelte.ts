import { mergeAttributes, Node } from '@tiptap/core'
import { mount, unmount } from 'svelte'

import PullQuoteView from '../nodeviews/pull-quote-view.svelte'

export interface PullQuoteOptions {
  HTMLAttributes: Record<string, unknown>
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    pullQuote: {
      setPullQuote: (attrs: { text?: string; attribution?: string }) => ReturnType
    }
  }
}

export const PullQuote = Node.create<PullQuoteOptions>({
  addAttributes() {
    return {
      attribution: { default: '' },
      text: { default: '' },
    }
  },

  addCommands() {
    return {
      setPullQuote:
        (attrs) =>
        ({ commands }) =>
          commands.insertContent({ attrs, type: this.name }),
    }
  },

  addNodeView() {
    return ({ node, getPos, editor }) => {
      const dom = document.createElement('div')
      dom.classList.add('pull-quote-nodeview')

      const props = $state({
        attribution: node.attrs.attribution,
        onUpdateAttrs: (attrs: Record<string, unknown>) => {
          const pos = getPos()
          if (pos === undefined) return
          editor.commands.updateAttributes('pullQuote', attrs)
        },
        text: node.attrs.text,
      })

      const component = mount(PullQuoteView, { props, target: dom })

      return {
        destroy() {
          unmount(component)
        },
        dom,
        update(updatedNode) {
          if (updatedNode.type.name !== 'pullQuote') return false
          props.attribution = updatedNode.attrs.attribution
          props.text = updatedNode.attrs.text
          return true
        },
      }
    }
  },

  atom: true,

  group: 'block',

  name: 'pullQuote',

  parseHTML() {
    return [{ tag: 'blockquote[data-pull-quote]' }]
  },

  renderHTML({ HTMLAttributes }) {
    const base = [
      'blockquote',
      mergeAttributes(this.options.HTMLAttributes, { 'data-pull-quote': '' }),
      ['p', {}, HTMLAttributes.text || ''],
    ] as const

    if (HTMLAttributes.attribution) {
      return [...base, ['cite', {}, HTMLAttributes.attribution]]
    }

    return base
  },
})
