<script>
  import { onMount } from 'svelte'

  import { setFile } from './server.js'
  import Peer from '../lib/peer.js'
  import './File.js'
  import Subtitles from './subtitles.js'
  import { toTS, videoRx, requestTimeout } from './util.js'

  $: updateFiles(files)
  export let files = []
  let src = null
  let video = null
  let container = null
  let current = null
  let subs = null
  let duration = 0.1
  let currentTime = 0
  let paused = true
  let muted = false
  let wasPaused = true
  let thumbnail = ' '
  let videos = []
  let immersed = false
  let buffering = false
  let immerseTimeout = null
  let bufferTimeout = null
  let subHeaders = null
  let pip = false
  let presentationRequest = null
  let presentationConnection = null
  let canCast = false
  $: progress = currentTime / duration
  $: targetTime = currentTime
  let volume = localStorage.getItem('volume') || 1
  $: localStorage.setItem('volume', volume)
  onMount(() => {
    video.fps = 23.976
  })

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

  function handleHeaders() {
    subHeaders = subs.headers
  }

  function updateFiles(files) {
    if (files && files.length) {
      if (subs) subs.destroy()
      videos = files.filter(file => videoRx.test(file.name))
      current = videos[0]
      setFile(current)
      subs = new Subtitles(video, files, current, handleHeaders)
      src = `player/${current.name}`
    }
  }

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
  function playNext() {
    current = files[(files.indexOf(current) + 1) % files.length]
  }
  function playLast() {
    const index = files.indexOf(current)
    current = files[index === 0 ? files.length - 1 : index - 1]
  }
  function toggleFullscreen() {
    document.fullscreenElement ? document.exitFullscreen() : container.requestFullscreen()
  }
  function seek(time) {
    if (time === 85 && currentTime < 10) {
      currentTime = 90
    } else if (time === 85 && duration - currentTime < 90) {
      currentTime = duration
    } else {
      currentTime += time
    }
  }
  function forward() {
    seek(2)
  }
  function rewind() {
    seek(-2)
  }
  function selectAudio(id) {
    if (id !== undefined) {
      for (const track of video.audioTracks) {
        track.enabled = track.id === id
      }
      seek(-0.5) // stupid fix because video freezes up when chaging tracks
    }
  }
  function toggleCast() {
    if (video.readyState) {
      if (presentationConnection) {
        presentationConnection?.terminate()
      } else {
        presentationRequest.start()
      }
    }
  }
  async function togglePopout() {
    if (video.readyState) {
      await video.fps
      if (!subs?.renderer) {
        video !== document.pictureInPictureElement ? video.requestPictureInPicture() : document.exitPictureInPicture()
        pip = !document.pictureInPictureElement
      } else {
        if (document.pictureInPictureElement && !document.pictureInPictureElement.id) {
          // only exit if pip is the custom one, else overwrite existing pip with custom
          document.exitPictureInPicture()
          pip = !!document.pictureInPictureElement
        } else {
          const canvasVideo = document.createElement('video')
          const { stream, destroy } = await getBurnIn()
          canvasVideo.srcObject = stream
          canvasVideo.onloadedmetadata = () => {
            canvasVideo.play()
            canvasVideo
              .requestPictureInPicture()
              .then(() => {
                pip = !!document.pictureInPictureElement
              })
              .catch(e => {
                pip = !!document.pictureInPictureElement
                console.warn('Failed To Burn In Subtitles ' + e)
                destroy()
                canvasVideo.remove()
              })
          }
          canvasVideo.onleavepictureinpicture = () => {
            destroy()
            canvasVideo.remove()
            pip = !!document.pictureInPictureElement
          }
        }
      }
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
      case 'p':
        togglePopout()
        break
      case 'f':
        toggleFullscreen()
        break
      case 's':
        seek(85)
        break
      case 'c':
        toggleCast()
        break
      case 'ArrowLeft':
        rewind()
        break
      case 'ArrowRight':
        forward()
        break
      case 'ArrowUp':
        volume = Math.min(1, volume + 0.05)
        break
      case 'ArrowDown':
        volume = Math.max(0, volume - 0.05)
        break
    }
  }

  async function getBurnIn(noSubs) {
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d', { alpha: false })
    let running = true
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    const renderFrame = async () => {
      if (running === true) {
        context.drawImage(video, 0, 0)
        if (!noSubs) context.drawImage(subs.renderer?.canvas, 0, 0, canvas.width, canvas.height)
        requestTimeout(renderFrame, 500 / (await video.fps)) // request x2 fps for smoothness
      }
    }
    requestAnimationFrame(renderFrame)
    const destroy = () => {
      running = false
      canvas.remove()
    }
    return { stream: canvas.captureStream(), destroy }
  }

  function initCast(event) {
    let peer = new Peer({ polite: true })

    presentationConnection = event.connection
    presentationConnection.addEventListener('terminate', () => {
      presentationConnection = null
      pip = false
      peer = null
    })

    peer.signalingPort.onmessage = ({ data }) => {
      presentationConnection.send(data)
    }

    presentationConnection.addEventListener('message', ({ data }) => {
      peer.signalingPort.postMessage(data)
    })

    peer.dc.onopen = async () => {
      await video.fps
      if (peer && presentationConnection) {
        pip = true
        const tracks = []
        const videostream = video.captureStream()
        if (true) {
          // TODO: check if cast supports codecs
          const { stream, destroy } = await getBurnIn(!subs?.renderer)
          tracks.push(stream.getVideoTracks()[0], videostream.getAudioTracks()[0])
          presentationConnection.addEventListener('terminate', destroy)
        } else {
          tracks.push(videostream.getVideoTracks()[0], videostream.getAudioTracks()[0])
        }
        for (const track of tracks) {
          peer.pc.addTrack(track, videostream)
        }
        paused = false // video pauses for some reason
      }
    }
  }

  function immersePlayer() {
    immersed = true
    immerseTimeout = undefined
  }

  function resetImmerse() {
    if (immerseTimeout) {
      clearTimeout(immerseTimeout)
    } else {
      immersed = false
    }
    immerseTimeout = setTimeout(immersePlayer, 5 * 1000)
  }

  function hideBuffering() {
    if (bufferTimeout) {
      clearTimeout(bufferTimeout)
      bufferTimeout = null
      buffering = false
    }
  }

  function showBuffering() {
    bufferTimeout = setTimeout(() => {
      buffering = true
      resetImmerse()
    }, 150)
  }

  function resolveFps() {
    if ('requestVideoFrameCallback' in HTMLVideoElement.prototype) {
      video.fps = new Promise(resolve => {
        const resolveFps = () => {
          video.removeEventListener('timeupdate', resolveFps)
          if (!paused) {
            setTimeout(
              () =>
                video.requestVideoFrameCallback((now, metaData) => {
                  let duration = 0
                  for (let index = video.played.length; index--; ) {
                    duration += video.played.end(index) - video.played.start(index)
                  }
                  const rawFPS = metaData.presentedFrames / duration
                  if (rawFPS < 28) {
                    resolve(23.976)
                  } else if (rawFPS <= 35) {
                    resolve(29.97)
                  } else if (rawFPS <= 70) {
                    resolve(59.94)
                  } else {
                    resolve(23.976) // smth went VERY wrong
                  }
                }),
              2000
            )
          }
        }
        video.addEventListener('timeupdate', resolveFps)
      })
    }
  }
</script>

<svelte:window on:keydown={handleKeydown} />

<!-- svelte-ignore a11y-media-has-caption -->
<div
  class="player"
  class:pip
  class:immersed
  class:buffering
  bind:this={container}
  on:mousemove={resetImmerse}
  on:touchmove={resetImmerse}
  on:keypress={resetImmerse}
  on:mouseleave={immersePlayer}>
  <video
    {src}
    bind:this={video}
    autoplay
    bind:volume
    bind:duration
    bind:currentTime
    bind:paused
    bind:muted
    on:waiting={showBuffering}
    on:loadeddata={hideBuffering}
    on:canplay={hideBuffering}
    on:playing={hideBuffering}
    on:timeupdate={hideBuffering}
    on:loadedmetadata={resolveFps} />
  <canvas class="d-none" />
  <!-- svelte-ignore a11y-missing-content -->
  <a href="#player" class="miniplayer" alt="miniplayer" />
  <div class="top" />
  <div class="middle">
    <div class="ctrl" data-name="ppToggle" on:click={playPause} on:dblclick={toggleFullscreen} />
    {#if videos?.length > 1}
      <span class="material-icons ctrl" data-name="playLast" on:click={playLast}> skip_previous </span>
    {/if}
    <span class="material-icons ctrl" data-name="rewind" on:click={rewind}> fast_rewind </span>
    <span class="material-icons ctrl" data-name="playPause" on:click={playPause}> {paused ? 'play_arrow' : 'pause'} </span>
    <span class="material-icons ctrl" data-name="forward" on:click={forward}> fast_forward </span>
    {#if videos?.length > 1}
      <span class="material-icons ctrl" data-name="playNext" on:click={playNext}> skip_next </span>
    {/if}
    <div data-name="bufferingDisplay" />
  </div>
  <div class="bottom">
    <span class="material-icons ctrl" title="Play/Pause [Space]" data-name="playPause" on:click={playPause}> {paused ? 'play_arrow' : 'pause'} </span>
    {#if videos?.length > 1}
      <span class="material-icons ctrl" title="Next [N]" data-name="playNext" on:click={playNext}> skip_next </span>
    {/if}
    <div class="volume">
      <span class="material-icons ctrl" title="Mute [M]" data-name="toggleMute" on:click={toggleMute}> {muted ? 'volume_off' : 'volume_up'} </span>
      <input class="ctrl" type="range" min="0" max="1" step="any" data-name="setVolume" bind:value={volume} style="--value: {volume * 100}%" />
    </div>
    <!-- svelte-ignore missing-declaration -->
    {#if 'audioTracks' in HTMLVideoElement.prototype && video?.audioTracks?.length > 1}
      <div class="audio-tracks dropdown dropup with-arrow">
        <span class="material-icons ctrl" title="Audio Tracks [T]" id="baudio" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false" data-name="audioButton">
          queue_music
        </span>
        <div class="dropdown-menu dropdown-menu-left ctrl custom-radio p-10 pb-5 text-capitalize" aria-labelledby="baudio" data-name="selectAudio">
          {#each video.audioTracks as track}
            <input name="audio-radio-set" type="radio" id="audio-{track.id}-radio" value={track.id} checked={track.enabled} />
            <label for="audio-{track.id}-radio" on:click={() => selectAudio(track.id)}>
              {(track.language || (!Object.values(video.audioTracks).some(track => track.language === 'eng' || track.language === 'en') ? 'eng' : track.label)) +
                (track.label ? ' - ' + track.label : '')}</label>
          {/each}
        </div>
      </div>
    {/if}
    <div class="ctrl" data-name="progressWrapper" data-elapsed="00:00" data-remaining="00:00">
      <div>
        <div class="ts">{toTS(targetTime)}</div>
        <input
          class="ctrl"
          type="range"
          min="0"
          max="1"
          step="any"
          data-name="setProgress"
          bind:value={progress}
          on:mousedown={handleMouseDown}
          on:mouseup={handleMouseUp}
          on:input={handleProgress}
          style="--value: {progress * 100}%" />
        <div class="ts">{toTS(duration)}</div>
        <img class="ctrl" data-elapsed="00:00" data-name="thumbnail" alt="thumbnail" src={thumbnail} />
      </div>
    </div>
    {#if subHeaders && subHeaders.length}
      <div class="subtitles dropdown dropup with-arrow">
        <span class="material-icons ctrl" title="Subtitles" id="bcap" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false" data-name="captionsButton">
          subtitles
        </span>
        <div class="dropdown-menu dropdown-menu-right ctrl custom-radio p-10 pb-5 text-capitalize" aria-labelledby="bcap" data-name="selectCaptions">
          {#each subHeaders as track}
            {#if track}
              <input name="subtitle-radio-set" type="radio" id="subtitle-{track.number}-radio" value={track.numer} checked={track.number === subs.current} />
              <label for="subtitle-{track.numer}-radio" on:click={() => subs.selectCaptions(track.number)}>
                {(track.language || (!Object.values(subs.headers).some(header => header.language === 'eng' || header.language === 'en') ? 'eng' : track.type)) +
                  (track.name ? ' - ' + track.name : '')}
              </label>
            {/if}
          {/each}
        </div>
      </div>
    {/if}
    {#if 'PresentationRequest' in window && canCast}
      <span class="material-icons ctrl" title="Cast Video [C]" data-name="toggleCast" on:click={toggleCast}> {presentationConnection ? 'cast_connected' : 'cast'} </span>
    {/if}
    {#if 'pictureInPictureEnabled' in document}
      <span class="material-icons ctrl" title="Popout Window [P]" data-name="togglePopout" on:click={togglePopout}> {pip ? 'featured_video' : 'picture_in_picture'} </span>
    {/if}
    <span class="material-icons ctrl" title="Fullscreen [F]" data-name="toggleFullscreen" on:click={toggleFullscreen}>
      {document.fullscreenElement ? 'fullscreen_exit' : 'fullscreen'}
    </span>
  </div>
</div>

<style>
  /* yes these are duplicates with framework */
  .player {
    position: absolute;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-content: center;
    color: #ececec;
    user-select: none;
    font-family: Roboto, Arial, Helvetica, sans-serif;
    z-index: 10;
    will-change: width, right, bottom, position, display;
    bottom: 2rem;
    right: 2rem;
    width: 25%;
    height: auto;
    transition: width 0.2s ease;
    overflow: hidden;
  }

  .player:not(.miniplayer) {
    bottom: 0;
    right: 0;
    position: relative;
    width: 100%;
    height: 100%;
    transition: none !important;
  }

  .player:not(.miniplayer) .middle,
  .player:not(.miniplayer) .bottom {
    display: flex;
  }

  video {
    position: relative;
    flex: 0 1 auto;
    z-index: -1;
    width: 100%;
    height: 100%;
    background: #191c209d;
    backdrop-filter: blur(10px);
  }

  .player:not(.miniplayer) video {
    position: absolute;
    background: none;
  }

  a.miniplayer {
    z-index: 5;
    position: absolute;
    width: 100%;
    height: 100%;
  }

  .pip {
    background: #000;
  }

  .pip canvas {
    left: 99.9% !important;
    /*hack to hide the canvas but still keep it updating*/
  }

  .material-icons {
    font-size: 2.2rem;
    padding: 1.2rem;
    transition: all 0.2s ease;
    display: flex;
  }

  .immersed {
    cursor: none;
  }

  .immersed .middle .ctrl,
  .immersed .bottom {
    opacity: 0;
  }

  .player:not(.miniplayer) a.miniplayer,
  .bottom img[src=' '],
  video[src='']:not([poster]),
  .player:fullscreen .ctrl[data-name='togglePopout'] {
    display: none !important;
  }

  .pip video {
    visibility: hidden;
  }

  .top {
    background: linear-gradient(to bottom, rgba(0, 0, 0, 0.8), rgba(0, 0, 0, 0.4) 25%, rgba(0, 0, 0, 0.2) 50%, rgba(0, 0, 0, 0.1) 75%, transparent);
    display: none;
    transition: 0.5s opacity ease;
    border-width: 0;
    border-top-width: 1px;
    border-image-slice: 1;
    border-style: solid;
    border-image-source: linear-gradient(90deg, #e5204c var(--download), rgba(0, 0, 0, 0.8) var(--download));
    grid-template-columns: 1fr auto 1fr;
  }
  .middle {
    height: 100%;
    flex: 1;
    display: none;
    flex-direction: row;
    position: relative;
    justify-content: center;
    align-items: center;
  }

  .middle div[data-name='bufferingDisplay'] {
    border: 4px solid #ffffff00;
    border-top: 4px solid #fff;
    border-radius: 50%;
    width: 40px;
    height: 40px;
    animation: spin 1s linear infinite;
    opacity: 0;
    transition: 0.5s opacity ease;
    position: absolute;
    filter: drop-shadow(0 0 8px #000);
  }

  .buffering .middle div[data-name='bufferingDisplay'] {
    opacity: 1 !important;
  }

  @keyframes spin {
    0% {
      transform: rotate(0deg);
    }

    100% {
      transform: rotate(360deg);
    }
  }

  .middle .ctrl[data-name='ppToggle'] {
    position: absolute;
    width: 100%;
    height: 100%;
    display: block;
    z-index: 2;
  }

  .middle .ctrl {
    font-size: 4rem;
    margin: 2rem;
    z-index: 3;
    display: none;
  }

  @media (pointer: none), (pointer: coarse) {
    .middle .ctrl {
      display: flex;
    }
  }

  .middle .ctrl[data-name='playPause'] {
    font-size: 6rem;
  }

  .middle .ctrl,
  .bottom .ctrl:hover {
    filter: drop-shadow(0 0 8px #000);
  }

  .bottom {
    background: linear-gradient(to top, rgba(0, 0, 0, 0.8), rgba(0, 0, 0, 0.4) 25%, rgba(0, 0, 0, 0.2) 50%, rgba(0, 0, 0, 0.1) 75%, transparent);
    display: none;
    transition: 0.5s opacity ease;
  }

  .bottom .ctrl {
    cursor: pointer;
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

  .bottom .volume {
    display: flex;
    width: auto;
  }

  .bottom .volume:hover input[type='range'] {
    width: 5vw;
    display: inline-block;
    transition: all 0.1s ease;
    margin-right: 1rem;
  }

  .bottom .volume input[type='range'] {
    width: 0;
    transition: all 0.1s ease;
    height: 100%;
  }

  .bottom input[type='range'][data-name='setProgress'],
  .bottom div[data-name='progressWrapper'],
  .bottom div[data-name='progressWrapper'] > div {
    display: flex;
    width: 100%;
    height: 100%;
    position: relative;
  }

  .bottom input[type='range'][data-name='setProgress'] ~ img,
  .bottom input[type='range'][data-name='setProgress']::before {
    pointer-events: none;
    opacity: 0;
    position: absolute;
    transform: translate(-50%, -100%);
    font-family: Roboto, Arial, Helvetica, sans-serif;
    white-space: nowrap;
    align-self: center;
    left: var(--progress);
    font-weight: 600;
    transition: 0.2s opacity ease;
  }

  .bottom input[type='range'][data-name='setProgress'] ~ img {
    top: -2rem;
    width: 150px;
  }

  .bottom input[type='range'][data-name='setProgress']::before {
    top: 0.5rem;
    content: attr(data-elapsed);
    color: #ececec;
  }

  .bottom input[type='range'][data-name='setProgress']:active ~ img,
  .bottom input[type='range'][data-name='setProgress']:active::before {
    opacity: 1;
  }

  .bottom div[data-name='progressWrapper'] .ts {
    color: #ececec;
    font-size: 1.8rem !important;
    white-space: nowrap;
    align-self: center;
    cursor: default;
    line-height: var(--base-line-height);
    padding: 0 1.2rem;
    font-weight: 600;
  }

  @media (pointer: none), (pointer: coarse) {
    .bottom .ctrl[data-name='playPause'],
    .bottom .ctrl[data-name='playNext'],
    .bottom .volume,
    .bottom .ctrl[data-name='togglePopout'],
    .bottom .ctrl[data-name='toggleFullscreen'] {
      display: none;
    }
  }
</style>
