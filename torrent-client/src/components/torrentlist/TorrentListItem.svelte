<script>
  import { onDestroy, afterUpdate } from 'svelte'
  import { updateTorrents, removeTorrent } from '../../modules/client.js'
  import { fastPrettyBytes, fastToTS } from '../../modules/util.js'
  export let torrent = null
  export let selected = null

  let status

  function getTorrentStatus() {
    if (torrent.destroyed) return 'destroyed'
    if (torrent.paused) return 'paused'
    if (torrent.progress === 1) {
      if (torrent.uploadSpeed === 0) return 'completed'
      return 'seeding'
    }
    if (torrent.infoHash && torrent.timeRemaining !== Infinity) return 'downloading'
    return 'syncing'
  }
  function updateStatus(skip) {
    status = getTorrentStatus()
    if (!skip) updateTorrents()
  }
  let progress = 0
  function updateProgress() {
    progress = torrent.progress.toFixed(5)
  }
  torrent.once('metadata', updateStatus)
  torrent.once('done', updateStatus)
  torrent.on('download', updateProgress)
  updateStatus()
  updateProgress()
  afterUpdate(() => {
    updateStatus(true)
    updateProgress()
  })
  onDestroy(() => {
    torrent.removeListener('done', updateStatus)
    torrent.removeListener('metadata', updateStatus)
    torrent.removeListener('download', updateProgress)
  })

  function select() {
    selected = torrent
  }
  function handlePauseResume() {
    if (torrent.paused) {
      torrent.resume()
    } else {
      torrent.pause()
    }
    updateStatus()
  }
  function handleRemove() {
    removeTorrent(torrent, () => {
      updateTorrents()
      if (selected === torrent) selected = null
    })
    updateStatus()
  }

  function handleDelete() {
    removeTorrent(torrent, { destroyStore: true }, () => {
      updateTorrents()
      if (selected === torrent) selected = null
    })
    updateStatus()
  }
  function copyMagnet() {
    navigator.clipboard.writeText(torrent.magnetURI)
  }
  function saveTorrent() {
    const file = new Blob(torrent.torrentFile, { type: 'application/x-bittorrent' })
    const a = document.createElement('a')
    const url = URL.createObjectURL(file)
    a.href = url
    a.download = (torrent.name || torrent.infohash) + '.torrent'
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }
</script>

<tr>
  <th>1</th>
  <td>{torrent.name}</td>
  <td class="text-capitalize">{status}</td>
  <td>{parseInt(progress * 100)}%</td>
  <td>{fastPrettyBytes(torrent.length)}</td>
  <td>{torrent.files.length}</td>
  <td>{torrent.numPeers}</td>
  <td>{fastPrettyBytes(torrent.downloadSpeed)}</td>
  <td>{fastPrettyBytes(torrent.uploadSpeed)}</td>
  <td>{fastToTS(parseInt(torrent.timeRemaining / 1000))}</td>
  <td>{torrent.ratio.toFixed(2) || 0}</td>
  <td class="d-flex flex-row align-items-center">
    <span class="material-icons font-size-20" on:click={handlePauseResume}>
      {torrent.paused ? 'play_arrow' : 'pause'}
    </span>
    <span class="material-icons font-size-20" on:click={handleRemove}>remove</span>
    <span class="material-icons font-size-20" on:click={handleDelete}>delete</span>
    <span class="material-icons font-size-20" on:click={copyMagnet}>content_copy</span>
    <span class="material-icons font-size-20" on:click={saveTorrent}>file_copy</span>
    <span class="material-icons font-size-20" on:click={select}>info</span>
  </td>
</tr>

<style>
  th,
  td {
    padding: 0.8rem 1rem;
  }
</style>
