<script>
  export let currentIndex = 0
  export let items = []

  $: length = items.length
  $: currentItems = [-1, 0, 1].map(i => (currentIndex + i <= length ? { item: items[currentIndex + i], index: currentIndex + i } : { item: false })).filter(i => i.item !== false)
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
  function autoFocus(node) {
    return {
      update(current) {
        if (current) node.focus()
      }
    }
  }
</script>

<div class="h-full d-flex flex-row-reverse overflow-x-hidden">
  {#if length}
    <!-- svelte-ignore missing-declaration -->
    {#each currentItems as { item, index } (index)}
      <div class="item w-full h-full overflow-y-auto" class:prev class:next use:autoFocus={currentIndex === index}>
        <slot {item} />
      </div>
    {/each}
  {/if}
</div>

<style>
  .item {
    flex: none;
    transform: translateX(100%);
  }

  .prev, .next {
    transition: transform 0.2s;
  }

  .next {
    transform: translateX(200%);
  }

  .prev {
    transform: translateX(0);
  }
</style>
