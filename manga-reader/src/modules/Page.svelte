<script>
  import { onDestroy } from 'svelte'

  export let file = null
  $: updateFile(file)

  async function getCropped(blob) {
    const img = new Image()
    img.src = URL.createObjectURL(blob)
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    await img.decode()
    URL.revokeObjectURL(img.src)
    canvas.width = img.width
    canvas.height = img.height
    ctx.drawImage(img, 0, 0)
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const { top, bottom, left, right } = getBorders(imgData, { threshold: 15, margin: 2, padding: 5 })
    canvas.width = img.width - left - right
    canvas.height = img.height - top - bottom
    ctx.drawImage(img, -left, -top)
    return await new Promise(resolve => canvas.toBlob(resolve))
  }

  function getBorders(imgData, options = {}) {
    if (!imgData) return null
    const { threshold = 15, margin = 2, padding = 5 } = options
    const opts = { threshold, margin, padding, ...imgData } // data, height, width
    return {
      top: topBorder(imgData),
      bottom: bottomBorder(imgData),
      left: leftBorder(imgData),
      right: rightBorder(imgData)
    }
  }

  function topBorder(imgData) {
    let white = 0
    let black = 0
    for (; white < imgData.data.length; white += 4) {
      if (imgData.data[white] < 240 || imgData.data[white + 1] < 240 || imgData.data[white + 2] < 240) break
    }
    for (; black < imgData.data.length; black += 4) {
      if (imgData.data[black] > 15 || imgData.data[black + 1] > 15 || imgData.data[black + 2] > 15) break
    }
    return Math.max(0, Math.floor(Math.max(white, black) / 4 / imgData.width) - 5)
  }

  function bottomBorder(imgData) {
    let white = imgData.data.length - 4
    let black = imgData.data.length - 4
    for (; white >= 0; white -= 4) {
      if (imgData.data[white] < 240 || imgData.data[white + 1] < 240 || imgData.data[white + 2] < 240) break
    }
    for (; black >= 0; black -= 4) {
      if (imgData.data[black] > 15 || imgData.data[black + 1] > 15 || imgData.data[black + 2] > 15) break
    }
    return Math.max(0, Math.floor(imgData.height - Math.min(white, black) / 4 / imgData.width) - 5)
  }

  function leftBorder(imgData) {
    let white = 0
    let black = 0
    lbwl: for (; white < imgData.width; ++white) {
      for (let height = 0; height < imgData.height; ++height) {
        if (
          imgData.data[height * imgData.width * 4 + white * 4] < 240 ||
          imgData.data[height * imgData.width * 4 + white * 4 + 1] < 240 ||
          imgData.data[height * imgData.width * 4 + white * 4 + 2] < 240
        )
          break lbwl
      }
    }
    lbbl: for (; black < imgData.width; ++black) {
      for (let height = 0; height < imgData.height; ++height) {
        if (
          imgData.data[height * imgData.width * 4 + black * 4] < 240 ||
          imgData.data[height * imgData.width * 4 + black * 4 + 1] < 240 ||
          imgData.data[height * imgData.width * 4 + black * 4 + 2] < 240
        )
          break lbbl
      }
    }
    return Math.max(0, Math.max(white, black) - 5)
  }

  function rightBorder(imgData) {
    let white = imgData.width - 1
    let black = imgData.width - 1
    rbwl: for (; white >= 0; --white) {
      for (let height = 0; height < imgData.height; ++height) {
        if (
          imgData.data[height * imgData.width * 4 + white * 4] < 240 ||
          imgData.data[height * imgData.width * 4 + white * 4 + 1] < 240 ||
          imgData.data[height * imgData.width * 4 + white * 4 + 2] < 240
        )
          break rbwl
      }
    }
    rbbl: for (; black >= 0; --black) {
      for (let height = 0; height < imgData.height; ++height) {
        if (
          imgData.data[height * imgData.width * 4 + black * 4] < 240 ||
          imgData.data[height * imgData.width * 4 + black * 4 + 1] < 240 ||
          imgData.data[height * imgData.width * 4 + black * 4 + 2] < 240
        )
          break rbbl
      }
    }
    return Math.max(0, imgData.width - Math.min(black, white) - 5 - 1)
  }

  async function updateFile(file) {
    if (!src && file) {
      const blob = await file.blob()
      console.log(file)
      if (options.crop) {
        src = URL.createObjectURL(await getCropped(blob))
      } else {
        src = URL.createObjectURL(blob)
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
