<script>
  import { setFile } from './server.js'
  import './streamable.js'
  import Subtitles from './subtitles.js'
  export let files = []
  let src = null
  let video = null
  let selected = null
  let subs = null

  $: testVideo(files)
  async function testVideo(files) {
    if (files && files.length) {
      selected = files[0]
      setFile(selected)
      subs = new Subtitles(video, files, selected)
      src = `player/${selected.name}`
    }
  }
</script>

<!-- svelte-ignore a11y-media-has-caption -->
<div class="player" id="player">
  <video {src} bind:this={video} />
  <!-- svelte-ignore a11y-missing-content -->
  <a href="#player" class="miniplayer" alt="miniplayer" />
  <div class="top" />
  <div class="middle">
    <div class="ctrl" data-name="ppToggle" />
    <span class="material-icons ctrl" data-name="playLast"> skip_previous </span>
    <span class="material-icons ctrl" data-name="rewind"> fast_rewind </span>
    <span class="material-icons ctrl" data-name="playPause"> play_arrow </span>
    <span class="material-icons ctrl" data-name="forward"> fast_forward </span>
    <span class="material-icons ctrl" data-name="playNext"> skip_next </span>
    <div data-name="bufferingDisplay" />
  </div>
  <div class="bottom">
    <span class="material-icons ctrl" title="Play/Pause [Space]" data-name="playPause"> play_arrow </span>
    <span class="material-icons ctrl" title="Next [N]" data-name="playNext"> skip_next </span>
    <span class="material-icons ctrl" title="Playlist [P]" data-name="openPlaylist"> playlist_play </span>
    <div class="volume">
      <span class="material-icons ctrl" title="Mute [M]" data-name="toggleMute"> volume_up </span>
      <input class="ctrl" type="range" value="100" id="volume" step="any" data-name="setVolume" />
    </div>
    <div class="audio-tracks popup">
      <span class="material-icons ctrl" title="Audio Tracks [T]" disabled data-name="audioButton"> queue_music </span>
      <div class="popup-menu ctrl" data-name="selectAudio" />
    </div>
    <div class="ctrl" data-name="progressWrapper" data-elapsed="00:00" data-remaining="00:00">
      <div>
        <input class="ctrl" type="range" min="0" max="100" value="0" step="any" data-name="setProgress" />
        <img class="ctrl" data-elapsed="00:00" data-name="thumbnail" alt="thumbnail" />
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
  --download: 0%;
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

.player:target {
  bottom: 0;
  right: 0;
  position: relative;
  width: 100%;
  height: 100%;
  transition: none !important;
}

.player:target .middle,
.player:target .bottom {
  display: flex;
}

.player video {
  position: relative;
  flex: 0 1 auto;
  z-index: -1;
  width: 100%;
  height: 100%;
  background: #191c209d;
  backdrop-filter: blur(10px);
}

.player:target video {
  position: absolute;
  background: none;
}

.player a.miniplayer {
  z-index: 5;
  position: absolute;
  width: 100%;
  height: 100%;
}

.player.pip {
  background: #000;
}

.player.pip canvas {
  left: 99.9% !important;
  /*hack to hide the canvas but still keep it updating*/
}

.player .material-icons {
  font-size: 2.2rem;
  padding: 1.2rem;
  transition: all 0.2s ease;
  display: flex;
}

.player.immersed {
  cursor: none;
}

.player.immersed .middle .ctrl,
.player.immersed .bottom {
  opacity: 0;
}

.player:target a.miniplayer,
.player .bottom input[type='range'][data-name='setProgress']+img[src=' '],
.player video[src='']:not([poster]),
.player .ctrl[disabled],
.player:fullscreen .ctrl[data-name='toggleTheatre'],
.player:fullscreen .ctrl[data-name='openPlaylist'],
.player:fullscreen .ctrl[data-name='togglePopout'] {
  display: none !important;
}

.player.pip video {
  visibility: hidden;
}

.player .top {
  background: linear-gradient(to bottom,
      rgba(0, 0, 0, 0.8),
      rgba(0, 0, 0, 0.4) 25%,
      rgba(0, 0, 0, 0.2) 50%,
      rgba(0, 0, 0, 0.1) 75%,
      transparent);
  display: none;
  transition: 0.5s opacity ease;
  border-width: 0;
  border-top-width: 1px;
  border-image-slice: 1;
  border-style: solid;
  border-image-source: linear-gradient(90deg,
      #e5204c var(--download),
      rgba(0, 0, 0, 0.8) var(--download));
  grid-template-columns: 1fr auto 1fr;
}
.player .middle {
  height: 100%;
  flex: 1;
  display: none;
  flex-direction: row;
  position: relative;
  justify-content: center;
  align-items: center;
}

.player .middle div[data-name='bufferingDisplay'] {
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

.player.buffering .middle div[data-name='bufferingDisplay'] {
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

.player .middle .ctrl[data-name="ppToggle"] {
  position: absolute;
  width: 100%;
  height: 100%;
  display: block;
  z-index: 2;
}

.player .middle .ctrl {
  font-size: 4rem;
  margin: 2rem;
  z-index: 3;
  display: none;
}

@media (pointer:none),
(pointer:coarse) {
  .player .middle .ctrl {
    display: flex;
  }
}

.player .middle .ctrl[data-name='playPause'] {
  font-size: 6rem;
}

.player .middle .ctrl,
.player .bottom .ctrl:hover {
  filter: drop-shadow(0 0 8px #000);
}

.player .bottom {
  background: linear-gradient(to top,
      rgba(0, 0, 0, 0.8),
      rgba(0, 0, 0, 0.4) 25%,
      rgba(0, 0, 0, 0.2) 50%,
      rgba(0, 0, 0, 0.1) 75%,
      transparent);
  display: none;
  transition: 0.5s opacity ease;
}

.player .bottom .ctrl {
  cursor: pointer;
}

.player .bottom input[type='range'] {
  -webkit-appearance: none;
  background: transparent;
  margin: 0;
  cursor: pointer;
}

.player .bottom input[type='range']:focus {
  outline: none;
}

.player .bottom input[type='range']::-webkit-slider-runnable-track {
  height: 3px;
}

.player .bottom input[type='range']::-moz-range-track {
  height: 3px;
}

.player .bottom input[type='range']::-webkit-slider-thumb {
  height: 0;
  width: 0;
  border-radius: 50%;
  background: #e5204c;
  -webkit-appearance: none;
  appearance: none;
  margin-top: 2px;
  transition: all 0.1s ease;
}

.player .bottom input[type='range']::-moz-range-thumb {
  height: 0;
  width: 0;
  border-radius: 50%;
  background: #e5204c;
  -moz-appearance: none;
  appearance: none;
  margin-top: 2px;
  transition: all 0.1s ease;
  border: none;
}

.player .bottom input[type='range']:hover::-webkit-slider-thumb {
  height: 12px;
  width: 12px;
  margin-top: -4px;
}

.player .bottom input[type='range']:hover::-moz-range-thumb {
  height: 12px;
  width: 12px;
  margin-top: -4px;
}

.player .bottom input[type='range'][data-name='setProgress']::-webkit-slider-runnable-track {
  background: linear-gradient(90deg,
      #e5204c var(--progress),
      rgba(255, 255, 255, 0.2) var(--progress));
}

.player .bottom input[type='range'][data-name='setVolume']::-webkit-slider-runnable-track {
  background: linear-gradient(90deg,
      #e5204c var(--volume-level),
      rgba(255, 255, 255, 0.2) var(--volume-level));
}

.player .bottom input[type='range'][data-name='setProgress']::-moz-range-track {
  background: linear-gradient(90deg,
      #e5204c var(--progress),
      rgba(255, 255, 255, 0.2) var(--progress));
}

.player .bottom input[type='range'][data-name='setVolume']::-moz-range-track {
  background: linear-gradient(90deg,
      #e5204c var(--volume-level),
      rgba(255, 255, 255, 0.2) var(--volume-level));
}

.player .bottom .volume {
  display: flex;
  width: auto;
}

.player .bottom .volume:hover input[type='range'] {
  width: 5vw;
  display: inline-block;
  transition: all 0.1s ease;
  margin-right: 1rem;
}

.player .bottom .volume input[type='range'] {
  width: 0;
  transition: all 0.1s ease;
}

.player .bottom div[data-name='progressWrapper'] {
  --progress: 0%;
}

.player .bottom input[type='range'][data-name='setProgress'],
.player .bottom div[data-name='progressWrapper'],
.player .bottom div[data-name='progressWrapper'] div {
  display: flex;
  width: 100%;
  height: 100%;
  position: relative;
}

.player .bottom input[type='range'][data-name='setProgress']+img,
.player .bottom input[type='range'][data-name='setProgress']::before {
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

.player .bottom input[type='range'][data-name='setProgress']+img {
  top: -2rem;
  width: 150px;
}

.player .bottom input[type='range'][data-name='setProgress']::before {
  top: 0.5rem;
  content: attr(data-elapsed);
  color: #ececec;
}

.player .bottom input[type='range'][data-name='setProgress']:active+img,
.player .bottom input[type='range'][data-name='setProgress']:active::before {
  opacity: 1;
}

.player .bottom div[data-name='progressWrapper']::before,
.player .bottom div[data-name='progressWrapper']::after {
  color: #ececec;
  font-size: 1.8rem !important;
  white-space: nowrap;
  align-self: center;
  cursor: default;
  line-height: var(--base-line-height);
  padding: 0 1.2rem;
  font-weight: 600;
}

.player .bottom div[data-name='progressWrapper']::before {
  content: attr(data-elapsed);
}

.player .bottom div[data-name='progressWrapper']::after {
  content: attr(data-remaining);
}

.player .bottom .popup {
  position: relative;
}

.player .bottom .popup input {
  display: none;
}

.player .bottom .popup input:checked+label {
  color: white
}

.player .bottom .popup label {
  cursor: pointer;
  color: rgba(255, 255, 255, 0.6);
  white-space: nowrap;
}

.player .bottom .popup .popup-menu {
  visibility: hidden;
  position: absolute;
  transform: translateY(-100%);
  text-transform: capitalize;
  top: 0;
  z-index: 10;
  display: flex;
  flex-direction: column;
  min-width: 5rem;
  background: #191c20;
  padding: .8rem;
  border-radius: 3px;
  font-size: 1.6rem
}

.player .bottom .popup:hover .popup-menu {
  visibility: visible;
}

@media (pointer:none),
(pointer:coarse) {

  .player .bottom .ctrl[data-name='playPause'],
  .player .bottom .ctrl[data-name='playNext'],
  .player .bottom .volume,
  .player .bottom .ctrl[data-name='togglePopout'],
  .player .bottom .ctrl[data-name='toggleFullscreen'] {
    display: none
  }
}
</style>