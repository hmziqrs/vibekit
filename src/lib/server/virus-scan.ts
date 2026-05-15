import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

// Known malicious byte patterns (simplified heuristic detection)
const DANGEROUS_PATTERNS: { name: string; pattern: number[] }[] = [
  // EICAR test signature (standard test virus)
  { name: 'EICAR-Test', pattern: [0x58, 0x35, 0x4f, 0x21, 0x50, 0x25, 0x40, 0x41, 0x50, 0x5b] },
  // PE executable headers (Windows .exe)
  { name: 'PE-Executable', pattern: [0x4d, 0x5a, 0x90, 0x00] },
  // ELF executable (Linux)
  { name: 'ELF-Executable', pattern: [0x7f, 0x45, 0x4c, 0x46] },
  // Mach-O executable (macOS)
  { name: 'MachO-Executable', pattern: [0xcf, 0xfa, 0xed, 0xfe] },
  // Mach-O 64-bit
  { name: 'MachO64-Executable', pattern: [0xce, 0xfa, 0xed, 0xfe] },
]

export interface ScanResult {
  clean: boolean
  threats: string[]
  scannedAt: Date
}

export async function scanBuffer(data: Uint8Array): Promise<ScanResult> {
  const threats: string[] = []

  for (const { name, pattern } of DANGEROUS_PATTERNS) {
    if (data.length < pattern.length) continue
    let found = true
    for (let i = 0; i < pattern.length; i++) {
      if (data[i] !== pattern[i]) {
        found = false
        break
      }
    }
    if (found) threats.push(name)
  }

  // Also scan interior bytes for embedded executables
  const windowSize = 4
  for (let offset = 1; offset < Math.min(data.length, 1024) - windowSize; offset++) {
    // Check for PE header at any offset in first 1KB
    if (
      data[offset] === 0x50 &&
      data[offset + 1] === 0x45 &&
      data[offset + 2] === 0x00 &&
      data[offset + 3] === 0x00
    ) {
      if (!threats.includes('PE-Executable')) threats.push('Embedded-PE')
    }
  }

  return { clean: threats.length === 0, scannedAt: new Date(), threats }
}

export async function scanFile(filePath: string): Promise<ScanResult> {
  const data = await readFile(filePath)
  return scanBuffer(new Uint8Array(data.buffer, data.byteOffset, data.byteLength))
}

export async function scanUploadedFile(file: File): Promise<ScanResult> {
  const buffer = await file.slice(0, 2048).arrayBuffer()
  return scanBuffer(new Uint8Array(buffer))
}
