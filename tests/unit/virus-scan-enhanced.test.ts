import { scanBuffer } from '$lib/server/virus-scan'
import { describe, expect, it } from 'vitest'

describe('scanBuffer - enhanced virus scanner', () => {
  // ---------------------------------------------------------------------------
  // Binary pattern detection
  // ---------------------------------------------------------------------------
  describe('binary pattern detection', () => {
    it('detects EICAR test signature', async () => {
      const data = new Uint8Array([0x58, 0x35, 0x4f, 0x21, 0x50, 0x25, 0x40, 0x41, 0x50, 0x5b])
      const result = await scanBuffer(data)
      expect(result.clean).toBe(false)
      expect(result.threats).toContain('EICAR-Test')
    })

    it('detects PE executable (MZ header)', async () => {
      const data = new Uint8Array([0x4d, 0x5a, 0x90, 0x00])
      const result = await scanBuffer(data)
      expect(result.clean).toBe(false)
      expect(result.threats).toContain('PE-Executable')
    })

    it('detects ELF executable', async () => {
      const data = new Uint8Array([0x7f, 0x45, 0x4c, 0x46])
      const result = await scanBuffer(data)
      expect(result.clean).toBe(false)
      expect(result.threats).toContain('ELF-Executable')
    })

    it('detects Mach-O executable', async () => {
      const data = new Uint8Array([0xcf, 0xfa, 0xed, 0xfe])
      const result = await scanBuffer(data)
      expect(result.clean).toBe(false)
      expect(result.threats).toContain('MachO-Executable')
    })

    it('detects Mach-O 64-bit', async () => {
      const data = new Uint8Array([0xce, 0xfa, 0xed, 0xfe])
      const result = await scanBuffer(data)
      expect(result.clean).toBe(false)
      expect(result.threats).toContain('MachO64-Executable')
    })

    it('detects Mach-O Universal / Java class (0xCAFEBABE)', async () => {
      const data = new Uint8Array([0xca, 0xfe, 0xba, 0xbe])
      const result = await scanBuffer(data)
      expect(result.clean).toBe(false)
      // The pattern matches both MachO-Universal and Java-Class since they share
      // the same magic bytes — either (or both) threat names are acceptable.
      expect(result.threats.some((t) => t === 'MachO-Universal' || t === 'Java-Class')).toBe(true)
    })

    it('detects embedded PE header (0x50,0x45,0x00,0x00) at offset within first 1KB', async () => {
      // Place the PE signature at byte offset 500 inside a 1024-byte buffer
      const data = new Uint8Array(1024)
      data[500] = 0x50
      data[501] = 0x45
      data[502] = 0x00
      data[503] = 0x00
      const result = await scanBuffer(data)
      expect(result.clean).toBe(false)
      expect(result.threats).toContain('Embedded-PE')
    })
  })

  // ---------------------------------------------------------------------------
  // Content pattern detection
  // ---------------------------------------------------------------------------
  describe('content pattern detection', () => {
    it('detects VBA macro marker', async () => {
      const text = 'Attribute VB_Name = "Module1"'
      const data = new TextEncoder().encode(text)
      const result = await scanBuffer(data)
      expect(result.clean).toBe(false)
      expect(result.threats).toContain('VBA-Macro')
    })

    it('detects ActiveX object', async () => {
      const text = '<object classid="clsid:..." />'
      const data = new TextEncoder().encode(text)
      const result = await scanBuffer(data)
      expect(result.clean).toBe(false)
      expect(result.threats).toContain('ActiveX-Object')
    })

    it('detects PowerShell encoded command', async () => {
      const text = 'powershell -EncodedCommand JABjAGwA...'
      const data = new TextEncoder().encode(text)
      const result = await scanBuffer(data)
      expect(result.clean).toBe(false)
      expect(result.threats).toContain('PS-Encoded')
    })

    it('detects WScript shell', async () => {
      const text = 'CreateObject("WScript.Shell")'
      const data = new TextEncoder().encode(text)
      const result = await scanBuffer(data)
      expect(result.clean).toBe(false)
      expect(result.threats).toContain('WScript-Shell')
    })
  })

  // ---------------------------------------------------------------------------
  // Clean files
  // ---------------------------------------------------------------------------
  describe('clean files', () => {
    it('clean PNG file passes', async () => {
      // PNG signature + some padding bytes
      const data = new Uint8Array([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44,
        0x52,
      ])
      const result = await scanBuffer(data)
      expect(result.clean).toBe(true)
      expect(result.threats).toEqual([])
    })

    it('clean JPEG file passes', async () => {
      // JPEG SOI + APP0 marker + padding
      const data = new Uint8Array([
        0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00,
      ])
      const result = await scanBuffer(data)
      expect(result.clean).toBe(true)
      expect(result.threats).toEqual([])
    })

    it('clean text content passes', async () => {
      const data = new TextEncoder().encode('Hello, this is a safe plain text file.')
      const result = await scanBuffer(data)
      expect(result.clean).toBe(true)
      expect(result.threats).toEqual([])
    })

    it('empty buffer passes (clean)', async () => {
      const data = new Uint8Array([])
      const result = await scanBuffer(data)
      expect(result.clean).toBe(true)
      expect(result.threats).toEqual([])
    })
  })

  // ---------------------------------------------------------------------------
  // Edge cases
  // ---------------------------------------------------------------------------
  describe('edge cases', () => {
    it('very small buffer (< 4 bytes) passes', async () => {
      const data = new Uint8Array([0x41, 0x42, 0x43])
      const result = await scanBuffer(data)
      expect(result.clean).toBe(true)
      expect(result.threats).toEqual([])
    })

    it('returns correct ScanResult shape', async () => {
      const data = new Uint8Array([0x00])
      const result = await scanBuffer(data)
      expect(result).toHaveProperty('clean')
      expect(typeof result.clean).toBe('boolean')
      expect(result).toHaveProperty('threats')
      expect(Array.isArray(result.threats)).toBe(true)
      expect(result).toHaveProperty('scannedAt')
      expect(result.scannedAt).toBeInstanceOf(Date)
    })

    it('returns multiple threats when multiple patterns match', async () => {
      // Craft a buffer whose bytes start with an ELF header and also contain
      // a WScript.Shell reference in the UTF-8 decode window.
      const elfHeader = new Uint8Array([0x7f, 0x45, 0x4c, 0x46, 0x02, 0x01, 0x01, 0x00])
      const wscriptBytes = new TextEncoder().encode('WScript.Shell')
      const data = new Uint8Array(elfHeader.length + wscriptBytes.length)
      data.set(elfHeader, 0)
      data.set(wscriptBytes, elfHeader.length)
      const result = await scanBuffer(data)
      expect(result.clean).toBe(false)
      expect(result.threats.length).toBeGreaterThanOrEqual(2)
      expect(result.threats).toContain('ELF-Executable')
      expect(result.threats).toContain('WScript-Shell')
    })

    it('content patterns are case-insensitive', async () => {
      const text = '<OBJECT CLASSID="clsid:abcd">'
      const data = new TextEncoder().encode(text)
      const result = await scanBuffer(data)
      expect(result.clean).toBe(false)
      expect(result.threats).toContain('ActiveX-Object')
    })
  })
})
