import { expect, test } from '@playwright/test'

test.describe('sitemap and RSS feeds', () => {
  test('GET /sitemap.xml returns valid XML', async ({ request }) => {
    const response = await request.get('/sitemap.xml')

    expect(response.status()).toBe(200)
    expect(response.headers()['content-type']).toContain('xml')

    const body = await response.text()
    expect(body).toContain('<?xml')
    expect(body).toContain('<urlset')
    expect(body).toContain('<url>')
    expect(body).toContain('<loc>')
  })

  test('GET /blog/feed.xml returns valid RSS', async ({ request }) => {
    const response = await request.get('/blog/feed.xml')

    expect(response.status()).toBe(200)
    expect(response.headers()['content-type']).toContain('xml')

    const body = await response.text()
    expect(body).toContain('<?xml')
    expect(body).toContain('<rss')
    expect(body).toContain('<channel')
    expect(body).toContain('<title>')
  })
})
