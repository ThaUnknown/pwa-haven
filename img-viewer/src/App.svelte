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
  let disPos = initial
  const dimensions = { x: null, y: null }
  const DOMPARSER = new DOMParser().parseFromString.bind(new DOMParser())
  const units = [' B', ' KB', ' MB', ' GB']
  let files = []
  let current = null
  $: setSource(current)

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
    disPos = position
  }
  function viewNext() {
    current = files[(files.indexOf(current) + 1) % files.length]
  }
  function viewLast() {
    const index = files.indexOf(current)
    current = files[index === 0 ? files.length - 1 : index - 1]
  }

  // zooming
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
  function handleDrop({ dataTransfer }) {
    if (dataTransfer.items) handleItems([...dataTransfer.items])
  }

  function handlePaste({ clipboardData }) {
    if (clipboardData.items) handleItems([...clipboardData.items])
  }
  async function handleItems(items) {
    // don't support multi-image x)
    const promises = items.map(item => {
      if (item?.type.indexOf('image') === 0) {
        return item.getAsFile()
      } else if (item?.type === 'text/plain') {
        return new Promise(resolve => item.getAsString(resolve))
      } else if (item?.type === 'text/html') {
        return new Promise(resolve => {
          item.getAsString(text => {
            const elems = DOMPARSER(text, 'text/html').querySelectorAll('img')
            if (elems?.length) resolve(elems.map(img => img?.src))
            resolve()
          })
        })
      } else if (item && !item.type) {
        let folder = item.webkitGetAsEntry()
        folder = folder.isDirectory && folder
        if (folder) {
          return new Promise(resolve => {
            folder.createReader().readEntries(async entries => {
              const filePromises = entries.filter(entry => entry.isFile).map(file => new Promise(resolve => file.file(resolve)))
              resolve(await Promise.all(filePromises))
            })
          })
        }
        return
      }
      return
    })
    const newFiles = (await Promise.all(promises)).flat().filter(i => i)
    for (const file of newFiles) {
      if (file.constructor !== String) file.url = URL.createObjectURL(file)
    }
    files = files.concat(newFiles)
    if (!current && files?.length) current = files[0]
  }

  if ('launchQueue' in window) {
    launchQueue.setConsumer(async launchParams => {
      if (!launchParams.files.length) {
        return
      }
      const promises = launchParams.files.map(file => file.getFile())
      // for some fucking reason, the same file can get passed multiple times, why? I still want to future-proof multi-files
      files = (await Promise.all(promises)).filter((file, index, all) => {
        return (
          all.findIndex(search => {
            return search.name === file.name && search.size === file.size && search.lastModified === file.lastModified
          }) === index
        )
      })
      for (const file of files) {
        file.url = URL.createObjectURL(file)
      }
      current = files[0]
    })
  }
  const search = new URLSearchParams(location.search)
  for (const param of search) {
    files.push(param[1])
    if (!current) current = files[0]
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
</script>

<div class="sticky-alerts d-flex flex-column-reverse">
  <InstallPrompt />
</div>
<div class="w-full h-full overflow-hidden position-relative dragarea" on:pointerdown={dragStart} on:pointerup={dragEnd} on:wheel|passive={handleZoom}>
  <img {src} class:transition alt="view" class="w-full h-full position-absolute" bind:this={image} on:load={handleImage} />
</div>

<div class="position-absolute buttons d-flex">
  {#if files.length > 1}
    <div class="btn-group bg-dark-dm bg-light-lm rounded mr-10">
      <button class="btn btn-lg btn-square material-icons" type="button" on:click={viewLast}>arrow_back</button>
      <button class="btn btn-lg btn-square material-icons" type="button" on:click={viewNext}>arrow_forward</button>
    </div>
  {/if}

  <div class="btn-group input-group bg-dark-dm bg-light-lm rounded mr-10 w-200">
    <button class="btn btn-lg btn-square material-icons" type="button" on:click={resetPos}>zoom_out_map</button>
    <button class="btn btn-lg btn-square material-icons" type="button" on:click={() => handleZoom({ deltaY: 100 })}>remove</button>
    <input type="number" step="0.1" min="0.1" class="form-control form-control-lg text-right" placeholder="Scale" readonly value={zoom.toFixed(1)} />
    <button class="btn btn-lg btn-square material-icons" type="button" on:click={() => handleZoom({ deltaY: -100 })}>add</button>
  </div>

  <div class="btn-group bg-dark-dm bg-light-lm rounded">
    <button class="btn btn-lg btn-square material-icons" type="button" on:click={toggleBlur}>
      {isBlurred ? 'blur_off' : 'blur_on'}
    </button>
    <button class="btn btn-lg btn-square material-icons" type="button" on:click={rotateL}>rotate_left</button>
    <button class="btn btn-lg btn-square material-icons" type="button" on:click={rotateR}>rotate_right</button>
    <button class="btn btn-lg btn-square material-icons" type="button" on:click={toggleFlip}><div class="flip">flip</div></button>
    <button class="btn btn-lg btn-square material-icons" type="button" on:click={toggleMirror}>flip</button>
  </div>
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
</style>
