/* Supplemental push handlers loaded by the generated Workbox service worker. */
self.addEventListener('push', event => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (_) {
    payload = { title: 'Anba Mousa', body: event.data ? event.data.text() : '' };
  }
  const title = payload.title || 'Anba Mousa';
  const options = {
    body: payload.body || '',
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    tag: payload.tag || payload.notificationId || 'anba-mousa-update',
    renotify: false,
    data: { url: payload.url || (payload.actionTab ? '/?tab=' + encodeURIComponent(payload.actionTab) : '/') },
    dir: payload.dir === 'rtl' ? 'rtl' : 'auto',
    lang: payload.lang || 'en'
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || '/', self.location.origin).href;
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of windows) {
      if ('focus' in client) {
        await client.focus();
        if ('navigate' in client) await client.navigate(target);
        return;
      }
    }
    if (self.clients.openWindow) await self.clients.openWindow(target);
  })());
});
