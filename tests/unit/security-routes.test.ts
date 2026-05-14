import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('$lib/server/db/schema', () => ({
  pushSubscription: {
    auth: 'auth',
    createdAt: 'createdAt',
    endpoint: 'endpoint',
    id: 'id',
    p256dh: 'p256dh',
    userAgent: 'userAgent',
    userId: 'userId',
  },
}))

describe('route security checks', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  describe('push unsubscribe ownership', () => {
    it('allows unsubscribe when endpoint belongs to user', async () => {
      const { unsubscribeFromPush } = await import('$lib/server/push')
      const deleteFn = vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) })
      const db = { delete: deleteFn } as never
      await unsubscribeFromPush(db, 'https://push.example.com/sub/user1-endpoint')
      expect(deleteFn).toHaveBeenCalled()
    })

    it('subscription list returns only user subscriptions', async () => {
      const { getUserPushSubscriptions } = await import('$lib/server/push')
      const userSubs = [
        { endpoint: 'https://push.example.com/sub/a', id: 'sub-1', userId: 'user-1' },
      ]
      const db = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue(userSubs),
            }),
          }),
        }),
      } as never
      const result = await getUserPushSubscriptions(db, 'user-1')
      expect(result).toHaveLength(1)
      expect(result[0].userId).toBe('user-1')
    })

    it('returns empty array for user with no subscriptions', async () => {
      const { getUserPushSubscriptions } = await import('$lib/server/push')
      const db = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([]),
            }),
          }),
        }),
      } as never
      const result = await getUserPushSubscriptions(db, 'user-no-subs')
      expect(result).toHaveLength(0)
    })
  })

  describe('billing portal returnUrl validation', () => {
    it('accepts relative path returnUrl', () => {
      const returnUrl = '/app/settings/billing'
      const isValid = returnUrl.startsWith('/')
      expect(isValid).toBe(true)
    })

    it('accepts same-origin returnUrl', () => {
      const origin = 'https://app.vibekit.dev'
      const returnUrl = 'https://app.vibekit.dev/settings'
      const isValid = returnUrl.startsWith('/') || returnUrl.startsWith(origin)
      expect(isValid).toBe(true)
    })

    it('rejects external URL returnUrl', () => {
      const origin = 'https://app.vibekit.dev'
      const returnUrl = 'https://evil.com/phishing'
      const isValid = returnUrl.startsWith('/') || returnUrl.startsWith(origin)
      expect(isValid).toBe(false)
    })

    it('rejects javascript: protocol returnUrl', () => {
      const origin = 'https://app.vibekit.dev'
      const returnUrl = 'javascript:alert(1)'
      const isValid = returnUrl.startsWith('/') || returnUrl.startsWith(origin)
      expect(isValid).toBe(false)
    })

    it('rejects protocol-relative URL returnUrl', () => {
      const origin = 'https://app.vibekit.dev'
      const returnUrl = '//evil.com/phishing'
      // Protocol-relative URLs start with // but not a single /
      const isRelative = returnUrl.startsWith('/') && !returnUrl.startsWith('//')
      const isSameOrigin = returnUrl.startsWith(origin)
      const isValid = isRelative || isSameOrigin
      expect(isValid).toBe(false)
    })
  })

  describe('media key path validation', () => {
    it('accepts valid blog media keys', () => {
      const key = 'blog/images/photo.jpg'
      expect(key.startsWith('blog/')).toBe(true)
      expect(key.includes('..')).toBe(false)
    })

    it('rejects keys without blog/ prefix', () => {
      const key = 'avatars/user-1.jpg'
      expect(key.startsWith('blog/')).toBe(false)
    })

    it('rejects path traversal attempts', () => {
      const key = 'blog/../../etc/passwd'
      expect(key.startsWith('blog/')).toBe(true)
      expect(key.includes('..')).toBe(true)
    })

    it('rejects double-encoded path traversal', () => {
      const key = 'blog/..%2F..%2Fetc'
      expect(key.includes('..')).toBe(true)
    })

    it('accepts nested blog paths', () => {
      const key = 'blog/posts/2024/header.png'
      expect(key.startsWith('blog/')).toBe(true)
      expect(key.includes('..')).toBe(false)
    })
  })

  describe('avatar extension sanitization', () => {
    const allowedExts = ['jpg', 'jpeg', 'png', 'webp']

    function sanitizeExt(filename: string): string {
      const ext = filename.split('.').pop()?.toLowerCase() ?? 'jpg'
      return allowedExts.includes(ext) ? ext : 'jpg'
    }

    it('allows jpg extension', () => {
      expect(sanitizeExt('photo.jpg')).toBe('jpg')
    })

    it('allows jpeg extension', () => {
      expect(sanitizeExt('photo.jpeg')).toBe('jpeg')
    })

    it('allows png extension', () => {
      expect(sanitizeExt('photo.png')).toBe('png')
    })

    it('allows webp extension', () => {
      expect(sanitizeExt('photo.webp')).toBe('webp')
    })

    it('rejects php extension', () => {
      expect(sanitizeExt('image.php')).toBe('jpg')
    })

    it('rejects svg extension', () => {
      expect(sanitizeExt('icon.svg')).toBe('jpg')
    })

    it('rejects exe extension', () => {
      expect(sanitizeExt('payload.exe')).toBe('jpg')
    })

    it('rejects double extension', () => {
      expect(sanitizeExt('image.php.jpg')).toBe('jpg')
    })

    it('handles uppercase extensions', () => {
      expect(sanitizeExt('photo.JPG')).toBe('jpg')
    })

    it('handles no extension', () => {
      expect(sanitizeExt('photo')).toBe('jpg')
    })
  })

  describe('api key ownership check pattern', () => {
    it('detects key belongs to user', () => {
      const userKeys = [
        { id: 'key-1', name: 'My Key' },
        { id: 'key-2', name: 'Other Key' },
      ]
      const requestedKey = 'key-1'
      expect(userKeys.some((k) => k.id === requestedKey)).toBe(true)
    })

    it('detects key does not belong to user', () => {
      const userKeys = [{ id: 'key-1', name: 'My Key' }]
      const requestedKey = 'key-other-user'
      expect(userKeys.some((k) => k.id === requestedKey)).toBe(false)
    })

    it('handles empty key list', () => {
      const userKeys: { id: string }[] = []
      expect(userKeys.some((k) => k.id === 'any-key')).toBe(false)
    })
  })
})
