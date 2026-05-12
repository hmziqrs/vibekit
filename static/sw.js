// Service Worker for Push Notifications
self.addEventListener('push', (event) => {
  let data = { body: 'You have a new notification', icon: '/favicon.ico', title: 'Vibekit' }

  if (event.data) {
    try {
      data = event.data.json()
    } catch {
      data.body = event.data.text()
    }
  }

  const options = {
    body: data.body || '',
    data: data.data || {},
    icon: data.icon || '/favicon.ico',
    vibrate: [100, 50, 100],
  }

  event.waitUntil(self.registration.showNotification(data.title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const targetUrl = event.notification.data?.url || '/app/notifications'

  event.waitUntil(
    self.clients.matchAll({ includeUncontrolled: true, type: 'window' }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(targetUrl) && 'focus' in client) {
          return client.focus()
        }
      }
      return self.clients.openWindow(targetUrl)
    })
  )
})
