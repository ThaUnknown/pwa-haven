<script>
  import { toTS } from './util.js'
  import SongList from './SongList.svelte'
  import { createEventDispatcher } from 'svelte'
  import { parseBlob } from 'music-metadata-browser'
  import Peer from './peer.js'

  const dispatch = createEventDispatcher()
  export let name = ''
  let src = null
  let audio = null
  let volume = localStorage.getItem('volume') || 1
  $: localStorage.setItem('volume', volume)
  export let files = []
  $: updateFiles(files)
  $: progress = currentTime / duration
  $: targetTime = (!paused && currentTime) || targetTime
  let current = null
  $: setSource(current)
  let songs = []
  let duration = 0.1
  let currentTime = 0
  let paused = true
  let muted = false
  let loop = false
  let wasPaused = true
  let shuffle = false
  let cover = './512.png'
  let defaultCover = './512.png'
  $: navigator.mediaSession?.setPositionState({
    duration: duration || 0,
    playbackRate: 1,
    position: currentTime || 0
  })
  $: updateMedia(current, cover)
  function updateMedia(current, cover) {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: current?.name || 'Audio Player',
        artist: current?.artist || '',
        album: current?.album || '',
        artwork: [
          {
            src: cover,
            sizes: '256x256',
            type: 'image/jpg'
          }
        ]
      })
    }
  }

  if ('mediaSession' in navigator) {
    navigator.mediaSession.setActionHandler('play', playPause)
    navigator.mediaSession.setActionHandler('pause', playPause)
    navigator.mediaSession.setActionHandler('nexttrack', playNext)
    navigator.mediaSession.setActionHandler('previoustrack', playLast)
  }

  let presentationRequest = null
  let presentationConnection = null
  let presentationPort = null
  let canCast = false

  $: updateCastTime(currentTime)

  function updateCastTime(currentTime) {
    if (presentationPort?.readyState === 'open') {
      presentationPort.send(JSON.stringify({ current: currentTime }))
    }
  }

  if ('PresentationRequest' in window) {
    const handleAvailability = aval => {
      canCast = !!aval
    }
    presentationRequest = new PresentationRequest(['build/cast.html'])
    presentationRequest.addEventListener('connectionavailable', e => initCast(e))
    navigator.presentation.defaultRequest = presentationRequest
    presentationRequest.getAvailability().then(aval => {
      aval.onchange = e => handleAvailability(e.target.value)
      handleAvailability(aval.value)
    })
  }

  function toggleCast() {
    if (audio.readyState) {
      if (presentationConnection) {
        presentationConnection?.terminate()
      } else {
        presentationRequest.start()
      }
    }
  }
  let peer = null
  $: updateCastState(audio?.readyState && current)
  async function updateCastState(current) {
    if (current && presentationPort?.readyState === 'open') {
      const stream = audio.captureStream()
      peer.pc.addTrack(stream.getAudioTracks()[0], stream)
      paused = false // pauses for some reason
      presentationPort.send(
        JSON.stringify({
          duration: current.duration,
          current: currentTime,
          artist: current.artist,
          title: current.name
        })
      )
      if (current.cover) {
        const buffer = await current.cover.arrayBuffer()
        const array = new Uint8Array(buffer)
        for (let pos = 0; pos < array.length; pos += 16000) {
          const sliced = array.slice(pos, pos + 16000)
          presentationPort.send(sliced)
        }
        presentationPort.send(JSON.stringify({ ended: true }))
      }
    }
  }
  function initCast(event) {
    peer = new Peer({ polite: true })

    presentationConnection = event.connection
    presentationConnection.addEventListener('terminate', () => {
      presentationConnection = null
      peer = null
    })

    peer.signalingPort.onmessage = ({ data }) => {
      presentationConnection.send(data)
    }

    presentationConnection.addEventListener('message', ({ data }) => {
      peer.signalingPort.postMessage(data)
    })

    peer.dc.onopen = () => {
      presentationPort = peer.pc.createDataChannel('current', { negotiated: true, id: 2 })
      presentationConnection.addEventListener('terminate', () => presentationPort.close())
      presentationPort.onopen = () => updateCastState(current)
    }
  }

  async function updateFiles(files) {
    if (files.length) {
      const image = files.find(file => file.type.indexOf('image') === 0)
      const audio = files.filter(file => file.type.indexOf('audio') === 0)
      if (audio) {
        songs = []
        current = null
        src = null
        paused = true
      }
      const songDataPromises = audio.map(async file => {
        const { common, format } = await parseBlob(file)
        const name = common?.title || file.name.substring(0, file.name.lastIndexOf('.')) || file.name
        const artist = common?.artist
        const album = common?.album
        // note: this is utterly fucking retarded, the browser isn't capable of creating a object url from an image file blob in this case, but a data URI works!!!!! WHY?
        const cover = (common?.picture?.length && new Blob([common.picture[0].data], { type: common.picture[0].format })) || image
        const duration = format?.duration
        const number = common?.track?.no
        return { file, name, artist, album, cover, duration, number }
      })
      songs = (await Promise.all(songDataPromises)).sort((a, b) => (a.file.name > b.file.name ? 1 : b.file.name > a.file.name ? -1 : 0))
      current = songs[0]
    }
  }

  function setSource(song) {
    if (src) URL.revokeObjectURL(src)
    if (song) {
      src = song.file.url || URL.createObjectURL(song.file)
      name = song.name
      setCover(song.cover)
    } else {
      src = null
      name = ''
    }
  }
  function setCover(file) {
    if (cover) URL.revokeObjectURL(cover)
    if (file) {
      cover = file.url || URL.createObjectURL(file)
    } else {
      cover = defaultCover
    }
  }

  // todo use a store
  function handleMouseDown({ target }) {
    wasPaused = paused
    paused = true
    targetTime = target.value * duration
  }
  function handleMouseUp() {
    paused = wasPaused
    currentTime = targetTime
  }
  function handleProgress({ target }) {
    targetTime = target.value * duration
  }

  function playPause() {
    paused = !paused
  }
  function toggleMute() {
    muted = !muted
  }
  function toggleLoop() {
    loop = !loop
  }
  function playNext() {
    current = songs[(songs.indexOf(current) + 1) % songs.length]
  }
  function playLast() {
    const index = songs.indexOf(current)
    current = songs[index === 0 ? songs.length - 1 : index - 1]
  }
  function toggleShuffle() {
    shuffle = !shuffle
    if (shuffle) {
      songs = songs.sort(() => 0.5 - Math.random())
    } else {
      songs = songs.sort((a, b) => (a.file.name > b.file.name ? 1 : b.file.name > a.file.name ? -1 : 0))
    }
  }

  function handleKeydown({ key }) {
    switch (key) {
      case ' ':
        playPause()
        break
      case 'n':
        playNext()
        break
      case 'm':
        muted = !muted
        break
      case 'c':
        toggleCast()
        break
      case 'ArrowLeft':
        currentTime = Math.max(currentTime - 2, 0)
        break
      case 'ArrowRight':
        currentTime = Math.min(currentTime + 2, duration)
        break
      case 'ArrowUp':
        volume = Math.min(1, volume + 0.05)
        break
      case 'ArrowDown':
        volume = Math.max(0, volume - 0.05)
        break
    }
  }
</script>

<svelte:window on:keydown={handleKeydown} />

<!-- svelte-ignore a11y-media-has-caption -->
<audio
  {src}
  bind:this={audio}
  autoplay
  bind:volume
  bind:duration
  bind:currentTime
  bind:paused
  bind:muted
  {loop}
  on:ended={() => !loop && playNext()}
  on:loadedmetadata={updateCastState} />
<div class="content-wrapper row overflow-hidden">
  <div class="col-md-7 p-20 center h-half h-md-full bg-dark">
    <img src={cover} alt="cover" class="shadow-lg pointer" on:click={playPause} />
  </div>
  <SongList {songs} bind:current on:popup={() => dispatch('popup')} />
</div>
<nav class="navbar navbar-fixed-bottom p-0 d-flex flex-column border-0 shadow-lg bg-dark-light">
  <div class="d-flex w-full prog">
    <input
      class="w-full top-0"
      type="range"
      min="0"
      max="1"
      bind:value={progress}
      on:mousedown={handleMouseDown}
      on:mouseup={handleMouseUp}
      on:input={handleProgress}
      step="any"
      style="--value: {progress * 100}%" />
  </div>
  <div class="d-flex w-full flex-grow-1 px-20 justify-content-between">
    <div class="d-flex align-items-center">
      <span class="material-icons font-size-20 ctrl pointer" type="button" on:click={playLast}> skip_previous </span>
      <span class="material-icons font-size-24 ctrl pointer" type="button" on:click={playPause}>
        {paused ? 'play_arrow' : 'pause'}
      </span>
      <span class="material-icons font-size-20 ctrl pointer" type="button" on:click={playNext}> skip_next </span>
      <div class="text-muted center ml-10 text-nowrap">
        {toTS(targetTime, true)} / {toTS(duration, true)}
      </div>
    </div>
    <div class="center px-20 mw-0">
      <div class="text-truncate text-muted">{[current?.artist, current?.name].filter(c => c).join(' - ')}</div>
    </div>
    <div class="d-flex align-items-center">
      {#if 'PresentationRequest' in window && canCast}
        <span class="material-icons font-size-20 ctrl pointer" title="Cast Video [C]" data-name="toggleCast" on:click={toggleCast}>
          {presentationConnection ? 'cast_connected' : 'cast'}
        </span>
      {/if}
      <span class="material-icons font-size-20 ctrl pointer" type="button" on:click={toggleMute}>
        {muted ? 'volume_off' : 'volume_up'}
      </span>
      <input class="ml-auto px-5 h-half" type="range" min="0" max="1" bind:value={volume} step="any" style="--value: {volume * 100}%" />
      <span class="material-icons font-size-20 ctrl pointer" type="button" on:click={toggleLoop}>
        {loop ? 'repeat_one' : 'repeat'}
      </span>
      <span class="material-icons font-size-20 ctrl pointer" type="button" on:click={toggleShuffle}>
        {shuffle ? 'shuffle' : 'sort'}
      </span>
    </div>
  </div>
</nav>

<style>
  * {
    user-select: none;
  }
  img:not([src]) {
    display: none;
  }
  img {
    object-fit: contain;
    max-height: 100%;
    max-width: 100%;
  }
  input[type='range'] {
    -webkit-appearance: none;
    background: transparent;
    margin: 0;
    cursor: pointer;
    height: 8px;
  }

  input[type='range']:focus {
    outline: none;
  }

  input[type='range']::-webkit-slider-runnable-track {
    height: 3px;
  }

  input[type='range']::-webkit-slider-thumb {
    height: 0;
    width: 0;
    border-radius: 50%;
    background: #ff3c00;
    -webkit-appearance: none;
    appearance: none;
    transition: all 0.1s ease;
  }

  input[type='range']:hover::-webkit-slider-thumb {
    height: 12px;
    width: 12px;
    margin-top: -4px;
  }

  input[type='range'] {
    --volume: 0%;
  }

  input[type='range']::-webkit-slider-runnable-track {
    background: linear-gradient(90deg, #ff3c00 var(--value), rgba(255, 255, 255, 0.2) var(--value));
  }

  .pointer {
    cursor: pointer;
  }

  .ctrl {
    width: 3.5rem;
    height: 3.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .center {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .prog {
    position: relative;
    height: 0.2rem;
  }
  .prog input {
    position: absolute;
    margin-top: -0.7rem;
    height: 1.4rem;
  }
  .mw-0 {
    min-width: 0;
  }
</style>
