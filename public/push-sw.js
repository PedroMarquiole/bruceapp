/* Notificações do Bruceapp: carregado pelo service worker gerado (Workbox). */
self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = { title: 'Bruceapp', body: event.data ? event.data.text() : '' }
  }
  const title = data.title || 'Bruceapp'
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || '',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: data.tag || 'bruceapp',
      data: { url: data.url || '/' },
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  // Só abre endereços do próprio app.
  let url = '/'
  try {
    const target = new URL((event.notification.data && event.notification.data.url) || '/', self.location.origin)
    if (target.origin === self.location.origin) url = target.pathname + target.search + target.hash
  } catch {
    url = '/'
  }
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ('focus' in client) {
          client.navigate(url)
          return client.focus()
        }
      }
      return self.clients.openWindow(url)
    }),
  )
})
