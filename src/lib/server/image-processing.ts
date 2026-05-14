function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
}

export interface ImageResizeOptions {
  fit?: 'contain' | 'cover' | 'crop' | 'scale-down'
  format?: 'avif' | 'json' | 'webp'
  height?: number
  quality?: number
  width?: number
}

export interface SrcsetSize {
  descriptor: string
  width: number
}

const DEFAULT_SIZES: SrcsetSize[] = [
  { descriptor: '320w', width: 320 },
  { descriptor: '640w', width: 640 },
  { descriptor: '960w', width: 960 },
  { descriptor: '1280w', width: 1280 },
  { descriptor: '1920w', width: 1920 },
]

export function buildImageUrl(originalUrl: string, options: ImageResizeOptions): string {
  const params: string[] = []

  if (options.width) params.push(`width=${options.width}`)
  if (options.height) params.push(`height=${options.height}`)
  if (options.fit) params.push(`fit=${options.fit}`)
  if (options.format) params.push(`format=${options.format}`)
  if (options.quality) params.push(`quality=${options.quality}`)

  if (params.length === 0) return originalUrl

  // Cloudflare Image Resizing URL format
  return `/cdn-cgi/image/${params.join(',')}/${originalUrl.replace(/^\//, '')}`
}

export function buildSrcset(
  originalUrl: string,
  sizes?: SrcsetSize[],
  options?: Omit<ImageResizeOptions, 'width'>
): string {
  const srcSizes = sizes ?? DEFAULT_SIZES
  const baseOpts = options ?? {}

  return srcSizes
    .map((size) => {
      const url = buildImageUrl(originalUrl, { ...baseOpts, width: size.width })
      return `${url} ${size.descriptor}`
    })
    .join(', ')
}

export function buildSizesAttribute(sizes?: SrcsetSize[]): string {
  const srcSizes = sizes ?? DEFAULT_SIZES
  return srcSizes.map((s) => `(max-width: ${s.width}px) ${s.width}px`).join(', ')
}

export function getResponsiveImageHtml(
  originalUrl: string,
  alt: string,
  options?: {
    class?: string
    format?: 'avif' | 'webp'
    height?: number
    loading?: 'eager' | 'lazy'
    sizes?: SrcsetSize[]
  }
): string {
  const opts = options ?? {}
  const sizes = opts.sizes ?? DEFAULT_SIZES
  const srcset = buildSrcset(originalUrl, sizes, { format: opts.format })
  const sizesAttr = buildSizesAttribute(sizes)
  const fallback = buildImageUrl(originalUrl, {
    format: opts.format,
    height: opts.height,
    width: sizes[0]?.width ?? 640,
  })

  return `<img src="${fallback}" srcset="${srcset}" sizes="${sizesAttr}" alt="${alt}"${opts.loading ? ` loading="${opts.loading}"` : ''}${opts.class ? ` class="${opts.class}"` : ''} />`
}

export function extractImageMetadata(filename: string, fileSize: number) {
  const ext = filename.split('.').pop()?.toLowerCase() ?? ''
  const mimeTypeMap: Record<string, string> = {
    avif: 'image/avif',
    gif: 'image/gif',
    jpeg: 'image/jpeg',
    jpg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
  }

  return {
    extension: ext,
    filename,
    mimeType: mimeTypeMap[ext] ?? 'application/octet-stream',
    size: fileSize,
    sizeFormatted: formatFileSize(fileSize),
  }
}
