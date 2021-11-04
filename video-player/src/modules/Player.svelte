<script>
  import { onMount } from 'svelte'
  import { setFile } from './server.js'
  import Peer from '../lib/peer.js'
  import './File.js'
  import Subtitles from './subtitles.js'
  import { toTS, videoRx, requestTimeout, cancelTimeout } from './util.js'
  import anitomyscript from 'anitomyscript'
  import { URLFile } from './File.js'

  $: updateFiles(files)
  export let files = []
  export let name = null
  let src = null
  let video = null
  let container = null
  let current = null
  let subs = null
  let duration = 0.1
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
  let isFullscreen = false
  let ended = false
  let volume = localStorage.getItem('volume') || 1
  $: localStorage.setItem('volume', volume)
  onMount(() => {
    if ('requestVideoFrameCallback' in HTMLVideoElement.prototype) {
      video.addEventListener('loadeddata', () => {
        video.fps = new Promise(resolve => {
          let lastmeta = null
          let waspaused = false
          let count = 0

          function handleFrames(now, metadata) {
            if (count) {
              // resolve on 2nd frame, 1st frame might be a cut-off
              if (lastmeta) {
                const msbf = (metadata.mediaTime - lastmeta.mediaTime) / (metadata.presentedFrames - lastmeta.presentedFrames)
                const rawFPS = (1 / msbf).toFixed(3)
                // this is accurate for mp4, mkv is a few ms off
                if (current.name.endsWith('.mkv')) {
                  if (rawFPS < 25 && rawFPS > 22) {
                    resolve(23.976)
                  } else if (rawFPS < 31 && rawFPS > 28) {
                    resolve(29.97)
                  } else if (rawFPS < 62 && rawFPS > 58) {
                    resolve(59.94)
                  } else {
                    resolve(rawFPS) // smth went VERY wrong
                  }
                } else {
                  resolve(rawFPS)
                }
                if (waspaused) paused = true
              } else {
                lastmeta = metadata
                video.requestVideoFrameCallback(handleFrames)
              }
            } else {
              count++
              if (paused) {
                waspaused = paused
                paused = false
              }
              video.requestVideoFrameCallback(handleFrames)
            }
          }
          video.requestVideoFrameCallback(handleFrames)
        })
      })
    } else {
      video.fps = 23.976
    }
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

  //document.fullscreenElement isn't reactive
  document.addEventListener('fullscreenchange', () => {
    isFullscreen = !!document.fullscreenElement
  })

  function handleHeaders() {
    subHeaders = subs?.headers
  }

  function updateFiles(files) {
    if (files && files.length) {
      videos = files.filter(file => videoRx.test(file.name))
      if (videos?.length) {
        if (!current) {
          handleCurrent(videos[0])
        } else {
          subs.files = files || []
          subs.findSubtitleFiles(current)
        }
      }
    }
  }

  async function handleCurrent(file) {
    if (file) {
      URL.revokeObjectURL(current?.name) // eh just in case
      if (file instanceof File) {
        if (file.name.endsWith('.mkv')) {
          setFile(file)
          src = `player/${file.name}`
        } else {
          setFile(null)
          src = URL.createObjectURL(file)
        }
        current = file
      } else {
        await new Promise((resolve, reject) => {
          if (!file.name.endsWith('.mkv')) return reject()
          // check if the media can be fetched [CORS, origin, token etc]
          fetch(file.url, { method: 'HEAD' })
            .then(res => {
              if (!res.ok) {
                reject()
              } else {
                resolve()
              }
            })
            .catch(reject)
        })
          .then(async () => {
            const urlfile = new URLFile(file)
            await urlfile.ready
            setFile(urlfile)
            src = `player/${urlfile.name}`
            current = urlfile
          })
          .catch(() => {
            setFile(null)
            src = file.url
            current = file
          })
      }
    }
  }
  $: initSubs(current)

  function initSubs(current) {
    if (current) {
      if (subs) subs.destroy()
      subs = new Subtitles(video, files, current, handleHeaders)
    }
  }

  let subDelay = 0
  $: updateDelay(subDelay)
  function updateDelay(delay) {
    if (subs?.renderer) subs.renderer.timeOffset = delay
  }

  let currentTime = 0
  $: progress = currentTime / duration
  $: targetTime = (!paused && currentTime) || targetTime
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
    handleCurrent(videos[(videos.indexOf(current) + 1) % videos.length])
  }
  function playLast() {
    const index = videos.indexOf(current)
    handleCurrent(videos[index === 0 ? videos.length - 1 : index - 1])
  }
  function toggleFullscreen() {
    document.fullscreenElement ? document.exitFullscreen() : container.requestFullscreen()
  }
  function seek(time) {
    if (time === 85 && currentTime < 10) {
      targetTime = currentTime = 90
    } else if (time === 85 && duration - currentTime < 90) {
      targetTime = currentTime = duration
    } else {
      targetTime = currentTime += time
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
    const context = canvas.getContext('2d', { alpha: false, colorSpace: 'display-p3' })
    let loop = null
    let destroy = null
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    if ('requestVideoFrameCallback' in HTMLVideoElement.prototype) {
      const renderFrame = async () => {
        context.drawImage(video, 0, 0)
        if (!noSubs) context.drawImage(subs.renderer?.canvas, 0, 0, canvas.width, canvas.height)
        loop = video.requestVideoFrameCallback(renderFrame)
      }
      loop = video.requestVideoFrameCallback(renderFrame)
      destroy = () => {
        video.cancelVideoFrameCallback(loop)
        canvas.remove()
      }
    } else {
      // for the firefox idiots
      const fps = await video.fps
      const renderFrame = async () => {
        context.drawImage(video, 0, 0)
        if (!noSubs) context.drawImage(subs.renderer?.canvas, 0, 0, canvas.width, canvas.height)
        loop = requestTimeout(renderFrame, 500 / fps) // request x2 fps for smoothness
      }
      loop = requestAnimationFrame(renderFrame)
      destroy = () => {
        cancelTimeout(loop)
        canvas.remove()
      }
    }
    return { stream: canvas.captureStream(await video.fps), destroy }
  }

  function initCast(event) {
    // these quality settings are likely to make cast overheat, oh noes!
    let peer = new Peer({
      polite: true,
      quality: {
        audio: {
          stereo: 1,
          'sprop-stereo': 1,
          maxaveragebitrate: 510000,
          maxplaybackrate: 510000,
          cbr: 0,
          useinbandfec: 1,
          usedtx: 1,
          maxptime: 20,
          minptime: 10
        },
        video: {
          bitrate: 2000000,
          codecs: ['VP9', 'VP8', 'H264']
        }
      }
    })

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
      if (peer && presentationConnection) {
        pip = true
        const tracks = []
        const videostream = video.captureStream(await video.fps)
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
  $: navigator.mediaSession?.setPositionState({
    duration: Math.max(0, duration || 0),
    playbackRate: 1,
    position: Math.max(0, currentTime || 0)
  })
  async function mediaChange(current) {
    if (current) {
      const { release_group, anime_title, episode_number } = await anitomyscript(current.name)
      // honestly, this is made for anime, but works fantastic for everything else.
      name = [anime_title, episode_number].filter(i => i).join(' - ')
      if ('mediaSession' in navigator) {
        const metadata = new MediaMetadata({
          title: name || 'Video Player'
          // artwork: [
          //   {
          //     src: null,
          //     sizes: '256x256',
          //     type: 'image/jpg'
          //   }
          // ]
        })
        if (release_group) metadata.artist = release_group
        navigator.mediaSession.metadata = metadata
      }
    }
  }
  $: mediaChange(current)

  if ('mediaSession' in navigator) {
    navigator.mediaSession.setActionHandler('play', playPause)
    navigator.mediaSession.setActionHandler('pause', playPause)
    navigator.mediaSession.setActionHandler('nexttrack', playNext)
    navigator.mediaSession.setActionHandler('previoustrack', playLast)
    navigator.mediaSession.setActionHandler('seekforward', forward)
    navigator.mediaSession.setActionHandler('seekbackward', rewind)
  }
  let stats = null
  let requestCallback = null
  function toggleStats() {
    if ('requestVideoFrameCallback' in HTMLVideoElement.prototype) {
      if (requestCallback) {
        stats = null
        video.cancelVideoFrameCallback(requestCallback)
        requestCallback = null
      } else {
        requestCallback = video.requestVideoFrameCallback((a, b) => {
          stats = {}
          handleStats(a, b)
        })
      }
    }
  }
  async function handleStats(now, metadata) {
    if (stats) {
      stats = {
        fps: await video.fps,
        presented: metadata.presentedFrames,
        processing: metadata.processingDuration + ' ms',
        viewport: video.clientWidth + 'x' + video.clientHeight,
        resolution: video.videoWidth + 'x' + video.videoHeight,
        buffer: getBufferHealth(metadata.mediaTime) + ' s'
      }
      setTimeout(() => video.requestVideoFrameCallback(handleStats), 200)
    }
  }
  function getBufferHealth(time) {
    for (let index = video.buffered.length; index--; ) {
      if (time < video.buffered.end(index) && time > video.buffered.start(index)) {
        return parseInt(video.buffered.end(index) - time)
      }
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
  on:mouseleave={immersePlayer}
  on:contextmenu|preventDefault={toggleStats}>
  <video
    {src}
    bind:this={video}
    autoplay
    bind:volume
    bind:duration
    bind:currentTime
    bind:paused
    bind:ended
    bind:muted
    on:waiting={showBuffering}
    on:loadeddata={hideBuffering}
    on:canplay={hideBuffering}
    on:playing={hideBuffering}
    on:loadedmetadata={hideBuffering} />
  <!-- svelte-ignore a11y-missing-content -->
  {#if stats}
    <div class="position-absolute top-0 bg-very-dark p-5">
      FPS: {stats.fps}<br />
      Presented frames: {stats.presented}<br />
      Frame time: {stats.processing}<br />
      Viewport: {stats.viewport}<br />
      Resolution: {stats.resolution}<br />
      Buffer health: {stats.buffer}
    </div>
  {/if}
  <div class="top z-50" />
  <div class="middle z-50">
    <div class="ctrl" data-name="ppToggle" on:click={playPause} on:dblclick={toggleFullscreen} />
    {#if videos?.length > 1}
      <span class="material-icons ctrl" data-name="playLast" on:click={playLast}> skip_previous </span>
    {/if}
    <span class="material-icons ctrl" data-name="rewind" on:click={rewind}> fast_rewind </span>
    <span class="material-icons ctrl" data-name="playPause" on:click={playPause}> {ended ? 'replay' : paused ? 'play_arrow' : 'pause'} </span>
    <span class="material-icons ctrl" data-name="forward" on:click={forward}> fast_forward </span>
    {#if videos?.length > 1}
      <span class="material-icons ctrl" data-name="playNext" on:click={playNext}> skip_next </span>
    {/if}
    <div data-name="bufferingDisplay" />
  </div>
  <div class="bottom z-50">
    <span class="material-icons ctrl" title="Play/Pause [Space]" data-name="playPause" on:click={playPause}> {ended ? 'replay' : paused ? 'play_arrow' : 'pause'} </span>
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
    {#if subHeaders?.length}
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
          <input type="number" step="0.1" bind:value={subDelay} class="form-control text-right form-control-sm" />
        </div>
      </div>
    {/if}
    {#if 'PresentationRequest' in window && canCast}
      <span class="material-icons ctrl" title="Cast Video [C]" data-name="toggleCast" on:click={toggleCast}>
        {presentationConnection ? 'cast_connected' : 'cast'}
      </span>
    {/if}
    {#if 'pictureInPictureEnabled' in document}
      <span class="material-icons ctrl" title="Popout Window [P]" data-name="togglePopout" on:click={togglePopout}>
        {pip ? 'featured_video' : 'picture_in_picture'}
      </span>
    {/if}
    <span class="material-icons ctrl" title="Fullscreen [F]" data-name="toggleFullscreen" on:click={toggleFullscreen}>
      {isFullscreen ? 'fullscreen_exit' : 'fullscreen'}
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
    background: #000;
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

  .pip {
    background: #000;
  }

  .pip :global(canvas) {
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

  .bottom img[src=' '],
  video[src='']:not([poster]),
  :fullscreen .ctrl[data-name='toggleCast'],
  :fullscreen .ctrl[data-name='togglePopout'] {
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
    .bottom .ctrl[data-name='toggleFullscreen'] {
      display: none;
    }
  }

  ::-webkit-inner-spin-button {
    opacity: 1;
    margin-left: 0.4rem;
    margin-right: -0.5rem;
    filter: invert(0.84);
    padding-top: 2rem;
  }
</style>
