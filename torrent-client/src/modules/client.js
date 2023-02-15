import WebTorrent from 'webtorrent'
import { writable } from 'svelte/store'
import HybridChunkStore from 'hybrid-chunk-store'
import { settings } from '../components/Settings.svelte'
import { del, set, createStore, entries } from 'idb-keyval'

let sets = {}
const client = new Promise(resolve => {
  const unsubscribe = settings.subscribe(settings => {
    sets = settings
    if (settings) {
      resolve(globalThis.client = new WebTorrent({
        maxConns: 127,
        downloadLimit: settings.speed * 1048576,
        uploadLimit: settings.speed * 1048576,
        tracker: {
          announce: settings.trackers.split('\n')
        }
      }))
      unsubscribe()
    }
  })
})
let workerKeepAliveInterval = null
let workerPortCount = 0
async function loadWorker (controller, cb = () => { }) {
  if (!(controller instanceof ServiceWorker)) throw new Error('Invalid worker registration')
  if (controller.state !== 'activated') throw new Error('Worker isn\'t activated')
  const keepAliveTime = 20000;
  (await client).serviceWorker = controller

  navigator.serviceWorker.addEventListener('message', async event => {
    const { data } = event
    if (!data.type || data.type !== 'server' || !data.url) return null
    let [infoHash, ...filePath] = data.url.slice(data.url.indexOf(data.scope + 'server/') + 7 + data.scope.length).split('/')
    filePath = decodeURI(filePath.join('/'))
    if (!infoHash || !filePath) return null

    const [port] = event.ports

    const file = (await client).get(infoHash) && (await client).get(infoHash).files.find(file => file.path === filePath)
    if (!file) return null

    const [response, stream, raw] = file._serve(data)
    const asyncIterator = stream && stream[Symbol.asyncIterator]()

    const cleanup = () => {
      port.onmessage = null
      if (stream) stream.destroy()
      if (raw) raw.destroy()
      workerPortCount--
      if (!workerPortCount) {
        clearInterval(workerKeepAliveInterval)
        workerKeepAliveInterval = null
      }
    }

    port.onmessage = async msg => {
      if (msg.data) {
        let chunk
        try {
          chunk = (await asyncIterator.next()).value
        } catch (e) {
          // chunk is yet to be downloaded or it somehow failed, should this be logged?
        }
        port.postMessage(chunk)
        if (!chunk) cleanup()
        if (!workerKeepAliveInterval) workerKeepAliveInterval = setInterval(() => fetch(`${controller.scriptURL.substr(0, controller.scriptURL.lastIndexOf('/') + 1).slice(window.location.origin.length)}server/keepalive/`), keepAliveTime)
      } else {
        cleanup()
      }
    }
    workerPortCount++
    port.postMessage(response)
  })
  cb(controller)
}

const worker = navigator.serviceWorker?.controller
const handleWorker = worker => {
  const checkState = async worker => {
    return worker.state === 'activated' && loadWorker(worker)
  }
  if (!checkState(worker)) {
    worker.addEventListener('statechange', ({ target }) => checkState(target))
  }
}
if (worker) {
  handleWorker(worker)
} else {
  navigator.serviceWorker.register('/sw.js').then(reg => {
    handleWorker(reg.active || reg.waiting || reg.installing)
  }).catch(e => {
    if (String(e) === 'InvalidStateError: Failed to register a ServiceWorker: The document is in an invalid state.') {
      location.reload() // weird workaround for a weird bug
    } else {
      throw e
    }
  })
}

export async function addTorrent (torrent, createTorrent) {
  if ((await client).get(torrent)) return null
  let tor
  if (createTorrent) {
    (await client).seed(torrent, Object.assign({
      storeCacheSlots: 0,
      store: HybridChunkStore,
      storeOpts: {
        rootDir: sets.folder
      },
      announce: [
        'wss://tracker.openwebtorrent.com',
        'wss://spacetradersapi-chatbox.herokuapp.com:443/announce',
        'wss://peertube.cpy.re:443/tracker/socket'
      ]
    }, createTorrent), setTorrent)
    updateTorrents()
  } else {
    tor = (await client).add(torrent, {
      storeCacheSlots: 0,
      store: HybridChunkStore,
      storeOpts: {
        rootDir: sets.folder
      },
      announce: [
        'wss://tracker.openwebtorrent.com',
        'wss://spacetradersapi-chatbox.herokuapp.com:443/announce',
        'wss://peertube.cpy.re:443/tracker/socket'
      ]
    }, setTorrent)
    setTorrent(tor)
  }
  return tor
}
export function removeTorrent (torrent, opts, cb) {
  if (torrent.infoHash) del(torrent.infoHash, idbStore)
  torrent.destroy(opts, cb)
}

const idbStore = createStore('torrent-client', 'torrent-data')
entries(idbStore).then(entries => {
  for (const [hash, buffer] of entries) {
    if (buffer) {
      addTorrent(new Blob([buffer]))
    } else {
      addTorrent(hash)
    }
  }
})

function setTorrent (torrent) {
  updateTorrents()
  if (torrent.infoHash) set(torrent.infoHash, torrent.torrentFile, idbStore)
}

export const torrents = writable([])
export const current = writable('All')
let last = 'All'

current.subscribe(value => {
  last = value
  updateTorrents(value)
})
setInterval(updateTorrents, 200)
export async function updateTorrents (filter = last) {
  switch (filter) {
    case 'Completed':
      torrents.set((await client).torrents.filter(torrent => torrent.progress === 1))
      break
    case 'Downloading':
      torrents.set((await client).torrents.filter(torrent => !(torrent.progress === 1)))
      break
    case 'Seeding':
      torrents.set((await client).torrents.filter(torrent => torrent.progress === 1 && torrent.uploadSpeed))
      break
    case 'Paused':
      torrents.set((await client).torrents.filter(torrent => torrent.paused))
      break
    default:
      torrents.set((await client).torrents)
      break
  }
}

window.addEventListener('beforeunload', async () => (await client).destroy())
