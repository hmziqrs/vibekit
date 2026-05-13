import { Extension } from '@tiptap/core'
import { Plugin } from '@tiptap/pm/state'

const DRAG_MIME = 'application/x-figure-image-pos'

function removeIndicators(root: ParentNode) {
  root.querySelectorAll('.figure-drop-line').forEach((el) => el.remove())
}

function insertDropLine(editorDom: HTMLElement, y: number) {
  removeIndicators(editorDom)

  const blocks = editorDom.querySelectorAll(
    '.ProseMirror > p, .ProseMirror > h2, .ProseMirror > h3, .ProseMirror > h4, .ProseMirror > .figure-image-nodeview, .ProseMirror > blockquote, .ProseMirror > ul, .ProseMirror > ol, .ProseMirror > pre, .ProseMirror > hr, .ProseMirror > table'
  )
  if (!blocks.length) return

  let target: Element | undefined
  let before = true

  for (const block of blocks) {
    const rect = block.getBoundingClientRect()
    const midY = rect.top + rect.height / 2

    if (y < midY) {
      target = block
      before = true
      break
    }

    target = block
    before = false
  }

  if (!target) return

  const line = document.createElement('div')
  line.classList.add('figure-drop-line')
  line.style.cssText =
    'height:3px;background:var(--brand);border-radius:2px;margin:2px 0;pointer-events:none'

  if (before) {
    target.parentElement?.insertBefore(line, target)
  } else {
    target.parentElement?.insertBefore(line, target.nextSibling)
  }
}

export const ImageReorder = Extension.create({
  addProseMirrorPlugins() {
    return [
      new Plugin({
        props: {
          handleDOMEvents: {
            dragleave(_view) {
              removeIndicators(_view.dom)
              return false
            },

            dragover(_view, event) {
              if (!event.dataTransfer?.types.includes(DRAG_MIME)) return false

              event.preventDefault()
              insertDropLine(_view.dom as HTMLElement, event.clientY)
              return false
            },
          },

          handleDrop(view, event) {
            const posStr = event.dataTransfer?.getData(DRAG_MIME)
            if (!posStr) return false

            event.preventDefault()
            removeIndicators(document)

            const sourcePos = Number(posStr)
            if (!Number.isInteger(sourcePos)) return false

            const coords = { x: event.clientX, y: event.clientY }
            const result = view.posAtCoords(coords)
            if (!result) return false

            const dropPos = result.pos
            const sourceNode = view.state.doc.nodeAt(sourcePos)
            if (!sourceNode || sourceNode.type.name !== 'figureImage') return false

            if (sourcePos === dropPos) return true

            const nodeCopy = sourceNode.toJSON()
            const insertPos = dropPos > sourcePos ? dropPos - sourceNode.nodeSize : dropPos

            const { tr } = view.state
            tr.delete(sourcePos, sourcePos + sourceNode.nodeSize)
            const { from } = tr.mapping.mapResult(insertPos < sourcePos ? insertPos : insertPos)
            const resolvedFrom = tr.doc.resolve(from)
            const newNode = view.state.schema.nodeFromJSON(nodeCopy)
            tr.insert(resolvedFrom.pos, newNode)
            view.dispatch(tr)

            return true
          },
        },
      }),
    ]
  },

  name: 'imageReorder',
})

export { DRAG_MIME }
