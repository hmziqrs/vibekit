import { seo } from '$lib/seo'
import { describe, expect, it } from 'vitest'

describe('seo', () => {
  it('formats title with site name suffix', () => {
    const result = seo({ description: 'Test page', title: 'About' })
    expect(result.title).toBe('About — Vibekit')
  })

  it('returns bare site name when title matches', () => {
    const result = seo({ description: 'Home page', title: 'Vibekit' })
    expect(result.title).toBe('Vibekit')
  })

  it('includes open graph metadata', () => {
    const result = seo({ description: 'Desc', title: 'Test' })
    expect(result.openGraph).toEqual({
      description: 'Desc',
      image: undefined,
      publishedTime: undefined,
      siteName: 'Vibekit',
      title: 'Test — Vibekit',
      type: 'website',
    })
  })

  it('includes twitter metadata', () => {
    const result = seo({ description: 'Desc', title: 'Test' })
    expect(result.twitter).toEqual({
      card: 'summary',
      description: 'Desc',
      image: undefined,
      title: 'Test — Vibekit',
    })
  })

  it('uses summary_large_image twitter card when image is provided', () => {
    const result = seo({ description: 'Desc', image: '/img.png', title: 'Test' })
    expect(result.twitter.card).toBe('summary_large_image')
  })

  it('passes through canonical url', () => {
    const result = seo({
      canonical: 'https://example.com/page',
      description: 'Desc',
      title: 'Test',
    })
    expect(result.canonical).toBe('https://example.com/page')
  })

  it('defaults type to website', () => {
    const result = seo({ description: 'Desc', title: 'Test' })
    expect(result.openGraph.type).toBe('website')
  })

  it('supports article type', () => {
    const result = seo({
      description: 'Article desc',
      publishedTime: '2024-01-01',
      title: 'My Article',
      type: 'article',
    })
    expect(result.openGraph.type).toBe('article')
    expect(result.openGraph.publishedTime).toBe('2024-01-01')
  })

  it('includes image in open graph when provided', () => {
    const result = seo({ description: 'Desc', image: 'https://example.com/img.png', title: 'Test' })
    expect(result.openGraph.image).toBe('https://example.com/img.png')
  })

  it('passes through description unchanged', () => {
    const result = seo({ description: 'A specific description', title: 'Test' })
    expect(result.description).toBe('A specific description')
  })
})

describe('escapeXml (sitemap)', () => {
  it('escapes special xml characters', async () => {
    const mod = await import('$lib/seo')
    const desc = 'Test with <special> & "quotes" and \'apostrophes\''
    expect(mod.seo({ description: desc, title: 'Test' }).description).toBe(desc)
  })
})
