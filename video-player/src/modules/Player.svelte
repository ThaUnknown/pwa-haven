<script>
  import { setFile } from './server.js'
  import './streamable.js'
  import Subtitles from './subtitles.js'
  import { toTS } from './util.js'

  export let files = []
  let src = null
  let video = null
  let current = null
  let subs = null
  let duration = 0.1
  let currentTime = 0
  let paused = true
  let muted = false
  let wasPaused = true
  let thumbnail = ' '
  $: progress = currentTime / duration
  $: targetTime = currentTime
  let volume = localStorage.getItem('volume') || 1
  $: localStorage.setItem('volume', volume)

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

  $: testVideo(files)
  async function testVideo(files) {
    if (files && files.length) {
      current = files[0]
      setFile(current)
      subs = new Subtitles(video, files, current)
      src = `player/${current.name}`
    }
  }
</script>

<!-- svelte-ignore a11y-media-has-caption -->
<div class="player">
  <video {src} bind:this={video} autoplay bind:volume bind:duration bind:currentTime bind:paused bind:muted />
  <!-- svelte-ignore a11y-missing-content -->
  <a href="#player" class="miniplayer" alt="miniplayer" />
  <div class="top" />
  <div class="middle">
    <div class="ctrl" data-name="ppToggle" on:click={playPause} />
    <span class="material-icons ctrl" data-name="playLast"on:click={playLast}> skip_previous </span>
    <span class="material-icons ctrl" data-name="rewind"> fast_rewind </span>
    <span class="material-icons ctrl" data-name="playPause" on:click={playPause}> play_arrow </span>
    <span class="material-icons ctrl" data-name="forward"> fast_forward </span>
    <span class="material-icons ctrl" data-name="playNext" on:click={playNext}> skip_next </span>
    <div data-name="bufferingDisplay" />
  </div>
  <div class="bottom">
    <span class="material-icons ctrl" title="Play/Pause [Space]" data-name="playPause" on:click={playPause}> play_arrow </span>
    <span class="material-icons ctrl" title="Next [N]" data-name="playNext" on:click={playNext}> skip_next </span>
    <div class="volume">
      <span class="material-icons ctrl" title="Mute [M]" data-name="toggleMute" on:click={toggleMute}> volume_up </span>
      <input class="ctrl" type="range" min="0" max="1" step="any" data-name="setVolume" bind:value={volume} style="--value: {volume * 100}%" />
    </div>
    <div class="audio-tracks popup">
      <span class="material-icons ctrl" title="Audio Tracks [T]" disabled data-name="audioButton"> queue_music </span>
      <div class="popup-menu ctrl" data-name="selectAudio" />
    </div>
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
    <div class="subtitles popup">
      <span class="material-icons ctrl" title="Subtitles [C]" disabled data-name="captionsButton"> subtitles </span>
      <div class="popup-menu ctrl" data-name="selectCaptions" />
    </div>
    <span class="material-icons ctrl" title="Cast Video [P]" data-name="toggleCast" disabled> cast </span>
    <span class="material-icons ctrl" title="Popout Window [P]" data-name="togglePopout"> picture_in_picture </span>
    <span class="material-icons ctrl" title="Theatre Mode [T]" data-name="toggleTheatre"> crop_16_9 </span>
    <span class="material-icons ctrl" title="Fullscreen [F]" data-name="toggleFullscreen"> fullscreen </span>
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
  .ctrl[disabled],
  .player:fullscreen .ctrl[data-name='toggleTheatre'],
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
