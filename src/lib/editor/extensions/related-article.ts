import { mergeAttributes, Node } from '@tiptap/core'
import { mount, unmount } from 'svelte'

import RelatedArticleView from '../nodeviews/related-article-view.svelte'

export interface RelatedArticleOptions {
  HTMLAttributes: Record<string, unknown>
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    relatedArticle: {
      setRelatedArticle: (attrs: {
        articleId?: string
        authorName?: string
        coverImageUrl?: string
        excerpt?: string
        publishedAt?: string
        slug?: string
        title?: string
      }) => ReturnType
    }
  }
}

export const RelatedArticle = Node.create<RelatedArticleOptions>({
  addAttributes() {
    return {
      articleId: { default: '' },
      authorName: { default: '' },
      coverImageUrl: { default: '' },
      excerpt: { default: '' },
      publishedAt: { default: '' },
      slug: { default: '' },
      title: { default: '' },
    }
  },

  addCommands() {
    return {
      setRelatedArticle:
        (attrs) =>
        ({ commands }) =>
          commands.insertContent({ attrs, type: this.name }),
    }
  },

  addNodeView() {
    return ({ editor, getPos, node }) => {
      const dom = document.createElement('div')
      dom.classList.add('related-article-nodeview')

      const props = {
        articleId: node.attrs.articleId,
        authorName: node.attrs.authorName,
        coverImageUrl: node.attrs.coverImageUrl,
        excerpt: node.attrs.excerpt,
        onUpdateAttrs: (attrs: Record<string, unknown>) => {
          const pos = getPos()
          if (pos === undefined) return
          editor.commands.updateAttributes('relatedArticle', attrs)
        },
        publishedAt: node.attrs.publishedAt,
        slug: node.attrs.slug,
        title: node.attrs.title,
      }

      const component = mount(RelatedArticleView, {
        props,
        target: dom,
      })

      return {
        destroy() {
          unmount(component)
        },
        dom,
        update(updatedNode) {
          if (updatedNode.type.name !== 'relatedArticle') return false
          props.articleId = updatedNode.attrs.articleId
          props.authorName = updatedNode.attrs.authorName
          props.coverImageUrl = updatedNode.attrs.coverImageUrl
          props.excerpt = updatedNode.attrs.excerpt
          props.publishedAt = updatedNode.attrs.publishedAt
          props.slug = updatedNode.attrs.slug
          props.title = updatedNode.attrs.title
          return true
        },
      }
    }
  },

  atom: true,

  group: 'block',

  name: 'relatedArticle',

  parseHTML() {
    return [{ tag: 'div[data-related-article]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(this.options.HTMLAttributes, { 'data-related-article': '' }),
      ['a', { href: HTMLAttributes.slug }, HTMLAttributes.title || ''],
      ['p', {}, HTMLAttributes.excerpt || ''],
    ]
  },
})
