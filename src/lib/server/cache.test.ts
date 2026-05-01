import { blogCacheTags, purgeBlogCache } from './cache'
import type { CachePlatform } from './cache'

describe(blogCacheTags, () => {
  it('returns index tag only when no slug', () => {
    expect(blogCacheTags()).toStrictEqual(['blog:index'])
  })

  it('includes slug tag when slug provided', () => {
    expect(blogCacheTags('my-post')).toStrictEqual(['blog:index', 'blog:slug:my-post'])
  })

  it('includes tag tag when tag provided', () => {
    expect(blogCacheTags(undefined, 'svelte')).toStrictEqual(['blog:index', 'blog:tag:svelte'])
  })

  it('includes all tags', () => {
    expect(blogCacheTags('my-post', 'svelte')).toStrictEqual([
      'blog:index',
      'blog:slug:my-post',
      'blog:tag:svelte',
    ])
  })
})

describe(purgeBlogCache, () => {
  it('does nothing when platform is undefined', async () => {
    await expect(purgeBlogCache(undefined, 'slug')).resolves.toBeUndefined()
  })

  it('does nothing when caches is undefined', async () => {
    await expect(purgeBlogCache({}, 'slug')).resolves.toBeUndefined()
  })

  it('calls cache delete for index and slug', async () => {
    const deleteFn = vi.fn().mockResolvedValue(undefined)
    const platform = {
      caches: {
        default: { delete: deleteFn },
      },
    } as CachePlatform

    await purgeBlogCache(platform, 'test-post')

    expect(deleteFn).toHaveBeenCalledTimes(2)
  })

  it('handles cache delete errors gracefully', async () => {
    const deleteFn = vi.fn().mockRejectedValue(new Error('cache error'))
    const platform = {
      caches: {
        default: { delete: deleteFn },
      },
    } as CachePlatform

    await expect(purgeBlogCache(platform, 'test')).resolves.toBeUndefined()
  })
})
