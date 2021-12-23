<script>
  let scrollContainer = {}
  export let items = []

  $: currentItems = items.slice(hidden, hidden + displaying).map(item => {
    return { index: items.indexOf(item), item }
  })

  let hidden = 0
  let displaying = 1
  const observer = new IntersectionObserver(entries => {
    const nodes = [...scrollContainer.children]
    for (const entry of entries) {
      if (nodes.indexOf(entry.target) === nodes.length - 2) {
        if (!entry.isIntersecting) {
          displaying = Math.max(1, displaying - 1)
        }
      }
      if (nodes.indexOf(entry.target) === nodes.length - 1) {
        if (entry.isIntersecting) {
          ++displaying
        }
      }
      if (displaying > 2 && nodes.indexOf(entry.target) === 1) {
        if (!entry.isIntersecting) {
          ++hidden
        }
      }
      if (nodes.indexOf(entry.target) === 0) {
        if (entry.isIntersecting) {
          hidden = Math.max(0, hidden - 1)
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
      <div class="w-full" use:infiniteScrolling>
        <slot {item} />
      </div>
    {/each}
  {/if}
</div>
