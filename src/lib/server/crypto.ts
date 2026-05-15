import { env } from '$env/dynamic/private'

const ALGORITHM = 'AES-GCM'
const KEY_LENGTH = 256
const IV_LENGTH = 12

function getEncryptionKey(): Promise<CryptoKey> {
  const secret = env.BETTER_AUTH_SECRET
  if (!secret) throw new Error('BETTER_AUTH_SECRET is required for token encryption')

  // Derive a deterministic key from the secret using HKDF
  const encoder = new TextEncoder()
  const keyMaterial = encoder.encode(secret)

  return crypto.subtle
    .importKey('raw', keyMaterial, { name: 'HKDF' }, false, ['deriveKey'])
    .then((baseKey) =>
      crypto.subtle.deriveKey(
        {
          hash: 'SHA-256',
          info: encoder.encode('vibekit-token-encryption'),
          name: 'HKDF',
          salt: encoder.encode('oauth-token-v1'),
        },
        baseKey,
        { length: KEY_LENGTH, name: ALGORITHM },
        false,
        ['encrypt', 'decrypt']
      )
    )
}

export async function encryptToken(plaintext: string): Promise<string> {
  const key = await getEncryptionKey()
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH))
  const encoder = new TextEncoder()

  const ciphertext = await crypto.subtle.encrypt(
    { iv, name: ALGORITHM },
    key,
    encoder.encode(plaintext)
  )

  // Format: base64(iv):base64(ciphertext)
  const ivB64 = btoa(String.fromCharCode(...iv))
  const ctB64 = btoa(String.fromCharCode(...new Uint8Array(ciphertext)))
  return `${ivB64}:${ctB64}`
}

export async function decryptToken(encrypted: string): Promise<string> {
  const [ivB64, ctB64] = encrypted.split(':')
  if (!ivB64 || !ctB64) throw new Error('Invalid encrypted token format')

  const key = await getEncryptionKey()
  const iv = Uint8Array.from(atob(ivB64), (c) => c.charCodeAt(0))
  const ciphertext = Uint8Array.from(atob(ctB64), (c) => c.charCodeAt(0))

  const decrypted = await crypto.subtle.decrypt({ iv, name: ALGORITHM }, key, ciphertext)

  return new TextDecoder().decode(decrypted)
}

/** Check if a value looks like an encrypted token (iv:ciphertext base64 format). */
export function isEncrypted(value: string): boolean {
  const parts = value.split(':')
  if (parts.length !== 2) return false
  try {
    atob(parts[0])
    atob(parts[1])
    return true
  } catch {
    return false
  }
}
