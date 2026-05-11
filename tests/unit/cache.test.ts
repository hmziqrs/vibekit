import { purgeBlogCache, type CachePlatform } from '$lib/server/cache'
import { describe, expect, it, vi } from 'vitest'

describe(purgeBlogCache, () => {
  it('does nothing when platform is undefined', async () => {
    await expect(purgeBlogCache(undefined, 'slug')).resolves.toBeUndefined()
  })

  it('does nothing when caches is undefined', async () => {
    await expect(purgeBlogCache({}, 'slug')).resolves.toBeUndefined()
  })

  it('calls cache delete for index and slug', async () => {
    const deleteFn = vi.fn<() => Promise<void>>().mockResolvedValue(undefined)
    const platform = {
      caches: {
        default: { delete: deleteFn },
      },
    } as CachePlatform

    await purgeBlogCache(platform, 'test-post')

    expect(deleteFn).toHaveBeenCalledTimes(2)
  })

  it('handles cache delete errors gracefully', async () => {
    const deleteFn = vi.fn<() => Promise<void>>().mockRejectedValue(new Error('cache error'))
    const platform = {
      caches: {
        default: { delete: deleteFn },
      },
    } as CachePlatform

    await expect(purgeBlogCache(platform, 'test')).resolves.toBeUndefined()
  })
})
