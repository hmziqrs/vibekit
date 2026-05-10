import { mergeAttributes, Node } from '@tiptap/core'
import { mount, unmount } from 'svelte'

import ArticleSectionEmbedView from '../nodeviews/article-section-embed-view.svelte'

export interface ArticleSectionEmbedOptions {
  HTMLAttributes: Record<string, unknown>
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    articleSectionEmbed: {
      setArticleSectionEmbed: (attrs: {
        articleId?: string
        articleSlug?: string
        articleTitle?: string
        content?: string
      }) => ReturnType
    }
  }
}

export const ArticleSectionEmbed = Node.create<ArticleSectionEmbedOptions>({
  addAttributes() {
    return {
      articleId: { default: '' },
      articleSlug: { default: '' },
      articleTitle: { default: '' },
      content: { default: '' },
    }
  },

  addCommands() {
    return {
      setArticleSectionEmbed:
        (attrs) =>
        ({ commands }) =>
          commands.insertContent({ attrs, type: this.name }),
    }
  },

  addNodeView() {
    return ({ node, getPos, editor }) => {
      const dom = document.createElement('div')
      dom.classList.add('article-section-embed-nodeview')

      const props = {
        articleId: node.attrs.articleId as string,
        articleSlug: node.attrs.articleSlug as string,
        articleTitle: node.attrs.articleTitle as string,
        content: node.attrs.content as string,
        onUpdateAttrs: (attrs: Record<string, unknown>) => {
          const pos = getPos()
          if (pos === undefined) return
          editor.commands.updateAttributes('articleSectionEmbed', attrs)
        },
      }

      const component = mount(ArticleSectionEmbedView, { props, target: dom })

      return {
        destroy() {
          unmount(component)
        },
        dom,
        update(updatedNode) {
          if (updatedNode.type.name !== 'articleSectionEmbed') return false
          props.articleId = updatedNode.attrs.articleId
          props.articleSlug = updatedNode.attrs.articleSlug
          props.articleTitle = updatedNode.attrs.articleTitle
          props.content = updatedNode.attrs.content
          return true
        },
      }
    }
  },

  atom: true,

  group: 'block',

  name: 'articleSectionEmbed',

  parseHTML() {
    return [{ tag: 'div[data-article-section-embed]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(this.options.HTMLAttributes, {
        'data-article-id': HTMLAttributes.articleId,
        'data-article-section-embed': '',
        'data-article-slug': HTMLAttributes.articleSlug,
        'data-article-title': HTMLAttributes.articleTitle,
      }),
      ['div', {}, HTMLAttributes.content || ''],
    ]
  },
})
