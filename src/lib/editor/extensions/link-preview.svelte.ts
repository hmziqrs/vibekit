import { mergeAttributes, Node } from '@tiptap/core'
import { mount, unmount } from 'svelte'

import LinkPreviewView from '../nodeviews/link-preview-view.svelte'

export interface LinkPreviewOptions {
  HTMLAttributes: Record<string, unknown>
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    linkPreviewCard: {
      setLinkPreviewCard: (attrs: {
        url: string
        title?: string
        description?: string
        image?: string
        siteName?: string
      }) => ReturnType
    }
  }
}

export const LinkPreviewCard = Node.create<LinkPreviewOptions>({
  addAttributes() {
    return {
      description: { default: '' },
      fetchError: { default: false },
      fetching: { default: false },
      image: { default: '' },
      siteName: { default: '' },
      title: { default: '' },
      url: { default: '' },
    }
  },

  addCommands() {
    return {
      setLinkPreviewCard:
        (attrs) =>
        ({ commands }) =>
          commands.insertContent({ attrs, type: this.name }),
    }
  },

  addNodeView() {
    return ({ node, getPos, editor }) => {
      const dom = document.createElement('div')
      dom.classList.add('link-preview-nodeview')

      const props = $state({
        description: node.attrs.description as string,
        fetchError: node.attrs.fetchError as boolean,
        fetching: node.attrs.fetching as boolean,
        image: node.attrs.image as string,
        onUpdateAttrs: (attrs: Record<string, unknown>) => {
          const pos = getPos()
          if (pos === undefined) return
          editor.commands.updateAttributes('linkPreviewCard', attrs)
        },
        siteName: node.attrs.siteName as string,
        title: node.attrs.title as string,
        url: node.attrs.url as string,
      })

      const component = mount(LinkPreviewView, { props, target: dom })

      return {
        destroy() {
          unmount(component)
        },
        dom,
        update(updatedNode) {
          if (updatedNode.type.name !== 'linkPreviewCard') return false
          props.description = updatedNode.attrs.description
          props.fetchError = updatedNode.attrs.fetchError
          props.fetching = updatedNode.attrs.fetching
          props.image = updatedNode.attrs.image
          props.siteName = updatedNode.attrs.siteName
          props.title = updatedNode.attrs.title
          props.url = updatedNode.attrs.url
          return true
        },
      }
    }
  },

  atom: true,

  group: 'block',

  name: 'linkPreviewCard',

  parseHTML() {
    return [{ tag: 'div[data-link-preview]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(this.options.HTMLAttributes, {
        'data-link-preview': '',
        'data-url': HTMLAttributes.url,
      }),
      ['strong', {}, HTMLAttributes.title || ''],
      ['p', {}, HTMLAttributes.description || ''],
    ]
  },
})
