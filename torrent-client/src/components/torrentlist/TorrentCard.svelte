<script>
  import { updateTorrents, removeTorrent } from '../../modules/client.js'
  import { onDestroy, afterUpdate } from 'svelte'
  import { fastPrettyBytes, fastToTS } from '../../modules/util.js'

  export let torrent = null
  export let selected = null

  function select () {
    selected = torrent
  }
  function handlePauseResume () {
    if (torrent.paused) {
      torrent.resume()
    } else {
      torrent.pause()
    }
    updateStatus()
  }
  function handleRemove () {
    removeTorrent(torrent, () => {
      updateTorrents()
      if (selected === torrent) selected = null
    })
    updateStatus()
  }

  function handleDelete () {
    removeTorrent(torrent, { destroyStore: true }, () => {
      updateTorrents()
      if (selected === torrent) selected = null
    })
    updateStatus()
  }

  let status, progressColor, statusColor, statusIcon
  function updateStatus (skip) {
    status = getTorrentStatus()
    progressColor = colorMap[status]
    statusIcon = statusIconMap[status]
    statusColor = colorMap[status]
    if (!skip) updateTorrents()
  }
  function copyMagnet () {
    navigator.clipboard.writeText(torrent.magnetURI)
  }
  function saveTorrent () {
    const file = new Blob(torrent.torrentFile, { type: 'application/x-bittorrent' })
    const a = document.createElement('a')
    const url = URL.createObjectURL(file)
    a.href = url
    a.download = (torrent.name || torrent.infohash) + '.torrent'
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  const statusIconMap = {
    destroyed: 'delete',
    paused: 'pause',
    completed: 'done',
    seeding: 'arrow_upward',
    downloading: 'arrow_downward',
    syncing: 'sync'
  }
  const colorMap = {
    destroyed: 'danger',
    paused: 'secondary',
    completed: 'success',
    seeding: 'success',
    downloading: 'primary',
    syncing: 'muted'
  }

  function getTorrentStatus () {
    if (torrent.destroyed) return 'destroyed'
    if (torrent.paused) return 'paused'
    if (torrent.progress === 1) {
      if (torrent.uploadSpeed === 0) return 'completed'
      return 'seeding'
    }
    if (torrent.infoHash && torrent.timeRemaining !== Infinity) return 'downloading'
    return 'syncing'
  }

  let progress = 0
  function updateProgress () {
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
</script>

<div class="card bg-dark-dm bg-white-lm position-relative">
  <h2 class="card-title font-weight-bold d-flex flex-row justify-content-between">
    <div class="text-truncate">
      {torrent.name || torrent.infoHash || 'Torrent'}
    </div>
    <div class="dropdown toggle-on-hover">
      <button
        class={'btn btn-square btn-link material-icons shadow-none text-' + statusColor}
        data-toggle="dropdown"
        type="button"
        id={'more-' + torrent.infoHash}
        aria-haspopup="true"
        aria-expanded="false">
        more_horiz
      </button>
      <div class="dropdown-menu dropdown-menu-right bg-dark-dm bg-white-lm font-weight-normal pointer font-size-12" aria-labelledby={'more-' + torrent.infoHash}>
        <span class="px-10 sidebar-link sidebar-link-with-icon" on:click={handlePauseResume}>
          <span class="sidebar-icon bg-transparent justify-content-start mr-0">
            <span class="material-icons font-size-16">
              {torrent.paused ? 'play_arrow' : 'pause'}
            </span>
          </span>
          {torrent.paused ? 'Resume' : 'Pause'}
        </span>
        <span class="px-10 sidebar-link sidebar-link-with-icon" on:click={handleRemove}>
          <span class="sidebar-icon bg-transparent justify-content-start mr-0">
            <span class="material-icons font-size-16">remove</span>
          </span>
          Remove
        </span>
        <span class="px-10 sidebar-link sidebar-link-with-icon" on:click={handleDelete}>
          <span class="sidebar-icon bg-transparent justify-content-start mr-0">
            <span class="material-icons font-size-16">delete</span>
          </span>
          Remove With Files
        </span>
        <span class="px-10 sidebar-link sidebar-link-with-icon" on:click={copyMagnet}>
          <span class="sidebar-icon bg-transparent justify-content-start mr-0">
            <span class="material-icons font-size-16">content_copy</span>
          </span>
          Copy Magnet Link
        </span>
        <span class="px-10 sidebar-link sidebar-link-with-icon" on:click={saveTorrent}>
          <span class="sidebar-icon bg-transparent justify-content-start mr-0">
            <span class="material-icons font-size-16">file_copy</span>
          </span>
          Save Torrent File
        </span>
        <span class="px-10 sidebar-link sidebar-link-with-icon" on:click={select}>
          <span class="sidebar-icon bg-transparent justify-content-start mr-0">
            <span class="material-icons font-size-16">info</span>
          </span>
          More Information
        </span>
      </div>
    </div>
  </h2>
  <div class="d-flex flex-row align-items-center flex-wrap torrent-stats font-size-12">
    <div class={'material-icons pr-5 text-' + statusColor}>
      {statusIcon}
    </div>
    <span class="text-muted">
      {parseInt(progress * 100)}%
    </span>
    {#if torrent.length}
      {#if torrent.progress === 1}
        <span class="text-muted">
          {fastPrettyBytes(torrent.length)}
        </span>
      {:else}
        <span class="text-muted">
          {fastPrettyBytes(torrent.received)} of {fastPrettyBytes(torrent.length)}
        </span>
      {/if}
    {/if}
    {#if status === 'seeding' && torrent.uploadSpeed}
      <span class="text-muted">
        {fastPrettyBytes(torrent.uploadSpeed)}/s
      </span>
    {:else if (status === 'downloading' || status === 'paused') && torrent.downloadSpeed}
      <span class="text-muted">
        {fastPrettyBytes(torrent.downloadSpeed)}/s
      </span>
    {/if}
    {#if torrent.numPeers}
      <span class="text-muted">
        {torrent.numPeers} Peer{torrent.numPeers === 1 ? '' : 's'}
      </span>
    {/if}
    {#if !(torrent.progress === 1) && torrent.timeRemaining !== Infinity}
      <span class="text-muted">
        {fastToTS(parseInt(torrent.timeRemaining / 1000))} remaining
      </span>
    {/if}
  </div>
  <div class={'bg-' + progressColor + ' position-absolute bottom-0 left-0'} style={`width: ${progress * 100}%; height: 1px`} />
</div>

<style>
  .torrent-stats span + span::before {
    content: '•';
    padding: 0 1rem;
  }
</style>
