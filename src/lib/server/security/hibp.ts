/**
 * HaveIBeenPwned (HIBP) k-anonymity password breach check.
 *
 * Uses the HIBP Pwned Passwords API with k-anonymity so the full password
 * never leaves the server:
 *
 * 1. SHA-1 hash the password (uppercase hex)
 * 2. Send only the first 5 characters (prefix) to the API
 * 3. The API returns all matching suffix hashes and their breach counts
 * 4. Check if our suffix appears in the response
 *
 * Runs on Cloudflare Workers using the Web Crypto API.
 * Fails open — if the API is unreachable, the password is allowed through.
 */

const HIBP_API = 'https://api.pwnedpasswords.com/range'

/** Reject passwords that appear in more than this many breaches. */
const MAX_BREACH_COUNT = 10

export interface HIBPCheckResult {
  /** Whether the password exceeds the breach threshold. */
  breached: boolean
  /** Number of times the password has appeared in known breaches (0 if not found). */
  count: number
}

/**
 * Compute an uppercase SHA-1 hex digest using the Web Crypto API.
 * Available in Cloudflare Workers, Node 15+, and all modern browsers.
 */
async function sha1(input: string): Promise<string> {
  const encoded = new TextEncoder().encode(input)
  const buffer = await crypto.subtle.digest('SHA-1', encoded)
  return [...new Uint8Array(buffer)]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase()
}

/**
 * Check a password against the HIBP Pwned Passwords database using k-anonymity.
 *
 * @param password - The plaintext password to check.
 * @returns An object indicating whether the password is breached and how many times.
 *
 * @example
 * ```ts
 * import { checkPasswordBreach } from '$lib/server/security/hibp'
 *
 * const result = await checkPasswordBreach(userPassword)
 * if (result.breached) {
 *   return 'This password has appeared in ' + result.count + ' data breaches. Please choose a different one.'
 * }
 * ```
 */
export async function checkPasswordBreach(password: string): Promise<HIBPCheckResult> {
  try {
    const hash = await sha1(password)
    const prefix = hash.slice(0, 5)
    const suffix = hash.slice(5)

    const response = await fetch(`${HIBP_API}/${prefix}`, {
      headers: {
        // HIBP recommends adding a user-agent so they can track usage
        'User-Agent': 'vibekit-security-check',
      },
    })

    if (!response.ok) {
      return { breached: false, count: 0 }
    }

    const body = await response.text()

    // Each line is formatted as "SUFFIX:COUNT"
    for (const line of body.split('\n')) {
      const [lineSuffix, countStr] = line.split(':')
      if (lineSuffix?.trim() === suffix) {
        const count = parseInt(countStr ?? '0', 10)
        return { breached: count > MAX_BREACH_COUNT, count }
      }
    }

    return { breached: false, count: 0 }
  } catch {
    // Fail open: don't block registrations if HIBP is unreachable
    return { breached: false, count: 0 }
  }
}
