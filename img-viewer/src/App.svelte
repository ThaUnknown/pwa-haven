<script>
  import InstallPrompt from './modules/InstallPrompt.svelte'
  let src = null
  let image = null
  let scale = 0
  let isBlurred = true
  let name = 'Image Viewer'
  let fileSize = null
  const initial = { x: 0, y: 0 }
  const old = { x: 0, y: 0 }
  const position = { x: 0, y: 0 }
  const dimensions = { x: null, y: null }
  const DOMPARSER = new DOMParser().parseFromString.bind(new DOMParser())
  const units = [' B', ' KB', ' MB', ' GB']

  navigator.serviceWorker.register('/sw.js')

  function prettyBytes(num) {
    if (isNaN(num) || num == null) return ''
    if (num < 1) return num + ' B'
    const exponent = Math.min(Math.floor(Math.log(num) / Math.log(1000)), units.length - 1)
    return Number((num / Math.pow(1000, exponent)).toFixed(2)) + units[exponent]
  }

  function setSource(target) {
    if (src) URL.revokeObjectURL(src) // gc
    if (target.constructor === String) {
      src = target
      const startIndex = Math.max(target.lastIndexOf('\\'), target.lastIndexOf('/')) + 1
      name = target.substring(startIndex)
      fileSize = null
    } else {
      src = URL.createObjectURL(target)
      const startIndex = Math.max(target.name.lastIndexOf('\\'), target.name.lastIndexOf('/')) + 1
      name = target.name.substring(startIndex)
      fileSize = target.size
    }
  }

  let transition = true
  // dragging around
  function dragStart(e) {
    transition = false
    initial.x = e.clientX
    initial.y = e.clientY
    image.onpointermove = handleDrag
    image.setPointerCapture(e.pointerId)
  }
  function dragEnd(e) {
    if (image.onpointermove) {
      transition = true
      image.onpointermove = null
      image.releasePointerCapture(e.pointerId)
      old.x += e.clientX - initial.x
      old.y += e.clientY - initial.y
    }
  }
  function handleDrag(e) {
    position.x = old.x + e.clientX - initial.x
    position.y = old.y + e.clientY - initial.y
    handlePosition()
  }

  // zooming
  function handleZoom(e) {
    const diff = e.deltaY * -0.01
    if (diff === -1) {
      if (!(scale < -4)) scale -= 0.5
      old.x /= 1.5
      old.y /= 1.5
    } else if (diff === 1 && !(scale > 11)) {
      scale += 0.5
      old.x *= 1.5
      old.y *= 1.5
    }
    image.style.setProperty('--zoom', 2 ** scale)
    handlePosition(old)
  }

  // position
  function handlePosition(pos = position) {
    image.style.setProperty('--left', pos.x + 'px')
    image.style.setProperty('--top', pos.y + 'px')
  }
  // loading files
  function handleDrop({ dataTransfer }) {
    if (dataTransfer.items) handleItems(dataTransfer.items[0])
  }

  function handlePaste({ clipboardData }) {
    if (clipboardData.items) handleItems(clipboardData.items[0])
  }
  function handleItems(item) {
    // don't support multi-image x)
    if (item?.type.indexOf('image') === 0) {
      setSource(item.getAsFile())
    } else if (item?.type === 'text/plain') {
      item.getAsString(setSource)
    } else if (item?.type === 'text/html') {
      item.getAsString(text => {
        const img = DOMPARSER(text, 'text/html').querySelector('img')
        if (img) setSource(img.src)
      })
    }
  }

  if ('launchQueue' in window) {
    launchQueue.setConsumer(async launchParams => {
      if (!launchParams.files.length) {
        return
      }
      setSource(await launchParams.files[0].getFile())
    })
  }

  // UI
  function toggleBlur() {
    isBlurred = !isBlurred
    image.style.setProperty('--pixel', isBlurred ? 'crisp-edges' : 'pixelated')
  }
  function resetPos() {
    old.x = 0
    old.y = 0
    scale = 0
    image.style.setProperty('--zoom', 1)
    handlePosition(old)
  }
  function handleImage() {
    dimensions.x = image.naturalWidth
    dimensions.y = image.naturalHeight
  }
</script>

<div class="sticky-alerts d-flex flex-column-reverse">
  <InstallPrompt />
</div>
<div class="w-full h-full overflow-hidden position-relative dragarea" on:pointerdown={dragStart} on:pointerup={dragEnd} on:wheel|passive={handleZoom}>
  <img {src} class:transition alt="view" class="w-full h-full position-absolute" bind:this={image} on:load={handleImage} />
</div>

<div class="btn-group position-absolute bg-dark-dm bg-light-lm">
  <button class="btn btn-lg btn-square material-icons" type="button" on:click={toggleBlur}>
    {isBlurred ? 'blur_off' : 'blur_on'}
  </button>
  <button class="btn btn-lg btn-square material-icons" type="button" on:click={resetPos}> fit_screen </button>
</div>

<svelte:head>
  <title>{name} {dimensions.x && dimensions.y ? `(${dimensions.x} x ${dimensions.y})` : ''} {prettyBytes(fileSize)}</title>
</svelte:head>

<svelte:window
  on:drop|preventDefault={handleDrop}
  on:dragenter|preventDefault
  on:dragover|preventDefault
  on:dragstart|preventDefault
  on:dragleave|preventDefault
  on:paste|preventDefault={handlePaste} />

<style>
  img {
    object-fit: contain;
    --top: 0;
    --left: 0;
    --zoom: 1;
    --pixel: 'crisp-edges';
    top: var(--top);
    left: var(--left);
    image-rendering: var(--pixel);
    transform: scale(var(--zoom));
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
  }
  .btn-group {
    bottom: 8rem;
    left: 50%;
    transform: translate(-50%, 0);
  }
  .sticky-alerts {
    --sticky-alerts-top: auto;
    bottom: 1rem;
  }
</style>
