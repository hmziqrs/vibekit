/**
 * Constant-time string comparison to prevent timing attacks.
 * Returns true if both strings have the same length and content.
 * Short-circuits on length mismatch (the length is not secret).
 */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  const aBuf = new TextEncoder().encode(a)
  const bBuf = new TextEncoder().encode(b)
  let mismatch = 0
  for (let i = 0; i < aBuf.length; i++) {
    mismatch |= aBuf[i]! ^ bBuf[i]!
  }
  return mismatch === 0
}
