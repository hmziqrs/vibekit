import { describe, expect, it } from 'vitest'

const VALID_IMAGE_FORMATS = ['avif', 'webp'] as const
const VALID_IMAGE_FITS = ['contain', 'cover', 'crop', 'scale-down'] as const

function parseClampInt(
  value: string | null | undefined,
  fallback: number,
  min = 1,
  max = 100
): number {
  if (!value) return fallback
  const n = Number(value)
  if (!Number.isFinite(n)) return fallback
  return Math.min(max, Math.max(min, n))
}

function validateFormat(raw: string | null | undefined) {
  if (!raw) return undefined
  return VALID_IMAGE_FORMATS.includes(raw as 'avif' | 'webp') ? (raw as 'avif' | 'webp') : undefined
}

function validateFit(raw: string | null | undefined) {
  if (!raw) return undefined
  return VALID_IMAGE_FITS.includes(raw as 'contain' | 'cover' | 'crop' | 'scale-down')
    ? (raw as 'contain' | 'cover' | 'crop' | 'scale-down')
    : undefined
}

function buildImageParams(query: Record<string, string | null | undefined>) {
  const widthRaw = parseClampInt(query.w, 0, 1, 4096)
  const heightRaw = parseClampInt(query.h, 0, 1, 4096)
  return {
    fit: validateFit(query.fit),
    format: validateFormat(query.f),
    height: heightRaw > 0 ? heightRaw : undefined,
    quality: parseClampInt(query.q, 0, 1, 100) || undefined,
    width: widthRaw > 0 ? widthRaw : undefined,
  }
}

describe('image route input validation', () => {
  describe('format validation', () => {
    it('accepts avif', () => {
      expect(validateFormat('avif')).toBe('avif')
    })

    it('accepts webp', () => {
      expect(validateFormat('webp')).toBe('webp')
    })

    it('rejects unknown formats', () => {
      expect(validateFormat('png')).toBeUndefined()
      expect(validateFormat('jpeg')).toBeUndefined()
      expect(validateFormat('gif')).toBeUndefined()
    })

    it('rejects path traversal attempts', () => {
      expect(validateFormat('../../etc/passwd')).toBeUndefined()
    })

    it('returns undefined for null', () => {
      expect(validateFormat(null)).toBeUndefined()
    })

    it('returns undefined for undefined', () => {
      expect(validateFormat(undefined)).toBeUndefined()
    })

    it('returns undefined for empty string', () => {
      expect(validateFormat('')).toBeUndefined()
    })
  })

  describe('fit validation', () => {
    it('accepts all valid fit values', () => {
      expect(validateFit('contain')).toBe('contain')
      expect(validateFit('cover')).toBe('cover')
      expect(validateFit('crop')).toBe('crop')
      expect(validateFit('scale-down')).toBe('scale-down')
    })

    it('rejects invalid fit values', () => {
      expect(validateFit('fill')).toBeUndefined()
      expect(validateFit('stretch')).toBeUndefined()
      expect(validateFit('none')).toBeUndefined()
    })

    it('returns undefined for null/undefined/empty', () => {
      expect(validateFit(null)).toBeUndefined()
      expect(validateFit(undefined)).toBeUndefined()
      expect(validateFit('')).toBeUndefined()
    })
  })

  describe('width/height clamping', () => {
    it('clamps width to max 4096', () => {
      const params = buildImageParams({ w: '99999' })
      expect(params.width).toBe(4096)
    })

    it('clamps height to max 4096', () => {
      const params = buildImageParams({ h: '99999' })
      expect(params.height).toBe(4096)
    })

    it('clamps zero to min 1', () => {
      const params = buildImageParams({ w: '0' })
      expect(params.width).toBe(1)
    })

    it('clamps negative values to min 1', () => {
      const params = buildImageParams({ w: '-100' })
      expect(params.width).toBe(1)
    })

    it('returns undefined for NaN', () => {
      const params = buildImageParams({ w: 'abc' })
      expect(params.width).toBeUndefined()
    })

    it('returns undefined for null', () => {
      const params = buildImageParams({ w: null })
      expect(params.width).toBeUndefined()
    })

    it('returns undefined for Infinity', () => {
      const params = buildImageParams({ w: 'Infinity' })
      expect(params.width).toBeUndefined()
    })

    it('accepts valid dimensions', () => {
      const params = buildImageParams({ h: '300', w: '800' })
      expect(params.width).toBe(800)
      expect(params.height).toBe(300)
    })
  })

  describe('quality clamping', () => {
    it('clamps quality to max 100', () => {
      const params = buildImageParams({ q: '999' })
      expect(params.quality).toBe(100)
    })

    it('clamps quality to min 1 for zero input', () => {
      const params = buildImageParams({ q: '0' })
      expect(params.quality).toBe(1)
    })

    it('returns undefined for NaN', () => {
      const params = buildImageParams({ q: 'high' })
      expect(params.quality).toBeUndefined()
    })

    it('accepts valid quality', () => {
      const params = buildImageParams({ q: '75' })
      expect(params.quality).toBe(75)
    })
  })

  describe('full params combination', () => {
    it('builds valid params for legitimate request', () => {
      const params = buildImageParams({
        f: 'webp',
        fit: 'cover',
        h: '400',
        q: '80',
        w: '800',
      })
      expect(params).toEqual({
        fit: 'cover',
        format: 'webp',
        height: 400,
        quality: 80,
        width: 800,
      })
    })

    it('strips invalid format and fit while keeping valid dimensions', () => {
      const params = buildImageParams({
        f: 'png',
        fit: 'stretch',
        h: '300',
        w: '600',
      })
      expect(params.format).toBeUndefined()
      expect(params.fit).toBeUndefined()
      expect(params.width).toBe(600)
      expect(params.height).toBe(300)
    })

    it('returns all undefined for empty query', () => {
      const params = buildImageParams({})
      expect(params).toEqual({
        fit: undefined,
        format: undefined,
        height: undefined,
        quality: undefined,
        width: undefined,
      })
    })
  })
})
