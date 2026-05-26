import { uploadImage } from '$lib/editor/utils/upload-image'
import { type Editor, Extension } from '@tiptap/core'
import { Plugin } from '@tiptap/pm/state'

export interface ImageDropOptions {
  HTMLAttributes: Record<string, unknown>
}

function uploadAndReplace(editor: Editor, file: File, alt: string) {
  const blobUrl = URL.createObjectURL(file)
  editor.commands.setFigureImage({
    alt,
    caption: '',
    src: blobUrl,
    uploadProgress: 0,
    uploadState: 'uploading',
  })

  uploadImage(file)
    .then(({ url }) => {
      URL.revokeObjectURL(blobUrl)
      replaceBlobSrc(editor, blobUrl, {
        src: url,
        uploadProgress: 100,
        uploadState: 'done',
      })
    })
    .catch(() => {
      URL.revokeObjectURL(blobUrl)
      replaceBlobSrc(editor, blobUrl, {
        uploadState: 'error',
      })
    })
}

function replaceBlobSrc(editor: Editor, blobUrl: string, attrs: Record<string, unknown>) {
  const { tr } = editor.state
  let found = false
  editor.state.doc.descendants((node, pos) => {
    if (found) return false
    if (node.type.name === 'figureImage' && node.attrs.src === blobUrl) {
      tr.setNodeMarkup(pos, undefined, { ...node.attrs, ...attrs })
      found = true
      return false
    }
  })
  if (found) editor.view.dispatch(tr)
}

export const ImageDrop = Extension.create<ImageDropOptions>({
  addProseMirrorPlugins() {
    const { editor } = this

    return [
      new Plugin({
        props: {
          handleDrop(_view, event) {
            if (!event.dataTransfer?.files.length) return false

            const images = [...event.dataTransfer.files].filter((file) =>
              file.type.startsWith('image/')
            )
            if (!images.length) return false

            event.preventDefault()

            for (const file of images) {
              uploadAndReplace(editor, file, file.name)
            }

            return true
          },

          handlePaste(_view, event) {
            const items = event.clipboardData?.items
            if (!items) return false

            const images = [...items].filter((item) => item.type.startsWith('image/'))
            if (!images.length) return false

            event.preventDefault()

            for (const item of images) {
              const file = item.getAsFile()
              if (!file) {
                // oxlint-disable-next-line no-continue
                continue
              }

              uploadAndReplace(editor, file, '')
            }

            return true
          },
        },
      }),
    ]
  },

  name: 'imageDrop',
})
