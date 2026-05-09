import { Extension } from '@tiptap/core'
import { Plugin } from '@tiptap/pm/state'

export interface ImageDropOptions {
  HTMLAttributes: Record<string, unknown>
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
              const url = URL.createObjectURL(file)
              editor.commands.setFigureImage({
                alt: file.name,
                caption: '',
                src: url,
              })
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

              const url = URL.createObjectURL(file)
              editor.commands.setFigureImage({
                alt: '',
                caption: '',
                src: url,
              })
            }

            return true
          },
        },
      }),
    ]
  },

  name: 'imageDrop',
})
