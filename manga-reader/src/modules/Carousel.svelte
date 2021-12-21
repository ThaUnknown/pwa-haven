<script>
  export let currentIndex = 0
  export let items = []
  export let duration = 500

  $: length = items.length
  $: currentItems = [0, 1, 2].map(i => items[(currentIndex + i + length) % length])
  let prev = false
  let next = false

  function gotoNext() {
    next = true
    setTimeout(() => {
      currentIndex = (currentIndex + 1) % length
      next = false
    }, duration)
  }

  function gotoPrev() {
    prev = true
    setTimeout(() => {
      currentIndex = (currentIndex - 1 + length) % length
      prev = false
    }, duration)
  }
</script>

<div class="carousel">
  {#each currentItems as item (items.indexOf(item))}
    <div class="item" class:motion={prev || next} class:prev class:next>
      <slot {item} />
    </div>
  {/each}
</div>
<div class="controls">
  <button on:click={gotoPrev}>Prev</button>
  <button on:click={gotoNext}>Next</button>
</div>

<style>
  .carousel {
    display: grid;
    grid-template-rows: 1fr;
    grid-template-columns: 100% 100% 100%;
    background: red;
    width: 400px;
    aspect-ratio: 1;
    overflow: hidden;
  }
  .item {
    transform: translateX(-100%);
    width: 100%;
    height: 100%;
    grid-row: 1 / -1;
    grid-column: span 1;
  }

  .motion {
    --duration: 500ms;
    transition: transform var(--duration);
  }

  .next {
    transform: translateX(-200%);
  }

  .prev {
    transform: translateX(0);
  }
</style>
