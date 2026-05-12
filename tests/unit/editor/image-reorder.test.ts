import { ImageReorder, DRAG_MIME } from '$lib/editor/extensions/image-reorder'
import { describe, expect, it } from 'vitest'

describe('image-reorder', () => {
  it('exports the DRAG_MIME constant', () => {
    expect(DRAG_MIME).toBe('application/x-figure-image-pos')
  })

  it('exports the ImageReorder extension', () => {
    expect(ImageReorder).toBeDefined()
  })

  it('has the correct extension name', () => {
    expect(ImageReorder.name).toBe('imageReorder')
  })

  it('is a TipTap extension with addProseMirrorPlugins method', () => {
    expectTypeOf(ImageReorder.configure).toBeFunction()
  })

  it('configures without error', () => {
    const configured = ImageReorder.configure()
    expect(configured).toBeDefined()
    expect(configured.name).toBe('imageReorder')
  })

  it('has the correct type', () => {
    expect(ImageReorder.type).toBe('extension')
  })
})
