<script>
  import { tick } from 'svelte'
  import { click } from './click.js'
  import { setFile, speed } from './server.js'
  import './File.js'
  import Subtitles from './subtitles.js'
  import { toTS, videoRx } from '../../../shared/util.js'
  import anitomyscript from 'anitomyscript'
  import { URLFile } from '../../../shared/URLFile.js'
  import Keybinds, { loadWithDefaults } from 'svelte-keybinds'
  import TrackControls from './player/TrackControls.svelte'
  import CastControls from './player/CastControls.svelte'
  import PopoutControls from './player/PopoutControls.svelte'
  import SeekControls from './player/SeekControls.svelte'
  import Stats from './player/Stats.svelte'

  export let files = []
  $: updateFiles(files)
  export let name = null
  let src = null
  let video = null
  let container = null
  let current = null
  let subs = null
  let duration = 0.1
  let paused = true
  let muted = false
  let videos = []
  let immersed = false
  let buffering = false
  let immerseTimeout = null
  let bufferTimeout = null
  let subHeaders = null
  let pip = false
  let isFullscreen = false
  let ended = false
  let volume = localStorage.getItem('volume') || 1
  let playbackRate = 1
  let currentTime = 0
  export let miniplayer = false
  $: safeduration = (isFinite(duration) ? duration : currentTime) || 0
  $: localStorage.setItem('volume', volume || 0)
  function getFPS () {
    video.fps = new Promise(resolve => {
      let lastmeta = null
      let count = 0

      function handleFrames (now, metadata) {
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
          } else {
            lastmeta = metadata
            video.requestVideoFrameCallback(handleFrames)
          }
        } else {
          count++
          video.requestVideoFrameCallback(handleFrames)
        }
      }
      video.requestVideoFrameCallback(handleFrames)
      playFrame()
    })
  }

  // plays one frame
  function playFrame () {
    let wasPaused = false
    video.requestVideoFrameCallback(() => {
      if (wasPaused) paused = true
    })
    if (paused) {
      wasPaused = true
      paused = false
    }
  }

  // document.fullscreenElement isn't reactive
  document.addEventListener('fullscreenchange', () => {
    isFullscreen = !!document.fullscreenElement
  })

  function handleHeaders () {
    subHeaders = subs?.headers
  }

  function updateFiles (files) {
    if (files?.length) {
      videos = files.filter(file => videoRx.test(file.name))
      if (videos?.length) {
        if (!current) {
          handleCurrent(videos[0])
        } else {
          if (subs) {
            subs.files = files || []
            subs.findSubtitleFiles(current)
          }
        }
      } else {
        src = ''
        video?.load()
        currentTime = 0
        targetTime = 0
      }
    }
  }

  async function handleCurrent (file) {
    if (file) {
      current = file
      await tick()
      if (thumbnailData.video?.src) URL.revokeObjectURL(video?.src)
      Object.assign(thumbnailData, {
        thumbnails: [],
        interval: undefined,
        video: undefined
      })
      if (subs) subs.destroy()
      if (file instanceof File || file instanceof URLFile) {
        setFile(file)
        src = `server/${file.name}`
        fast = false
      } else {
        setFile(null)
        src = file.url
        fast = true
      }
      currentTime = 0
      targetTime = 0
      video.load()
      subs = new Subtitles(video, files, current)
      subs.on('track-change', handleHeaders)
    }
  }

  function cycleSubtitles () {
    if (current && subs?.headers) {
      const tracks = subs.headers.filter(header => header)
      const index = tracks.indexOf(subs.headers[subs.current]) + 1
      subs.selectCaptions(index >= tracks.length ? -1 : subs.headers.indexOf(tracks[index]))
    }
  }
  $: targetTime = (!paused && currentTime) || targetTime

  function autoPlay () {
    if (!miniplayer) video.play()
  }
  function playPause () {
    paused = !paused
  }
  function toggleMute () {
    muted = !muted
  }
  let visibilityPaused = true
  document.addEventListener('visibilitychange', () => {
    if (!video?.ended && !pip) {
      if (document.visibilityState === 'hidden') {
        visibilityPaused = paused
        paused = true
      } else {
        if (!visibilityPaused) paused = false
      }
    }
  })
  function tryPlayNext () {
    playNext()
  }
  function playNext () {
    handleCurrent(videos[(videos.indexOf(current) + 1) % videos.length])
  }
  function playLast () {
    const index = videos.indexOf(current)
    handleCurrent(videos[index === 0 ? videos.length - 1 : index - 1])
  }
  function toggleFullscreen () {
    document.fullscreenElement ? document.exitFullscreen() : container.requestFullscreen()
  }
  function seek (time) {
    if (time === 85 && currentTime < 10) {
      currentTime = currentTime = 90
    } else if (time === 85 && safeduration - currentTime < 90) {
      currentTime = currentTime = safeduration
    } else {
      currentTime = currentTime += time
    }
    targetTime = currentTime
  }
  function forward () {
    seek(2)
  }
  function rewind () {
    seek(-2)
  }
  async function screenshot () {
    if ('clipboard' in navigator) {
      const canvas = document.createElement('canvas')
      const context = canvas.getContext('2d')
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      context.drawImage(video, 0, 0)
      if (subs?.renderer) {
        subs.renderer.resize(video.videoWidth, video.videoHeight)
        await new Promise(resolve => setTimeout(resolve, 600)) // this is hacky, but TLDR wait for canvas to update and re-render, in practice this will take at MOST 100ms, but just to be safe
        context.drawImage(subs.renderer._canvas, 0, 0, canvas.width, canvas.height)
        subs.renderer.resize(0, 0, 0, 0) // undo resize
      }
      const blob = await new Promise(resolve => canvas.toBlob(resolve))
      await navigator.clipboard.write([
        new ClipboardItem({
          [blob.type]: blob
        })
      ])
      canvas.remove()
    }
  }
  let togglePopout
  let toggleCast
  let showKeybinds = false
  loadWithDefaults({
    KeyX: {
      fn: () => screenshot(),
      id: 'screenshot_monitor',
      type: 'icon'
    },
    KeyR: {
      fn: () => seek(-90),
      id: '-90'
    },
    Comma: {
      fn: async () => seek(-1 / (await video.fps) || 0),
      id: 'fast_rewind',
      type: 'icon'
    },
    Period: {
      fn: async () => seek(1 / (await video.fps) || 0),
      id: 'fast_forward',
      type: 'icon'
    },
    KeyI: {
      fn: () => toggleStats(),
      id: 'list',
      type: 'icon'
    },
    Backquote: {
      fn: () => (showKeybinds = !showKeybinds),
      id: 'help_outline',
      type: 'icon'
    },
    Space: {
      fn: () => playPause(),
      id: 'play_arrow',
      type: 'icon'
    },
    KeyN: {
      fn: () => playNext(),
      id: 'skip_next',
      type: 'icon'
    },
    KeyM: {
      fn: () => (muted = !muted),
      id: 'volume_off',
      type: 'icon'
    },
    KeyP: {
      fn: () => togglePopout(),
      id: 'picture_in_picture',
      type: 'icon'
    },
    KeyF: {
      fn: () => toggleFullscreen(),
      id: 'fullscreen',
      type: 'icon'
    },
    KeyS: {
      fn: () => seek(85),
      id: '+90'
    },
    KeyD: {
      fn: () => toggleCast(),
      id: 'cast',
      type: 'icon'
    },
    KeyC: {
      fn: () => cycleSubtitles(),
      id: 'subtitles',
      type: 'icon'
    },
    ArrowLeft: {
      fn: () => rewind(),
      id: '-2'
    },
    ArrowRight: {
      fn: () => forward(),
      id: '+2'
    },
    ArrowUp: {
      fn: () => (volume = Math.min(1, volume + 0.05)),
      id: 'volume_up',
      type: 'icon'
    },
    ArrowDown: {
      fn: () => (volume = Math.max(0, volume - 0.05)),
      id: 'volume_down',
      type: 'icon'
    },
    BracketLeft: {
      fn: () => (playbackRate -= 0.1),
      id: 'history',
      type: 'icon'
    },
    BracketRight: {
      fn: () => (playbackRate += 0.1),
      id: 'update',
      type: 'icon'
    },
    Backslash: {
      fn: () => (playbackRate = 1),
      id: 'schedule',
      type: 'icon'
    }
  })

  function immersePlayer () {
    immersed = true
    immerseTimeout = undefined
  }

  function resetImmerse () {
    if (immerseTimeout) {
      clearTimeout(immerseTimeout)
    } else {
      immersed = false
    }
    immerseTimeout = setTimeout(immersePlayer, 8 * 1000)
  }

  function hideBuffering () {
    if (bufferTimeout) {
      clearTimeout(bufferTimeout)
      bufferTimeout = null
      buffering = false
    }
  }

  function showBuffering () {
    bufferTimeout = setTimeout(() => {
      buffering = true
      resetImmerse()
    }, 150)
  }
  $: navigator.mediaSession?.setPositionState({
    duration: Math.max(0, safeduration),
    playbackRate: 1,
    position: Math.max(0, Math.min(safeduration, currentTime || 0))
  })

  async function mediaChange (current, image) {
    if (current) {
      // eslint-disable-next-line camelcase
      const { release_group, anime_title, episode_number, episode_title } = await anitomyscript(current.name)
      // honestly, this is made for anime, but works fantastic for everything else.
      // eslint-disable-next-line camelcase
      name = [anime_title, episode_number, episode_title].filter(i => i).join(' - ')
      if ('mediaSession' in navigator) {
        const metadata = image
          ? new MediaMetadata({
            title: name || 'Video Player',
            artwork: [
              {
                src: image,
                sizes: '256x256',
                type: 'image/jpg'
              }
            ]
          })
          : new MediaMetadata({
            title: name || 'Video Player'
          })
        // eslint-disable-next-line camelcase
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
  let toggleStats
  let fast = false
  let successCount = 0
  async function checkSpeed () {
    if (!fast && (current instanceof File || current instanceof URLFile) && safeduration) {
      const byterate = current.size / safeduration
      const currBps = speed()
      if (currBps > 5 * byterate) {
        ++successCount
        // this is faulty logic, because there might not be a need to pull data, even if the speeds can be reached
        if (successCount > 10) {
          console.log('Access speed exceeds x5 bitrate')
          fast = true
          await subs?.parseSubtitles()
          finishThumbnails()
        }
      } else {
        successCount = 0
      }
    }
  }
  const thumbCanvas = document.createElement('canvas')
  thumbCanvas.width = 200
  const thumbnailData = {
    thumbnails: [],
    canvas: thumbCanvas,
    context: thumbCanvas.getContext('2d'),
    interval: Number.MAX_VALUE,
    video: null
  }
  function createThumbnail (vid = video) {
    if (vid?.readyState >= 2 && (current instanceof File || current instanceof URLFile)) {
      const index = Math.floor(vid.currentTime / thumbnailData.interval)
      if (!thumbnailData.thumbnails[index]) {
        thumbnailData.context.fillRect(0, 0, 200, thumbnailData.canvas.height)
        thumbnailData.context.drawImage(vid, 0, 0, 200, thumbnailData.canvas.height)
        thumbnailData.thumbnails[index] = thumbnailData.canvas.toDataURL('image/jpeg')
        if (index === 5) mediaChange(current, thumbnailData.thumbnails[index])
      }
    }
  }
  let videoWidth, videoHeight
  $: initThumbnails(200 / (videoWidth / videoHeight))
  function initThumbnails (height) {
    if (!isNaN(height)) {
      thumbnailData.interval = safeduration / 300 < 5 ? 5 : safeduration / 300
      thumbnailData.canvas.height = height
    }
  }

  function finishThumbnails () {
    const t0 = performance.now()
    const video = document.createElement('video')
    let index = 0
    video.preload = 'none'
    video.volume = 0
    video.playbackRate = 0
    video.addEventListener('loadeddata', () => loadTime())
    video.addEventListener('canplay', () => {
      createThumbnail(thumbnailData.video)
      loadTime()
    })
    thumbnailData.video = video
    const loadTime = () => {
      while (thumbnailData.thumbnails[index] && index <= Math.floor(safeduration / thumbnailData.interval)) {
        // only create thumbnails that are missing
        index++
      }
      if (thumbnailData.video?.currentTime !== safeduration && thumbnailData.video) {
        thumbnailData.video.currentTime = index * thumbnailData.interval || Number.MAX_VALUE
      } else {
        thumbnailData.video?.removeAttribute('src')
        thumbnailData.video?.load()
        thumbnailData.video?.remove()
        delete thumbnailData.video
        console.log('Thumbnail creating finished', index, toTS((performance.now() - t0) / 1000))
      }
      index++
    }
    thumbnailData.video.src = current instanceof File ? URL.createObjectURL(current) : current.url
    thumbnailData.video.load()
    console.log('Thumbnail creating started')
  }
  let isStandalone = window.matchMedia('(display-mode: standalone)').matches
  window.matchMedia('(display-mode: standalone)').addEventListener('change', ({ matches }) => {
    isStandalone = matches
  })
  const isWindows = navigator.appVersion.includes('Windows')
  let innerWidth, innerHeight
  let menubarOffset = 0
  $: calcMenubarOffset(innerWidth, innerHeight, videoWidth, videoHeight, isStandalone)
  function calcMenubarOffset (innerWidth, innerHeight, videoWidth, videoHeight, isStandalone) {
    // outerheight resize and innerheight resize is mutual, additionally update on metadata and app state change
    if (isStandalone && videoWidth && videoHeight) {
      // so windows is very dumb, and calculates windowed mode as if it was window XP, with the old bars, but not when maximised
      const isMaximised = screen.availWidth === window.outerWidth && screen.availHeight === window.outerHeight
      const menubar = Math.max(0, isWindows && !isMaximised ? window.outerHeight - innerHeight - 8 : window.outerHeight - innerHeight)
      // element ratio calc
      const videoRatio = videoWidth / videoHeight
      const { offsetWidth, offsetHeight } = video
      const elementRatio = offsetWidth / offsetHeight
      // video is shorter than element && has space for menubar offset
      if (!document.fullscreenElement && menubar && elementRatio <= videoRatio && offsetHeight - offsetWidth / videoRatio > menubar) {
        menubarOffset = (menubar / 2) * -1
      } else {
        menubarOffset = 0
      }
    }
  }

  function getBufferedTime (buffered, time) {
    for (const { start, end } of buffered) {
      if (time < end && time > start) {
        return end
      }
    }
    return 0
  }

  let buffered = []

  $: buffer = getBufferedTime(buffered, targetTime)

</script>

<svelte:window bind:innerWidth bind:innerHeight />
{#if showKeybinds}
  <div class='position-absolute bg-tp w-full h-full z-50 font-size-12 p-20 d-flex align-items-center justify-content-center' use:click={() => (showKeybinds = false)}>
    <button class='close' type='button' on:click={() => (showKeybinds = false)}><span>×</span></button>
    <Keybinds let:prop={item} autosave={true} clickable={true}>
      <div class:material-icons={item?.type} class='bind'>{item?.id || ''}</div>
    </Keybinds>
  </div>
{/if}
<div
  class='player w-full h-full d-flex flex-column overflow-hidden position-relative'
  class:pointer={miniplayer}
  class:miniplayer
  class:pip
  class:immersed
  class:buffering
  bind:this={container}
  on:mousemove={resetImmerse}
  on:touchmove={resetImmerse}
  on:keypress={resetImmerse}
  on:mouseleave={immersePlayer}>
  <!-- eslint-disable-next-line svelte/valid-compile -->
  <video
    class='position-absolute h-full w-full'
    style={`margin-top: ${menubarOffset}px`}
    autoplay
    preload='auto'
    {src}
    bind:videoHeight
    bind:videoWidth
    bind:this={video}
    bind:volume
    bind:duration
    bind:currentTime
    bind:buffered
    bind:paused
    bind:ended
    bind:muted
    bind:playbackRate
    on:timeupdate={checkSpeed}
    on:timeupdate={() => createThumbnail()}
    on:waiting={showBuffering}
    on:loadeddata={hideBuffering}
    on:canplay={hideBuffering}
    on:playing={hideBuffering}
    on:loadedmetadata={hideBuffering}
    on:ended={tryPlayNext}
    on:loadedmetadata={getFPS}
    on:loadedmetadata={initThumbnails}
    on:loadedmetadata={autoPlay}
    on:leavepictureinpicture={() => (pip = false)} />
  <Stats {video} {buffer} bind:toggleStats />
  <div class='top z-40 d-flex justify-content-between'>
    <div />
    <div />
    <span class='material-icons ctrl' title='Keybinds [`]' on:click={() => (showKeybinds = true)}> help_outline </span>
  </div>
  <div class='middle d-flex align-items-center justify-content-center flex-grow-1 z-40 position-relative'>
    <div class='position-absolute w-full h-full' on:dblclick={toggleFullscreen}>
      <div class='play-overlay w-full h-full' on:click={playPause} />
    </div>
    <span class='material-icons ctrl' class:text-muted={!videos?.length > 1} class:disabled={!videos?.length > 1} data-name='playLast' on:click={playLast}> skip_previous </span>
    <span class='material-icons ctrl' data-name='rewind' on:click={rewind}> fast_rewind </span>
    <span class='material-icons ctrl' data-name='playPause' on:click={playPause}> {ended ? 'replay' : paused ? 'play_arrow' : 'pause'} </span>
    <span class='material-icons ctrl' data-name='forward' on:click={forward}> fast_forward </span>
    <span class='material-icons ctrl' class:text-muted={!videos?.length > 1} class:disabled={!videos?.length > 1} data-name='playNext' on:click={playNext}> skip_next </span>
    <div data-name='bufferingDisplay' class='position-absolute' />
  </div>
  <div class='bottom d-flex z-40 flex-column px-20'>
    <SeekControls bind:currentTime bind:targetTime {safeduration} {thumbnailData} bind:paused {buffer} />
    <div class='d-flex'>
      <span class='material-icons ctrl' title='Play/Pause [Space]' data-name='playPause' on:click={playPause}> {ended ? 'replay' : paused ? 'play_arrow' : 'pause'} </span>
      {#if videos?.length > 1}
        <span class='material-icons ctrl' title='Next [N]' data-name='playNext' on:click={playNext}> skip_next </span>
      {/if}
      <div class='d-flex w-auto volume'>
        <span class='material-icons ctrl' title='Mute [M]' data-name='toggleMute' on:click={toggleMute}> {muted ? 'volume_off' : 'volume_up'} </span>
        <input class='ctrl' type='range' min='0' max='1' step='any' data-name='setVolume' bind:value={volume} style='--value: {volume * 100}%' />
      </div>
      <div class='ts mr-auto'>{toTS(targetTime, safeduration > 3600 ? 2 : 3)} / {toTS(safeduration - targetTime, safeduration > 3600 ? 2 : 3)}</div>
      <TrackControls {video} {subs} {subHeaders} />
      <CastControls {video} {subs} bind:paused bind:toggleCast {container} />
      <PopoutControls {video} {subs} bind:pip bind:togglePopout {container} />
      <span class='material-icons ctrl' title='Fullscreen [F]' data-name='toggleFullscreen' on:click={toggleFullscreen}>
        {isFullscreen ? 'fullscreen_exit' : 'fullscreen'}
      </span>
    </div>
  </div>
</div>

<style>
  .bind {
    font-size: 1.8rem;
    font-weight: bold;
    display: flex;
    justify-content: center;
    align-items: center;
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100%;
  }
  .bind.material-icons {
    font-size: 2.2rem !important;
    font-weight: unset !important;
  }
  .miniplayer {
    height: auto !important;
  }
  .miniplayer .top,
  .miniplayer .bottom {
    display: none !important;
  }
  .miniplayer video {
    position: relative !important;
  }
  .bg-tp {
    background: #000000bb;
    backdrop-filter: blur(10px);
  }
  .bg-tp .close {
    position: absolute;
    top: 0;
    right: 0;
    cursor: pointer;
    color: inherit;
    padding: var(--alert-close-padding);
    line-height: var(--alert-close-line-height);
    font-size: var(--alert-close-font-size);
    background-color: transparent;
    border-color: transparent;
  }

  video {
    transition: margin-top 0.2s ease;
  }
  .player {
    user-select: none;
    font-family: Roboto, Arial, Helvetica, sans-serif;
    background-color: var(--dark-color-light);
    will-change: width;
    background: #000;
  }
  .player.miniplayer {
    background: #00000066;
    backdrop-filter: blur(3px);
  }

  .pip :global(canvas:not(.w-full)) {
    width: 1px !important;
    height: 1px !important;
    /*hack to hide the canvas but still keep it updating*/
  }

  .material-icons {
    font-size: 2.6rem;
    padding: 1.5rem;
    display: flex;
  }

  .immersed {
    cursor: none;
  }

  .immersed .middle .ctrl,
  .immersed .top,
  .immersed .bottom {
    opacity: 0;
  }

  .pip video {
    opacity: 0.1%
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
    filter: drop-shadow(0 0 8px #000);
  }
  .disabled {
    cursor: not-allowed !important;
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

  .middle .ctrl {
    font-size: 4rem;
    margin: 2rem;
    z-index: 3;
    display: none;
  }
  :fullscreen {
    background: #000 !important;
  }

  @media (pointer: none), (pointer: coarse) {
    .middle .ctrl {
      display: flex;
    }
    .middle .play-overlay {
      display: none !important;
    }
  }
  .miniplayer .middle {
    transition: background 0.2s ease;
    position: absolute !important;
    width: 100%;
    height: 100%;
  }
  .miniplayer .middle .ctrl {
    display: flex;
    font-size: 2.8rem;
    margin: 0.6rem;
  }
  .miniplayer .middle .play-overlay {
    display: none !important;
  }
  .miniplayer .middle .ctrl[data-name='playPause'] {
    font-size: 5.625rem;
  }
  .miniplayer:hover .middle {
    background: #00000066;
  }
  .middle .ctrl[data-name='playPause'] {
    font-size: 6.75rem;
  }

  .middle .ctrl,
  .bottom .ctrl:hover,
  .bottom .ts:hover,
  .bottom .hover .ts {
    filter: drop-shadow(0 0 8px #000);
  }

  .bottom {
    padding-top: 3rem;
    background: linear-gradient(to top, rgba(0, 0, 0, 0.8), rgba(0, 0, 0, 0.6) 25%, rgba(0, 0, 0, 0.4) 65%, rgba(0, 0, 0, 0.1) 90%, transparent);
    transition: 0.5s opacity ease;
  }
  .top {
    background: linear-gradient(to bottom, rgba(0, 0, 0, 0.8), rgba(0, 0, 0, 0.4) 25%, rgba(0, 0, 0, 0.2) 50%, rgba(0, 0, 0, 0.1) 75%, transparent);
    transition: 0.5s opacity ease;
  }

  .ctrl {
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

  input[type='range']::-moz-range-track {
    height: 3px;
    border: none;
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
  input[type='range']::-moz-range-thumb {
    height: 0;
    width: 0;
    border-radius: 50%;
    background: #ff3c00;
    -webkit-appearance: none;
    appearance: none;
    transition: all 0.1s ease;
    border: none;
  }

  input[type='range']:hover::-webkit-slider-thumb {
    height: 12px;
    width: 12px;
    margin-top: -4px;
  }

  input[type='range']:hover::-moz-range-thumb {
    height: 12px;
    width: 12px;
    margin-top: -4px;
  }

  input[type='range']::-moz-range-track {
    background: linear-gradient(90deg, #ff3c00 var(--value), rgba(255, 255, 255, 0.2) var(--value));
  }
  input[type='range']::-webkit-slider-runnable-track {
    background: linear-gradient(90deg, #ff3c00 var(--value), rgba(255, 255, 255, 0.2) var(--value));
  }
  .bottom .volume:hover input[type='range'] {
    width: 5vw;
    display: inline-block;
    margin-right: 1.125rem;
  }

  .bottom .volume input[type='range'] {
    width: 0;
    transition: width 0.1s ease;
    height: 100%;
  }

  .bottom .ts {
    color: #ececec;
    font-size: 2rem !important;
    white-space: nowrap;
    align-self: center;
    line-height: var(--base-line-height);
    padding: 0 1.56rem;
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
</style>
