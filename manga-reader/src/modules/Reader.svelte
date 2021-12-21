<script lang="ts">
  export let currentIndex = 0
  export let items = []

  $: length = items.length
  $: currentItems = [-1, 0, 1].map(i => (currentIndex + i <= length ? items[currentIndex + i] : false)).filter(i => i !== false)
  let prev = false
  let next = false

  export function gotoNext() {
    if (!next && !prev && currentIndex < length) {
      next = true
      setTimeout(() => {
        currentIndex = currentIndex + 1
        next = false
      }, 200)
    }
  }

  export function gotoPrev() {
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

<style>
  .carousel {
    display: flex;
    flex-direction: row-reverse;
    height: 100%;
    overflow: hidden;
  }
  .item {
    flex: none;
    transform: translateX(100%);
    width: 100%;
    height: 100%;
  }

  .motion {
    transition: transform 0.2s;
  }

  .next {
    transform: translateX(200%);
  }

  .prev {
    transform: translateX(0);
  }
</style>
