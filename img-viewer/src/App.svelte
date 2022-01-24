<script>
  import InstallPrompt from './modules/InstallPrompt.svelte'
  import { filePopup, handleItems, getSearchFiles, getLaunchFiles } from '../../shared/inputHandler.js'
  import RecentFiles, { initDb } from '../../shared/RecentFiles.svelte'

  initDb('img-viewer')

  let src = null
  let image = null
  let scale = 0
  let isBlurred = true
  let name = 'Image Viewer'
  let fileSize = null
  const initial = { x: 0, y: 0 }
  const old = { x: 0, y: 0 }
  const position = { x: 0, y: 0 }
  let disPos = initial
  const dimensions = { x: null, y: null }
  const units = [' B', ' KB', ' MB', ' GB']
  let files = []
  let current = null

  navigator.serviceWorker.register('/sw.js')

  function prettyBytes(num) {
    if (isNaN(num) || num == null) return ''
    if (num < 1) return num + ' B'
    const exponent = Math.min(Math.floor(Math.log(num) / Math.log(1000)), units.length - 1)
    return Number((num / Math.pow(1000, exponent)).toFixed(2)) + units[exponent]
  }

  function setSource(target) {
    if (target) {
      if (target.constructor === String) {
        const startIndex = Math.max(target.lastIndexOf('\\'), target.lastIndexOf('/')) + 1
        name = target.substring(startIndex)
        fileSize = null
        src = target
      } else {
        const startIndex = Math.max(target.name.lastIndexOf('\\'), target.name.lastIndexOf('/')) + 1
        name = target.name.substring(startIndex)
        fileSize = target.size
        src = target.url
      }
    }
  }

  let transition = true
  // dragging around
  function dragStart(e) {
    transition = false
    initial.x = e.clientX
    initial.y = e.clientY
    image.onpointermove = handleDrag
    if (e.pointerId) image.setPointerCapture(e.pointerId)
  }
  function dragEnd(e) {
    if (image.onpointermove) {
      transition = true
      image.onpointermove = null
      if (e.pointerId) image.releasePointerCapture(e.pointerId)
      if (pinching) {
        pinching = false
        lasthypot = 0
      } else {
        old.x += e.clientX - initial.x
        old.y += e.clientY - initial.y
      }
    }
  }
  function handleDrag(e) {
    if (!pinching) {
      position.x = old.x + e.clientX - initial.x
      position.y = old.y + e.clientY - initial.y
      disPos = position
    }
  }
  function viewNext() {
    current = files[(files.indexOf(current) + 1) % files.length]
  }
  function viewLast() {
    const index = files.indexOf(current)
    current = files[index === 0 ? files.length - 1 : index - 1]
  }

  // zooming
  let pinching = false
  function checkPinch({ touches }) {
    if (touches.length === 2) {
      pinching = true
      transition = true
    }
  }
  let lasthypot = 0
  let hypotdelta = 0
  function handlePinch({ touches }) {
    if (touches.length === 2 && pinching === true) {
      const last = lasthypot
      lasthypot = Math.hypot(touches[0].pageX - touches[1].pageX, touches[0].pageY - touches[1].pageY)
      hypotdelta += last - lasthypot
      if (hypotdelta > 20 || hypotdelta < -20) {
        handleZoom({ deltaY: hypotdelta > 0 ? 100 : -100 })
        hypotdelta = 0
      }
    }
  }
  let zoom = 1
  function handleZoom({ deltaY }) {
    const diff = deltaY * -0.01
    if (diff < 0) {
      if (!(scale < -4)) scale -= 0.5
      old.x /= 1.5
      old.y /= 1.5
    } else if (diff > 0 && !(scale > 11)) {
      scale += 0.5
      old.x *= 1.5
      old.y *= 1.5
    }
    zoom = 2 ** scale
    disPos = old
  }

  // loading files
  async function handleInput({ dataTransfer, clipboardData }) {
    const items = clipboardData?.items || dataTransfer?.items
    if (items) {
      handleFiles(await handleItems(items, ['image']))
    }
  }

  if ('launchQueue' in window) {
    getLaunchFiles().then(handleFiles)
  }
  async function handlePopup() {
    if (!files.length) {
      handleFiles(await filePopup(['image']))
    }
  }
  $: handleFiles(files)
  function handleFiles(newfiles) {
    if (newfiles?.length) {
      for (const file of newfiles) {
        // this is both bad and good, makes 2nd load instant, but uses extra ram
        if (file instanceof File) file.url = URL.createObjectURL(file)
      }
      files = files.concat(newfiles)
      if (!current) current = files[0]
    }
  }
  handleFiles(getSearchFiles(['image']))

  // UI
  function toggleBlur() {
    isBlurred = !isBlurred
    image.style.setProperty('--pixel', isBlurred ? 'crisp-edges' : 'pixelated')
  }
  function resetPos() {
    old.x = 0
    old.y = 0
    scale = 0
    zoom = 1
    disPos = old
  }
  function handleImage() {
    dimensions.x = image.naturalWidth
    dimensions.y = image.naturalHeight
  }
  let rotation = 0
  // this is bad, but %360 causes css animation bug :(
  function rotateL() {
    rotation -= 90
  }
  function rotateR() {
    rotation += 90
  }
  let flip = false
  function toggleFlip() {
    flip = !flip
  }
  let mirror = false
  function toggleMirror() {
    mirror = !mirror
  }
  function handleStyle({ disPos, mirror, flip, rotation, zoom }) {
    image?.style.setProperty('transform', `rotate(${rotation}deg) ` + `scaleX(${mirror ? -1 : 1}) ` + `scaleY(${flip ? -1 : 1}) ` + `scale(${zoom})`)
    image?.style.setProperty('--left', disPos.x + 'px')
    image?.style.setProperty('--top', disPos.y + 'px')
  }
  $: handleStyle({ disPos, mirror, flip, rotation, zoom })

  $: setSource(current)
</script>

<div class="sticky-alerts d-flex flex-column-reverse">
  <InstallPrompt />
</div>
{#if !files.length}
  <RecentFiles bind:files {handlePopup} />
{:else}
  <div
    class="w-full h-full overflow-hidden position-relative dragarea"
    on:pointerdown={dragStart}
    on:pointerup={dragEnd}
    on:wheel|passive={handleZoom}
    on:touchend={dragEnd}
    on:touchstart={checkPinch}
    on:touchmove={handlePinch}>
    <img {src} class:transition alt="view" class="w-full h-full position-absolute" bind:this={image} on:load={handleImage} />
  </div>

  <div class="position-absolute buttons row w-full justify-content-center">
    {#if files.length > 1}
      <div class="btn-group bg-dark-dm bg-light-lm rounded m-5 col-auto">
        <button class="btn btn-lg btn-square material-icons" type="button" on:click={viewLast}>arrow_back</button>
        <button class="btn btn-lg btn-square material-icons" type="button" on:click={viewNext}>arrow_forward</button>
      </div>
    {/if}

    <div class="btn-group input-group bg-dark-dm bg-light-lm rounded m-5 w-200 col-auto">
      <button class="btn btn-lg btn-square material-icons" type="button" on:click={resetPos}>zoom_out_map</button>
      <button class="btn btn-lg btn-square material-icons" type="button" on:click={() => handleZoom({ deltaY: 100 })}>remove</button>
      <input type="number" step="0.1" min="0.1" class="form-control form-control-lg text-right" placeholder="Scale" readonly value={zoom.toFixed(1)} />
      <button class="btn btn-lg btn-square material-icons" type="button" on:click={() => handleZoom({ deltaY: -100 })}>add</button>
    </div>

    <div class="btn-group bg-dark-dm bg-light-lm rounded m-5 col-auto">
      <button class="btn btn-lg btn-square material-icons" type="button" on:click={toggleBlur}>
        {isBlurred ? 'blur_off' : 'blur_on'}
      </button>
      <button class="btn btn-lg btn-square material-icons" type="button" on:click={rotateL}>rotate_left</button>
      <button class="btn btn-lg btn-square material-icons" type="button" on:click={rotateR}>rotate_right</button>
      <button class="btn btn-lg btn-square material-icons" type="button" on:click={toggleFlip}><div class="flip">flip</div></button>
      <button class="btn btn-lg btn-square material-icons" type="button" on:click={toggleMirror}>flip</button>
    </div>
  </div>
{/if}

<svelte:head>
  <title>{name} {dimensions.x && dimensions.y ? `(${dimensions.x} x ${dimensions.y})` : ''} {prettyBytes(fileSize)}</title>
</svelte:head>

<svelte:window
  on:drop|preventDefault={handleInput}
  on:dragenter|preventDefault
  on:dragover|preventDefault
  on:dragstart|preventDefault
  on:dragleave|preventDefault
  on:paste|preventDefault={handleInput} />

<style>
  :global(body) {
    position: unset !important;
  }
  img {
    object-fit: contain;
    --top: 0;
    --left: 0;
    --pixel: 'crisp-edges';
    top: var(--top);
    left: var(--left);
    image-rendering: var(--pixel);
  }
  .flip {
    transform: rotate(90deg);
  }
  .input-group button {
    flex: unset;
  }
  .transition {
    transition: all 0.2s cubic-bezier(0.25, 0.8, 0.25, 1);
  }
  img:not([src]) {
    display: none;
  }
  .dragarea {
    background: repeating-conic-gradient(rgba(0, 0, 0, 0.3) 0% 25%, transparent 0% 50%) 50% / 20px 20px;
    user-select: none;
    cursor: grab;
    touch-action: none;
  }
  .buttons {
    bottom: 8rem;
    left: 50%;
    transform: translate(-50%, 0);
  }
  .sticky-alerts {
    --sticky-alerts-top: auto;
    bottom: 1rem;
  }
  input::-webkit-inner-spin-button {
    display: none;
  }
  input {
    -moz-appearance: textfield;
  }
</style>
