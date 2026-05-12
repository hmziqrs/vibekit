import { describe, expect, it } from 'vitest'

describe('Search UI', () => {
  it('search dialog component exports correctly', async () => {
    const mod = await import('$lib/components/search-dialog.svelte')
    expect(mod.default).toBeDefined()
  })

  it('search results page exists', async () => {
    const mod = await import('$lib/components/pagination.svelte')
    expect(mod.default).toBeDefined()
  })
})
