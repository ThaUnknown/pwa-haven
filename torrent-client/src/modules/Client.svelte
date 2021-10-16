<script>
  import WebTorrent from 'webtorrent'
  import HybridChunkStore from 'hybrid-chunk-store'
  import { del, set, createStore, entries } from 'idb-keyval'

  export let torrents = []
  export let current = 'All'

  $: updateTorrents(current)
  setInterval(updateTorrents, 200)
  function updateTorrents(filter = current) {
    switch (filter) {
      case 'Completed':
        torrents = client.torrents.filter(torrent => torrent.progress === 1)
        break
      case 'Downloading':
        torrents = client.torrents.filter(torrent => !(torrent.progress === 1))
        break
      case 'Seeding':
        torrents = client.torrents.filter(torrent => torrent.progress === 1 && torrent.uploadSpeed)
        break
      case 'Paused':
        torrents = client.torrents.filter(torrent => torrent.paused)
        break
      default:
        torrents = client.torrents
        break
    }
  }

  export const client = (globalThis.client = new WebTorrent())
  export function addTorrent(torrent, createTorrent) {
    if (client.get(torrent)) return null
    let tor
    if (createTorrent) {
      client.seed(torrent, Object.assign({ store: HybridChunkStore }, createTorrent), setTorrent)
      updateTorrents()
    } else {
      tor = client.add(torrent, { store: HybridChunkStore }, setTorrent)
      setTorrent(tor)
    }
    return tor
  }
  export function removeTorrent(torrent, opts, cb) {
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
  function setTorrent(torrent) {
    updateTorrents()
    if (torrent.infoHash) set(torrent.infoHash, torrent.torrentFile, idbStore)
  }

  window.addEventListener('beforeunload', client.destroy)
</script>
