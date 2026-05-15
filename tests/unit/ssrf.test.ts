import { isSafeUrl } from '$lib/server/security/ssrf'
import { describe, expect, it } from 'vitest'

describe('isSafeUrl', () => {
  describe('blocks internal addresses', () => {
    it('blocks localhost', () => {
      expect(isSafeUrl('https://localhost/api')).toBe(false)
    })

    it('blocks 127.0.0.1', () => {
      expect(isSafeUrl('https://127.0.0.1/api')).toBe(false)
    })

    it('blocks 0.0.0.0', () => {
      expect(isSafeUrl('https://0.0.0.0/api')).toBe(false)
    })

    it('blocks ::1', () => {
      expect(isSafeUrl('https://[::1]/api')).toBe(false)
    })

    it('blocks cloud metadata endpoint', () => {
      expect(isSafeUrl('https://169.254.169.254/latest/meta-data/')).toBe(false)
    })

    it('blocks metadata.google.internal', () => {
      expect(isSafeUrl('https://metadata.google.internal/computeMetadata/v1/')).toBe(false)
    })
  })

  describe('blocks private IP ranges', () => {
    it('blocks 10.x.x.x', () => {
      expect(isSafeUrl('https://10.0.0.1/api')).toBe(false)
      expect(isSafeUrl('https://10.255.255.255/api')).toBe(false)
    })

    it('blocks 172.16.x.x - 172.31.x.x', () => {
      expect(isSafeUrl('https://172.16.0.1/api')).toBe(false)
      expect(isSafeUrl('https://172.31.255.255/api')).toBe(false)
    })

    it('allows 172.32.x.x (public range)', () => {
      expect(isSafeUrl('https://172.32.0.1/api')).toBe(true)
    })

    it('blocks 192.168.x.x', () => {
      expect(isSafeUrl('https://192.168.0.1/api')).toBe(false)
      expect(isSafeUrl('https://192.168.1.1/api')).toBe(false)
    })
  })

  describe('blocks blocked TLDs', () => {
    it('blocks .internal', () => {
      expect(isSafeUrl('https://service.internal/api')).toBe(false)
    })

    it('blocks .local', () => {
      expect(isSafeUrl('https://service.local/api')).toBe(false)
    })
  })

  describe('blocks IPv6 private ranges', () => {
    it('blocks fc00:: (ULA)', () => {
      expect(isSafeUrl('https://[fc00::1]/api')).toBe(false)
    })

    it('blocks fd00:: (ULA)', () => {
      expect(isSafeUrl('https://[fd00::1]/api')).toBe(false)
    })

    it('blocks fe80:: (link-local)', () => {
      expect(isSafeUrl('https://[fe80::1]/api')).toBe(false)
    })

    it('blocks IPv4-mapped IPv6', () => {
      expect(isSafeUrl('https://[::ffff:127.0.0.1]/api')).toBe(false)
    })
  })

  describe('protocol enforcement', () => {
    it('allows https by default', () => {
      expect(isSafeUrl('https://example.com/api')).toBe(true)
    })

    it('blocks http by default', () => {
      expect(isSafeUrl('http://example.com/api')).toBe(false)
    })

    it('allows http when allowHttp is true', () => {
      expect(isSafeUrl('http://example.com/api', { allowHttp: true })).toBe(true)
    })

    it('blocks ftp even with allowHttp', () => {
      expect(isSafeUrl('ftp://example.com/file', { allowHttp: true })).toBe(false)
    })
  })

  describe('allows safe public URLs', () => {
    it('allows example.com', () => {
      expect(isSafeUrl('https://example.com/page')).toBe(true)
    })

    it('allows github.com', () => {
      expect(isSafeUrl('https://github.com/user/repo')).toBe(true)
    })

    it('allows URLs with ports', () => {
      expect(isSafeUrl('https://example.com:8080/api')).toBe(true)
    })

    it('allows URLs with paths and query strings', () => {
      expect(isSafeUrl('https://example.com/api/v1/data?key=value')).toBe(true)
    })
  })

  describe('handles malformed URLs', () => {
    it('returns false for invalid URLs', () => {
      expect(isSafeUrl('not-a-url')).toBe(false)
    })

    it('returns false for empty string', () => {
      expect(isSafeUrl('')).toBe(false)
    })
  })
})
