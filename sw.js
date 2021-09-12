const cacheList = {
  shared: {
    version: '1.0.0',
    resources: [
      'https://cdn.jsdelivr.net/npm/halfmoon@1.1.1/css/halfmoon-variables.min.css',
      'https://fonts.googleapis.com/icon?family=Material+Icons',
      'https://fonts.gstatic.com/s/materialicons/v98/flUhRq6tzZclQEJ-Vdg-IuiaDsNc.woff2',
      'https://cdn.jsdelivr.net/npm/halfmoon@1.1.1/js/halfmoon.min.js'
    ]
  },
  'img-viewer': {
    version: '1.0.0',
    resources: [
      '../img-viewer/public/build/bundle.js',
      '../img-viewer/public/build/bundle.js.map',
      '../img-viewer/public/build/bundle.css',
      '../img-viewer/public/favicon.png',
      '../img-viewer/public/'
    ]
  },
  'audio-player': {
    version: '1.0.0',
    resources: [

    ]
  }
}

self.addEventListener('install', event => {
  event.waitUntil( // always cache shared resources first
    caches.open('shared v.' + cacheList.shared.version).then(cache =>
      cache.addAll(cacheList.shared.resources)
    )
  )
  self.skipWaiting()
})

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keyList => {
      return Promise.all(keyList.map(key => {
        if (key) {
          const [name, version] = key.split(' v.')
          if (cacheList[name].version !== version) {
            return caches.delete(key)
          }
        }
        return null
      }))
    })
  )
  self.clients.claim()
})

self.addEventListener('fetch', event => {
  event.respondWith((async () => {
    const match = await caches.match(event.request)
    if (!match) { // not in cache
      const url = event.request.url
      if (url.indexOf(self.registration.scope) !== -1) { // in origin
        const path = url.slice(self.registration.scope.length)
        const app = path.slice(0, path.indexOf('/'))
        if (cacheList[app]) { // in cachelist
          const keys = await caches.keys()
          if (!keys.includes(app + ' v.' + cacheList[app].version)) { // cache doesnt exist
            console.log('cache not found, adding', event.request.url)
            const cache = await caches.open(app + ' v.' + cacheList[app].version)
            await cache.addAll(cacheList[app].resources)
          }
        }
      }
    }
    return match || fetch(event.request)
  })())
})
