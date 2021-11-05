/* eslint-env serviceworker */
const cacheList = {
  shared: {
    version: '1.0.3',
    resources: [
      'https://cdn.jsdelivr.net/npm/halfmoon@1.1.1/css/halfmoon-variables.min.css',
      'https://cdn.jsdelivr.net/npm/halfmoon@1.1.1/js/halfmoon.min.js',
      'https://fonts.googleapis.com/icon?family=Material+Icons',
      'https://fonts.gstatic.com/s/materialicons/v103/flUhRq6tzZclQEJ-Vdg-IuiaDsNc.woff2'
    ]
  },
  'img-viewer': {
    version: '1.1.7',
    resources: [
      '../img-viewer/public/build/bundle.js',
      '../img-viewer/public/build/bundle.js.map',
      '../img-viewer/public/build/bundle.css',
      '../img-viewer/public/128.png',
      '../img-viewer/public/512.png',
      '../img-viewer/public/site.webmanifest',
      '../img-viewer/public/'
    ]
  },
  'audio-player': {
    version: '1.5.2',
    resources: [
      '../audio-player/public/build/bundle.js',
      '../audio-player/public/build/bundle.js.map',
      '../audio-player/public/build/bundle.css',
      '../audio-player/public/128.png',
      '../audio-player/public/512.png',
      '../audio-player/public/build/peer.js',
      '../audio-player/public/build/cast.html',
      '../audio-player/public/site.webmanifest',
      '../audio-player/public/'
    ]
  },
  'video-player': {
    version: '1.5.1',
    resources: [
      'https://cdn.jsdelivr.net/npm/anitomyscript@2.0.4/dist/anitomyscript.bundle.min.js',
      '../video-player/public/lib/subtitles-octopus-worker.js',
      '../video-player/public/lib/subtitles-octopus-worker.wasm',
      '../video-player/public/lib/Roboto.ttf',
      '../video-player/public/server-worker.js',
      '../video-player/public/build/bundle.js',
      '../video-player/public/build/bundle.js.map',
      '../video-player/public/build/bundle.css',
      '../video-player/public/build/halfmoon.css',
      '../video-player/public/build/peer.js',
      '../video-player/public/build/cast.html',
      '../video-player/public/128.png',
      '../video-player/public/512.png',
      '../video-player/public/site.webmanifest',
      '../video-player/public/'
    ]
  },
  'torrent-client': {
    version: '1.1.0',
    resources: [
      '../torrent-client/public/build/bundle.js',
      '../torrent-client/public/build/bundle.js.map',
      '../torrent-client/public/build/bundle.css',
      '../torrent-client/public/128.png',
      '../torrent-client/public/512.png',
      '../torrent-client/public/site.webmanifest',
      '../torrent-client/public/'
    ]
  },
  'screen-recorder': {
    version: '1.0.4',
    resources: [
      '../screen-recorder/public/build/bundle.js',
      '../screen-recorder/public/build/bundle.js.map',
      '../screen-recorder/public/build/bundle.css',
      '../screen-recorder/public/128.png',
      '../screen-recorder/public/512.png',
      '../screen-recorder/public/site.webmanifest',
      '../screen-recorder/public/'
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
        if (key) { // dump all outdates caches on load
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
    let match = await caches.match(event.request)
    if (!match) { // not in cache
      const url = event.request.url
      if (url.indexOf(self.registration.scope) !== -1) { // in origin
        const path = url.slice(self.registration.scope.length)
        const app = path.slice(0, path.indexOf('/'))
        if (cacheList[app]) { // in cachelist
          const keys = await caches.keys()
          if (!keys.includes(app + ' v.' + cacheList[app].version)) { // cache doesnt exist
            const cache = await caches.open(app + ' v.' + cacheList[app].version)
            await cache.addAll(cacheList[app].resources)
            match = await caches.match(event.request)
          }
        }
      }
    }
    return match || fetch(event.request)
  })())
})
