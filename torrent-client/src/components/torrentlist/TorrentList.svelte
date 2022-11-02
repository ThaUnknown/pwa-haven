<script>
  import { torrents } from '../../modules/client.js'
  import { settings } from '../Settings.svelte'
  import TorrentCard from './TorrentCard.svelte'
  import TorrentListItem from './TorrentListItem.svelte'
  export let selected = null
</script>

{#if $settings?.compact}
  <table class='table table-striped'>
    <thead>
      <tr>
        <th class='w-50'>#</th>
        <th>Name</th>
        <th>Status</th>
        <th>Progress</th>
        <th>Size</th>
        <th>Files</th>
        <th>Peers</th>
        <th>Down Speed</th>
        <th>Up Speed</th>
        <th>ETA</th>
        <th>Ratio</th>
        <th class='w-150'>Options</th>
      </tr>
    </thead>
    <tbody>
      {#each $torrents as torrent}
        <TorrentListItem {torrent} bind:selected />
      {/each}
    </tbody>
  </table>
{:else}
  {#each $torrents as torrent}
    <TorrentCard {torrent} bind:selected />
  {/each}
{/if}

<style>
  table {
    table-layout: fixed;
  }
  th {
    padding: 0.8rem 1rem;
  }
</style>
