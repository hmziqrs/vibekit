import { scanBuffer } from '$lib/server/virus-scan'
import { describe, expect, it } from 'vitest'

describe('scanBuffer', () => {
  it('returns clean for safe image data', async () => {
    // Simulate a JPEG header
    const data = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46])
    const result = await scanBuffer(data)
    expect(result.clean).toBe(true)
    expect(result.threats).toEqual([])
  })

  it('returns clean for empty data', async () => {
    const data = new Uint8Array([])
    const result = await scanBuffer(data)
    expect(result.clean).toBe(true)
  })

  it('returns clean for random data', async () => {
    const data = new Uint8Array(256).map(() => Math.floor(Math.random() * 256))
    const result = await scanBuffer(data)
    expect(result.clean).toBe(true)
  })

  it('detects PE executable (MZ header)', async () => {
    // MZ header: Windows executable
    const data = new Uint8Array([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00])
    const result = await scanBuffer(data)
    expect(result.clean).toBe(false)
    expect(result.threats).toContain('PE-Executable')
  })

  it('detects ELF executable', async () => {
    const data = new Uint8Array([0x7f, 0x45, 0x4c, 0x46, 0x02, 0x01])
    const result = await scanBuffer(data)
    expect(result.clean).toBe(false)
    expect(result.threats).toContain('ELF-Executable')
  })

  it('detects Mach-O executable', async () => {
    const data = new Uint8Array([0xcf, 0xfa, 0xed, 0xfe, 0x07, 0x00])
    const result = await scanBuffer(data)
    expect(result.clean).toBe(false)
    expect(result.threats).toContain('MachO-Executable')
  })

  it('includes scannedAt timestamp', async () => {
    const data = new Uint8Array([0x00, 0x01, 0x02])
    const result = await scanBuffer(data)
    expect(result.scannedAt).toBeInstanceOf(Date)
  })

  it('detects EICAR test signature', async () => {
    const data = new Uint8Array([0x58, 0x35, 0x4f, 0x21, 0x50, 0x25, 0x40, 0x41, 0x50, 0x5b])
    const result = await scanBuffer(data)
    expect(result.clean).toBe(false)
    expect(result.threats).toContain('EICAR-Test')
  })

  it('detects embedded PE header in first 1KB', async () => {
    // Create data with PE header embedded at offset 100
    const data = new Uint8Array(512)
    data[100] = 0x50 // P
    data[101] = 0x45 // E
    data[102] = 0x00
    data[103] = 0x00
    const result = await scanBuffer(data)
    expect(result.clean).toBe(false)
    expect(result.threats).toContain('Embedded-PE')
  })

  it('returns clean for PNG data', async () => {
    const data = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    const result = await scanBuffer(data)
    expect(result.clean).toBe(true)
  })

  it('returns clean for GIF data', async () => {
    const data = new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61])
    const result = await scanBuffer(data)
    expect(result.clean).toBe(true)
  })
})
