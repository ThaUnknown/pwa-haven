const version = 'v0.1.0'

self.addEventListener('install', event => { // TODO cache dynamically
  event.waitUntil((async () => {
    const cache = await caches.open(version)
    return await cache.addAll([
      'https://cdn.jsdelivr.net/npm/halfmoon@1.1.1/js/halfmoon.min.js',
      '../img-viewer/public/build/bundle.js',
      '../img-viewer/public/build/bundle.js.map',
      '../img-viewer/public/build/bundle.css',
      '../img-viewer/public/favicon.png',
      'https://cdn.jsdelivr.net/npm/halfmoon@1.1.1/css/halfmoon-variables.min.css',
      'https://fonts.googleapis.com/icon?family=Material+Icons',
      'https://fonts.gstatic.com/s/materialicons/v98/flUhRq6tzZclQEJ-Vdg-IuiaDsNc.woff2',
      '../img-viewer/public/index.html'
    ])
  })())
})

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    if ('navigationPreload' in self.registration) {
      await self.registration.navigationPreload.enable()
    }
    await caches.keys().then((keyList) => {
      return Promise.all(keyList.map((key) => {
        if (version !== key) {
          return caches.delete(key)
        }
        return null
      }))
    })
  })()
  )
  self.clients.claim()
})

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then((resp) => {
      return resp || fetch(event.request)
    })
  )
})

self.addEventListener('fetch', event => {
  if (event.request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const preloadResponse = await event.preloadResponse
        if (preloadResponse) {
          return preloadResponse
        }
        return await caches.match(event.request).then((resp) => {
          return resp || fetch(event.request)
        })
      } catch (error) {
        const cache = await caches.open(version)
        const cachedResponse = await cache.match('index.html') // TODO respond with desired app
        return cachedResponse
      }
    })())
  }
})
