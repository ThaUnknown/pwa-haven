<script>
  export let crumbs
  export let currentHandle

  function useCrumb (i) {
    currentHandle = crumbs[i]
    crumbs = crumbs.slice(0, i)
  }
</script>

<nav aria-label='Breadcrumb navigation example'>
  <ul class='breadcrumb'>
    {#each crumbs as handle, i}
      <li class='breadcrumb-item' on:click={() => useCrumb(i)}><a href='#'>{handle.name}</a></li>
    {/each}<li class='breadcrumb-item active'><a href='#'>{currentHandle.name}</a></li>
  </ul>
</nav>
