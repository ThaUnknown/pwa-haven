<script>
  import { onDestroy } from 'svelte'

  export let file = null
  $: updateFile(file)
  async function updateFile(file) {
    if (!src && file) {
      console.log(file)
      const blob = await file.blob()
      src = URL.createObjectURL(blob)
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

  function handleImage() {
    dimensions.x = image.naturalWidth
    dimensions.y = image.naturalHeight
  }
  let wrapper = null
  export let index = 0
  export let currentIndex = 0
  $: updateFocus(currentIndex)
  function updateFocus(currentIndex) {
    if (currentIndex === index) wrapper?.focus()
  }
</script>

<div
  class="w-full h-full overflow-hidden position-relative dragarea d-flex justify-content-center flex-column transition"
  class:overflow-y-auto={options.mode === 'cover'}
  bind:this={wrapper}
  on:pointerdown={dragStart}
  on:pointerup={dragEnd}
  on:wheel|passive={handleZoom}
  on:touchend={dragEnd}
  on:touchstart={checkPinch}
  on:touchmove={handlePinch}>
  {#if src}
    <img
      {src}
      class:transition
      alt="view"
      class="w-full"
      class:position-absolute={options.mode !== 'vertical'}
      class:h-full={options.mode === 'fit'}
      bind:this={image}
      on:load={handleImage} />
  {:else}
    <div class="d-flex align-items-center justify-content-center font-size-24 font-weight-bold">There's no next page.</div>
  {/if}
</div>

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
    flex: none;
    user-select: none;
    cursor: grab;
    touch-action: none;
  }
</style>
