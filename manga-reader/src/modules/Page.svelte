<script>
  import { onDestroy } from 'svelte'

  export let file = null
  $: updateFile(file)

  async function getCropped(blob, opts) {
    const img = new Image()
    img.src = URL.createObjectURL(blob)
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    await new Promise(resolve => {
      img.onload = resolve
      if (img.complete) resolve()
    })
    URL.revokeObjectURL(img.src)
    canvas.width = img.width
    canvas.height = img.height
    ctx.drawImage(img, 0, 0)
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const { top, bottom, left, right } = getBorders(imgData, opts)
    canvas.width = img.width - left - right
    canvas.height = img.height - top - bottom
    ctx.drawImage(img, -left, -top)
    return [canvas.toDataURL('image/png'), ctx.getImageData(0, 0, canvas.width, canvas.height)]
  }

  function getBorders(imgData, options = {}) {
    if (!imgData) return null
    const { threshold = 15, margin = 2, padding = 5 } = options
    const { data, width, height } = imgData
    const opts = { whitethreshold: 255 - threshold, blackthreshold: threshold, margin, data: new Uint32Array(data.buffer), width, height }
    // entire array of data is flipped [reversed], including colors
    return {
      top: Math.max(0, topBorder(opts) - padding),
      bottom: Math.max(0, bottomBorder(opts) - padding),
      left: Math.max(0, leftBorder(opts) - padding),
      right: Math.max(0, rightBorder(opts) - padding)
    }
  }

  function topBorder({ whitethreshold, blackthreshold, margin, data, height, width }) {
    let white = margin
    let black = margin
    bbwl: for (; white < height - margin * 2; ++white) {
      const offset = white * width
      for (let wid = margin; wid < width - margin * 2; ++wid) {
        const color = data[offset + wid]
        if ((color & 0xff) < whitethreshold || ((color >> 8) & 0xff) < whitethreshold || ((color >> 16) & 0xff) < whitethreshold) break bbwl
      }
    }
    bbbl: for (; black < height - margin * 2; ++black) {
      const offset = black * width
      for (let wid = margin; wid < width - margin * 2; ++wid) {
        const color = data[offset + wid]
        if ((color & 0xff) > blackthreshold || ((color >> 8) & 0xff) > blackthreshold || ((color >> 16) & 0xff) > blackthreshold) break bbbl
      }
    }
    return Math.max(black, white)
  }

  function bottomBorder({ whitethreshold, blackthreshold, margin, data, height, width }) {
    let white = height - 1 - margin
    let black = height - 1 - margin
    tbwl: for (; white >= margin; --white) {
      const offset = white * width
      for (let wid = margin; wid < width - margin * 2; ++wid) {
        const color = data[offset + wid]
        if ((color & 0xff) < whitethreshold || ((color >> 8) & 0xff) < whitethreshold || ((color >> 16) & 0xff) < whitethreshold) break tbwl
      }
    }
    tbbl: for (; black >= margin; --black) {
      const offset = black * width
      for (let wid = margin; wid < width - margin * 2; ++wid) {
        const color = data[offset + wid]
        if ((color & 0xff) > blackthreshold || ((color >> 8) & 0xff) > blackthreshold || ((color >> 16) & 0xff) > blackthreshold) break tbbl
      }
    }

    return height - Math.min(white, black) - 1
  }

  function leftBorder({ whitethreshold, blackthreshold, margin, data, height, width }) {
    let white = margin
    let black = margin
    lbwl: for (; white < width - margin * 2; ++white) {
      for (let hei = margin; hei < height - margin * 2; ++hei) {
        const color = data[hei * width + white]
        if ((color & 0xff) < whitethreshold || ((color >> 8) & 0xff) < whitethreshold || ((color >> 16) & 0xff) < whitethreshold) break lbwl
      }
    }
    lbbl: for (; black < width - margin * 2; ++black) {
      for (let hei = margin; hei < height - margin * 2; ++hei) {
        const color = data[hei * width + black]
        if ((color & 0xff) > blackthreshold || ((color >> 8) & 0xff) > blackthreshold || ((color >> 16) & 0xff) > blackthreshold) break lbbl
      }
    }
    return Math.max(white, black)
  }

  function rightBorder({ whitethreshold, blackthreshold, margin, data, height, width }) {
    let white = width - 1 - margin
    let black = width - 1 - margin

    rbwl: for (; white >= margin; --white) {
      for (let hei = margin; hei < height - margin * 2; ++hei) {
        const color = data[hei * width + white]
        if ((color & 0xff) < whitethreshold || ((color >> 8) & 0xff) < whitethreshold || ((color >> 16) & 0xff) < whitethreshold) break rbwl
      }
    }
    rbbl: for (; black >= margin; --black) {
      for (let hei = margin; hei < height - margin * 2; ++hei) {
        const color = data[hei * width + black]
        if ((color & 0xff) < blackthreshold || ((color >> 8) & 0xff) < blackthreshold || ((color >> 16) & 0xff) < blackthreshold) break rbbl
      }
    }

    return width - Math.min(white, black) - 1
  }

  function updateFile(file) {
    if (!blob && file) {
      blob = file.blob()
    }
  }
  let blob = null
  let oldopts = null
  $: setSource(blob, options)
  async function setSource(blob, options) {
    if (blob && oldopts !== options.crop) {
      oldopts == options.crop
      if (options.crop) {
        src = (await getCropped(await blob, { padding: 2 }))[0]
      } else {
        src = URL.createObjectURL(await blob)
      }
    }
  }
  onDestroy(() => {
    URL.revokeObjectURL(src)
  })

  export let options = {}
  $: resetPos(options)
  let image = null
  let src = null
  let scale = 0
  let transition = true
  const initial = { x: 0, y: 0 }
  const old = { x: 0, y: 0 }
  const position = { x: 0, y: 0 }
  let disPos = initial
  const dimensions = { x: null, y: null }
  // dragging around
  function dragStart(e) {
    if (options.mode === 'fit') {
      transition = false
      initial.x = e.clientX
      initial.y = e.clientY
      image.onpointermove = handleDrag
      if (e.pointerId) image.setPointerCapture(e.pointerId)
    }
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
  // zooming
  let pinching = false
  function checkPinch({ touches }) {
    if (options.mode === 'fit') {
      if (touches.length === 2) {
        pinching = true
        transition = true
      }
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
    if (options.mode === 'fit') {
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
  }

  function resetPos() {
    old.x = 0
    old.y = 0
    scale = 0
    zoom = 1
    disPos = old
  }
  function handleStyle({ disPos, zoom }) {
    image?.style.setProperty('transform', `scale(${zoom})`)
    image?.style.setProperty('--left', disPos.x + 'px')
    image?.style.setProperty('--top', disPos.y + 'px')
  }
  $: handleStyle({ disPos, zoom })

  function handleImage(image) {
    dimensions.x = image.naturalWidth
    dimensions.y = image.naturalHeight
  }
</script>

{#if src}
  {#if options.mode !== 'fit'}
    <img {src} alt="view" class="w-full" />
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
  {/if}
{:else}
  <div class="d-flex align-items-center justify-content-center font-size-24 font-weight-bold w-full h-full">There's no next page.</div>
{/if}

<style>
  img {
    object-fit: contain;
    --top: 0;
    --left: 0;
    top: var(--top);
    left: var(--left);
  }
  .transition {
    transition: all 0.2s cubic-bezier(0.25, 0.8, 0.25, 1);
  }
  img:not([src]) {
    display: none;
  }
  .dragarea {
    user-select: none;
    cursor: grab;
    touch-action: none;
  }
</style>
