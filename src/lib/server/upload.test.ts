import { generateStorageKey, validateImageUpload } from './upload'

describe(validateImageUpload, () => {
  it('accepts a valid JPEG under 5MB', () => {
    const file = new File(['x'.repeat(1000)], 'photo.jpg', { type: 'image/jpeg' })
    expect(validateImageUpload(file)).toBeNull()
  })

  it('accepts PNG', () => {
    const file = new File(['data'], 'img.png', { type: 'image/png' })
    expect(validateImageUpload(file)).toBeNull()
  })

  it('accepts WebP', () => {
    const file = new File(['data'], 'img.webp', { type: 'image/webp' })
    expect(validateImageUpload(file)).toBeNull()
  })

  it('accepts GIF', () => {
    const file = new File(['data'], 'img.gif', { type: 'image/gif' })
    expect(validateImageUpload(file)).toBeNull()
  })

  it('rejects non-image types', () => {
    const file = new File(['data'], 'doc.pdf', { type: 'application/pdf' })
    const err = validateImageUpload(file)
    expect(err).toContain('Invalid file type')
  })

  it('rejects files over 5MB', () => {
    const big = new File(['x'.repeat(6 * 1024 * 1024)], 'big.jpg', { type: 'image/jpeg' })
    const err = validateImageUpload(big)
    expect(err).toContain('too large')
  })

  it('rejects SVG', () => {
    const file = new File(['<svg></svg>'], 'icon.svg', { type: 'image/svg+xml' })
    expect(validateImageUpload(file)).toContain('Invalid file type')
  })
})

describe(generateStorageKey, () => {
  it('preserves file extension', () => {
    const key = generateStorageKey('photo.jpg')
    expect(key).toMatch(/^[a-f0-9-]{36}\.jpg$/)
  })

  it('lowercases extension', () => {
    const key = generateStorageKey('photo.PNG')
    expect(key).toMatch(/\.png$/)
  })

  it('uses full name as extension when no dot', () => {
    const key = generateStorageKey('noext')
    expect(key).toMatch(/\.noext$/)
  })

  it('generates unique keys', () => {
    const keys = new Set(Array.from({ length: 10 }, () => generateStorageKey('test.jpg')))
    expect(keys.size).toBe(10)
  })
})
