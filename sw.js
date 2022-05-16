const cacheList = {
  shared: {
    version: '1.0.5',
    resources: [
      'https://cdn.jsdelivr.net/npm/halfmoon@1.1.1/css/halfmoon-variables.min.css',
      'https://cdn.jsdelivr.net/npm/halfmoon@1.1.1/js/halfmoon.min.js',
      'https://fonts.googleapis.com/icon?family=Material+Icons',
      'https://fonts.gstatic.com/s/materialicons/v114/flUhRq6tzZclQEJ-Vdg-IuiaDsNc.woff2'
    ]
  },
  'img-viewer': {
    version: '1.4.0',
    resources: [
      '../img-viewer/public/build/bundle.js',
      '../img-viewer/public/build/bundle.css',
      '../img-viewer/public/128.png',
      '../img-viewer/public/512.png',
      '../img-viewer/public/site.webmanifest',
      '../img-viewer/public/'
    ]
  },
  'audio-player': {
    version: '1.8.2',
    resources: [
      '../audio-player/public/build/bundle.js',
      '../audio-player/public/build/bundle.css',
      '../audio-player/public/128.png',
      '../audio-player/public/512.png',
      '../audio-player/public/build/cast.js',
      '../audio-player/public/build/cast.html',
      '../audio-player/public/site.webmanifest',
      '../audio-player/public/'
    ]
  },
  'video-player': {
    version: '1.13.8',
    resources: [
      'https://cdn.jsdelivr.net/npm/anitomyscript@2.0.4/dist/anitomyscript.bundle.min.js',
      'https://cdn.jsdelivr.net/npm/anitomyscript@2.0.4/dist/anitomyscript.wasm',
      '../video-player/public/lib/subtitles-octopus-worker.js',
      '../video-player/public/lib/subtitles-octopus-worker.wasm',
      '../video-player/public/lib/Roboto.ttf',
      '../video-player/public/build/bundle.js',
      '../video-player/public/build/bundle.css',
      '../video-player/public/build/cast.js',
      '../video-player/public/build/cast.html',
      '../video-player/public/128.png',
      '../video-player/public/512.png',
      '../video-player/public/site.webmanifest',
      '../video-player/public/'
    ]
  },
  'torrent-client': {
    version: '1.2.7',
    resources: [
      '../torrent-client/public/build/bundle.js',
      '../torrent-client/public/build/bundle.css',
      '../torrent-client/public/128.png',
      '../torrent-client/public/512.png',
      '../torrent-client/public/site.webmanifest',
      '../torrent-client/public/'
    ]
  },
  'screen-recorder': {
    version: '1.0.8',
    resources: [
      '../screen-recorder/public/build/bundle.js',
      '../screen-recorder/public/build/bundle.css',
      '../screen-recorder/public/128.png',
      '../screen-recorder/public/512.png',
      '../screen-recorder/public/site.webmanifest',
      '../screen-recorder/public/'
    ]
  },
  'manga-reader': {
    version: '1.3.1',
    resources: [
      '../manga-reader/public/site.webmanifest',
      '../manga-reader/public/128.png',
      '../manga-reader/public/512.png',
      '../manga-reader/public/',
      '../manga-reader/public/build/bundle.js',
      '../manga-reader/public/build/bundle.css'
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
  event.waitUntil((async () => {
    const keyList = await caches.keys()
    const tabs = await self.clients.matchAll({ type: 'window' })
    return Promise.all(keyList.map(async key => {
      if (key) { // dump all outdates caches on load
        const [name, version] = key.split(' v.')
        if (cacheList[name].version !== version) {
          caches.delete(key)
          const cache = await caches.open(name + ' v.' + cacheList[name].version)
          await cache.addAll(cacheList[name].resources)
          for (const tab of tabs) {
            if (tab.url.indexOf(location.origin + '/' + name) === 0) tab.navigate(tab.url)
          }
        }
      }
    }))
  })())
  self.clients.claim()
})

self.addEventListener('fetch', event => {
  let res = proxyResponse(event)
  if (!res) {
    res = (async () => {
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
    })()
  }
  event.respondWith(res)
})

const portTimeoutDuration = 5000
function proxyResponse (event) {
  const { url } = event.request
  if (!(url.includes(self.registration.scope) && url.includes('/server/')) || url.includes('?')) return null
  if (url.includes(self.registration.scope) && url.includes('/server/keepalive/')) return new Response()

  return serve(event)
}

async function serve ({ request }) {
  const { url, method, headers, destination } = request
  const clientlist = await clients.matchAll({ type: 'window', includeUncontrolled: true })

  const [data, port] = await new Promise(resolve => {
    // Use race condition for whoever controls the response stream
    for (const client of clientlist) {
      const messageChannel = new MessageChannel()
      const { port1, port2 } = messageChannel
      port1.onmessage = ({ data }) => {
        resolve([data, port1])
      }
      client.postMessage({
        url,
        method,
        headers: Object.fromEntries(headers.entries()),
        scope: self.registration.scope,
        destination,
        type: 'server'
      }, [port2])
    }
  })

  if (data.body !== 'STREAM' && data.body !== 'DOWNLOAD') return new Response(data.body, data)

  let timeOut = null
  return new Response(new ReadableStream({
    pull (controller) {
      return new Promise(resolve => {
        port.onmessage = ({ data }) => {
          if (data) {
            if (port.onmessage) controller.enqueue(data) // event.data is Uint8Array
          } else {
            clearTimeout(timeOut)
            controller.close() // event.data is null, means the stream ended
            port.onmessage = null
          }
          resolve()
        }

        // 'media player' does NOT signal a close on the stream and we cannot close it because it's locked to the reader,
        // so we just empty it after 5s of inactivity, the browser will request another port anyways
        clearTimeout(timeOut)
        if (data.body === 'STREAM') {
          timeOut = setTimeout(() => {
            controller.close()
            port.postMessage(false) // send timeout
            port.onmessage = null
            resolve()
          }, portTimeoutDuration)
        }

        port.postMessage(true) // send a pull request
      })
    },
    cancel () {
      clearTimeout(timeOut)
      port.postMessage(false) // send a cancel request
      port.onmessage = null
    }
  }), data)
}
