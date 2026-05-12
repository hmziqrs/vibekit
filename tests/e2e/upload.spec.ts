import { expect, test } from '@playwright/test'

test.describe('Upload Session API', () => {
  test('session creation requires authentication', async ({ request }) => {
    const res = await request.post('/api/uploads/session', {
      data: {
        chunkSize: 5 * 1024 * 1024,
        fileName: 'test.mp4',
        fileSize: 10 * 1024 * 1024,
        fileType: 'video/mp4',
      },
      headers: { 'Content-Type': 'application/json' },
    })
    expect(res.status()).toBe(401)
  })

  test('session list requires authentication', async ({ request }) => {
    const res = await request.get('/api/uploads/sessions')
    expect(res.status()).toBe(401)
  })
})
