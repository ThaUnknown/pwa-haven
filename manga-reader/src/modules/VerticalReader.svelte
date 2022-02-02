<script>
  let scrollContainer = {}
  export let items = []

  $: currentItems = items.slice(currentIndex, currentIndex + displaying).map(item => {
    return { index: items.indexOf(item), item }
  })

  export let currentIndex = 0
  let displaying = 1
  const observer = new IntersectionObserver(entries => {
    const nodes = [...scrollContainer.children]
    for (const entry of entries) {
      const index = nodes.indexOf(entry.target)
      if (entry.isIntersecting) {
        if (index === 0) {
          currentIndex = Math.max(0, currentIndex - 1)
        }
        if (index === nodes.length - 1) {
          ++displaying
        }
      } else {
        if (nodes.length > 2 && index === 1) {
          ++currentIndex
        }
        if (index > 1 && index !== nodes.length - 1) {
          displaying = Math.max(1, displaying - 1)
        }
      }
    }
  })
  function infiniteScrolling(node) {
    observer.observe(node)
    return {
      destroy() {
        observer.unobserve(node)
      }
    }
  }
</script>

<div class="h-full d-flex flex-column overflow-x-hidden overflow-y-auto" bind:this={scrollContainer}>
  {#if items.length}
    <!-- svelte-ignore missing-declaration -->
    {#each currentItems as { item, index } (index)}
      <div class="w-full d-flex" use:infiniteScrolling>
        <slot {item} />
      </div>
    {/each}
  {/if}
</div>
