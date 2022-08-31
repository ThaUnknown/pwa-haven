<script>
  import { toTS } from '../../../../shared/util.js'
  export let currentTime = 0
  export let safeduration = 0
  export let targetTime = 0
  export let thumbnailData = null
  export let paused = false
  $: progress = currentTime / safeduration

  let thumbnail = ' '
  let hover = null
  let hoverTime = 0
  let hoverOffset = 0
  function handleHover ({ offsetX, target }) {
    hoverOffset = offsetX / target.clientWidth
    hoverTime = safeduration * hoverOffset
    hover.style.setProperty('left', hoverOffset * 100 + '%')
    thumbnail = thumbnailData.thumbnails[Math.floor(hoverTime / thumbnailData.interval)] || ' '
  }
  let wasPaused = false
  function handleMouseDown ({ target }) {
    wasPaused = paused
    paused = true
    targetTime = target.value * safeduration
  }
  function handleMouseUp () {
    paused = wasPaused
    currentTime = targetTime
  }
  function handleProgress ({ target }) {
    targetTime = target.value * safeduration
  }
</script>

<div class='w-full d-flex align-items-center h-20 mb--5'>
  <div class='w-full h-full position-relative d-flex align-items-center'>
    <input
      class='ctrl w-full h-full prog'
      type='range'
      min='0'
      max='1'
      step='any'
      data-name='setProgress'
      bind:value={progress}
      on:mousedown={handleMouseDown}
      on:mouseup={handleMouseUp}
      on:mousemove={handleHover}
      on:input={handleProgress}
      on:touchstart={handleMouseDown}
      on:touchend={handleMouseUp}
      on:keydown|preventDefault
      style='--value: {progress * 100}%' />
    <div class='hover position-absolute d-flex flex-column align-items-center' bind:this={hover}>
      <img alt='thumbnail' class='w-full mb-5 shadow-lg' src={thumbnail} />
      <div class='ts'>{toTS(hoverTime)}</div>
    </div>
  </div>
</div>

<style>
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
  .ctrl {
    cursor: pointer;
  }
  .ctrl:hover {
    filter: drop-shadow(0 0 8px #000);
  }

  input ~ .hover {
    pointer-events: none;
    opacity: 0;
    top: 0;
    transform: translate(-50%, -100%);
    position: absolute;
    font-family: Roboto, Arial, Helvetica, sans-serif;
    white-space: nowrap;
    font-weight: 600;
    width: 200px;
    transition: 0.2s opacity ease;
  }

  input:hover ~ .hover {
    opacity: 1;
  }
  .h-20 {
    height: 2rem
  }
  .mb--5 {
    margin-bottom: -.5rem;
  }
  .ts {
    color: #ececec;
    font-size: 2rem !important;
    white-space: nowrap;
    align-self: center;
    line-height: var(--base-line-height);
    padding: 0 1.56rem;
    font-weight: 600;
  }
  img[src=' '] {
    display: none !important;
  }
</style>
