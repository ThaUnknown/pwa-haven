<script>
  import { getContext } from 'svelte'
  import { TABS } from './Tabs.svelte'

  const tab = {}
  const { registerTab, selectTab, selectedTab } = getContext(TABS)

  registerTab(tab)
</script>

<div class={'pointer px-10 py-5 mx-5 sidebar-link ' + ($selectedTab === tab ? 'text-primary bg-dark-dm bg-white-lm' : 'bg-very-dark-dm bg-light-lm')} on:click={() => selectTab(tab)}>
  <slot />
</div>

