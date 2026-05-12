import { mergeAttributes, Node } from '@tiptap/core'
import { mount, unmount } from 'svelte'

import FigureImageView from '../nodeviews/figure-image-view.svelte'

export interface FigureImageOptions {
  HTMLAttributes: Record<string, unknown>
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    figureImage: {
      setFigureImage: (attrs: {
        src: string
        alt?: string
        caption?: string
        credit?: string
        sourceUrl?: string
        uploadProgress?: number
        uploadState?: string
      }) => ReturnType
    }
  }
}

export const FigureImage = Node.create<FigureImageOptions>({
  addAttributes() {
    return {
      alt: { default: '' },
      caption: { default: '' },
      credit: { default: '' },
      sourceUrl: { default: '' },
      src: { default: null },
      uploadProgress: { default: 0 },
      uploadState: { default: 'none' },
    }
  },

  addCommands() {
    return {
      setFigureImage:
        (attrs) =>
        ({ commands }) =>
          commands.insertContent({ attrs, type: this.name }),
    }
  },

  addNodeView() {
    return ({ node, getPos, editor }) => {
      const dom = document.createElement('div')
      dom.classList.add('figure-image-nodeview')

      const props = $state({
        alt: node.attrs.alt,
        caption: node.attrs.caption,
        credit: node.attrs.credit,
        getNodePos: () => getPos(),
        onUpdateAttrs: (attrs: Record<string, unknown>) => {
          const pos = getPos()
          if (pos === undefined) return
          editor.commands.updateAttributes('figureImage', attrs)
        },
        sourceUrl: node.attrs.sourceUrl,
        src: node.attrs.src,
        uploadProgress: node.attrs.uploadProgress as number,
        uploadState: node.attrs.uploadState as string,
      })

      const component = mount(FigureImageView, {
        props,
        target: dom,
      })

      return {
        destroy() {
          unmount(component)
        },
        dom,
        update(updatedNode) {
          if (updatedNode.type.name !== 'figureImage') return false
          props.alt = updatedNode.attrs.alt
          props.caption = updatedNode.attrs.caption
          props.credit = updatedNode.attrs.credit
          props.sourceUrl = updatedNode.attrs.sourceUrl
          props.src = updatedNode.attrs.src
          props.uploadProgress = updatedNode.attrs.uploadProgress
          props.uploadState = updatedNode.attrs.uploadState
          return true
        },
      }
    }
  },

  atom: true,

  group: 'block',

  name: 'figureImage',

  parseHTML() {
    return [{ tag: 'figure[data-figure-image]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'figure',
      mergeAttributes(this.options.HTMLAttributes, { 'data-figure-image': '' }),
      ['img', { alt: HTMLAttributes.alt, src: HTMLAttributes.src }],
      ['figcaption', {}, HTMLAttributes.caption || ''],
    ]
  },
})
