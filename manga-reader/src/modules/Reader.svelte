<script lang="ts">
  export let currentIndex = 0
  export let items = []

  $: length = items.length
  $: currentItems = [0, 1, 2].map(i => items[currentIndex + i])
  let prev = false
  let next = false

  function gotoNext() {
    if (!next && !prev && currentIndex < length - 1) {
      next = true
      setTimeout(() => {
        currentIndex = currentIndex + 1
        next = false
      }, 200)
    }
  }

  function gotoPrev() {
    if (!next && !prev && currentIndex > 0) {
      prev = true
      setTimeout(() => {
        currentIndex = currentIndex - 1
        prev = false
      }, 200)
    }
  }
</script>

<div class="carousel">
  {#if length}
    {#each currentItems as item (items.indexOf(item))}
      <div class="item" class:motion={prev || next} class:prev class:next>
        <slot {item} />
      </div>
    {/each}
  {/if}
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
    transition: transform 0.2s;
  }

  .next {
    transform: translateX(-200%);
  }

  .prev {
    transform: translateX(0);
  }
</style>
