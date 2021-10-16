<script>
  export let value = ''
  export let icon = ''
  export let current = null
  export let other = {}
  $: selected = value === current
  function click() {
    if (current) current = value
  }
</script>

<span class="sidebar-link sidebar-link-with-icon font-weight-bold pointer" class:selected on:click={click} {...other}>
  <span class="sidebar-icon bg-transparent justify-content-start mr-5">
    <span class="material-icons font-size-20" class:selected>
      {icon}
    </span>
  </span>
  {value}
</span>

<style>
  .sidebar-link.selected {
    border-left: 2px solid #1890ff !important;
    background: #1890ff33 !important;
  }
</style>
