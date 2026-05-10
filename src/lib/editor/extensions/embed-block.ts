import { mergeAttributes, Node } from '@tiptap/core'
import { mount, unmount } from 'svelte'

import EmbedBlockView from '../nodeviews/embed-block-view.svelte'

export interface EmbedBlockOptions {
  HTMLAttributes: Record<string, unknown>
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    embedBlock: {
      setEmbedBlock: (attrs: {
        provider: string
        url: string
        embedId?: string
        caption?: string
        sourceName?: string
      }) => ReturnType
    }
  }
}

export const EmbedBlock = Node.create<EmbedBlockOptions>({
  addAttributes() {
    return {
      caption: { default: '' },
      embedId: { default: '' },
      provider: { default: 'generic' },
      sourceName: { default: '' },
      url: { default: null },
    }
  },

  addCommands() {
    return {
      setEmbedBlock:
        (attrs) =>
        ({ commands }) =>
          commands.insertContent({ attrs, type: this.name }),
    }
  },

  addNodeView() {
    return ({ node, getPos, editor }) => {
      const dom = document.createElement('div')
      dom.classList.add('embed-block-nodeview')

      const props = {
        caption: node.attrs.caption,
        embedId: node.attrs.embedId,
        onUpdateAttrs: (attrs: Record<string, unknown>) => {
          const pos = getPos()
          if (pos === undefined) return
          editor.commands.updateAttributes('embedBlock', attrs)
        },
        provider: node.attrs.provider,
        sourceName: node.attrs.sourceName,
        url: node.attrs.url,
      }

      const component = mount(EmbedBlockView, {
        props,
        target: dom,
      })

      return {
        destroy() {
          unmount(component)
        },
        dom,
        update(updatedNode) {
          if (updatedNode.type.name !== 'embedBlock') return false
          props.caption = updatedNode.attrs.caption
          props.embedId = updatedNode.attrs.embedId
          props.provider = updatedNode.attrs.provider
          props.sourceName = updatedNode.attrs.sourceName
          props.url = updatedNode.attrs.url
          return true
        },
      }
    }
  },

  atom: true,

  group: 'block',

  name: 'embedBlock',

  parseHTML() {
    return [{ tag: 'div[data-embed-block]' }]
  },

  renderHTML({ HTMLAttributes }) {
    const base = [
      'div',
      mergeAttributes(this.options.HTMLAttributes, {
        'data-embed-block': '',
        'data-provider': HTMLAttributes.provider,
      }),
      ['iframe', { allowfullscreen: 'true', src: HTMLAttributes.url }],
    ] as const

    if (HTMLAttributes.caption) {
      return [...base, ['p', {}, HTMLAttributes.caption]]
    }

    return base
  },
})
