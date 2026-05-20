// Service worker deactivated — unregisters itself immediately
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', () => {
  self.clients.matchAll({ includeUncontrolled: true }).then(clients =>
    clients.forEach(c => c.postMessage({ type: 'SW_DISABLED' }))
  )
  return self.clients.claim()
})
