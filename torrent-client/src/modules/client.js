/* eslint-env browser */
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

export async function addTorrent (torrent, createTorrent) {
  if ((await client).get(torrent)) return null
  let tor
  if (createTorrent) {
    (await client).seed(torrent, Object.assign({
      storeCacheSlots: 0,
      store: HybridChunkStore,
      storeOpts: {
        rootDir: sets.folder
      }
    }, createTorrent), setTorrent)
    updateTorrents()
  } else {
    tor = (await client).add(torrent, {
      storeCacheSlots: 0,
      store: HybridChunkStore,
      storeOpts: {
        rootDir: sets.folder
      }
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
