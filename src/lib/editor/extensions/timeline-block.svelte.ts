import { mergeAttributes, Node } from '@tiptap/core'
import { mount, unmount } from 'svelte'

import TimelineView from '../nodeviews/timeline-view.svelte'

export interface TimelineBlockOptions {
  HTMLAttributes: Record<string, unknown>
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    timelineBlock: {
      setTimelineBlock: (attrs?: { entries?: { text: string; time: string }[] }) => ReturnType
    }
  }
}

export const TimelineBlock = Node.create<TimelineBlockOptions>({
  addAttributes() {
    return {
      entries: {
        default: [{ text: '', time: '' }],
        parseHTML: (el) => {
          try {
            return JSON.parse(el.getAttribute('data-entries') || '[]')
          } catch {
            return []
          }
        },
        renderHTML: (attrs) => ({
          'data-entries': JSON.stringify(attrs.entries),
        }),
      },
    }
  },

  addCommands() {
    return {
      setTimelineBlock:
        (attrs) =>
        ({ commands }) =>
          commands.insertContent({
            attrs: attrs ?? {},
            type: this.name,
          }),
    }
  },

  addNodeView() {
    return ({ editor, getPos, node }) => {
      const dom = document.createElement('div')
      dom.classList.add('timeline-block-nodeview')

      const props = $state({
        entries: node.attrs.entries,
        onUpdateAttrs: (attrs: Record<string, unknown>) => {
          const pos = getPos()
          if (pos === undefined) return
          editor.commands.updateAttributes('timelineBlock', attrs)
        },
      })

      const component = mount(TimelineView, { props, target: dom })

      return {
        destroy() {
          unmount(component)
        },
        dom,
        update(updatedNode) {
          if (updatedNode.type.name !== 'timelineBlock') return false
          props.entries = updatedNode.attrs.entries
          return true
        },
      }
    }
  },

  atom: true,

  group: 'block',

  name: 'timelineBlock',

  parseHTML() {
    return [{ tag: 'div[data-timeline-block]' }]
  },

  renderHTML({ HTMLAttributes: _HTMLAttributes }) {
    return ['div', mergeAttributes(this.options.HTMLAttributes, { 'data-timeline-block': '' })]
  },
})
