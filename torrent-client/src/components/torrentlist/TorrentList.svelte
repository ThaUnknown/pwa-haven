<script>
  import { torrents } from '../../modules/client.js'
  import TorrentCard from './TorrentCard.svelte'
  export let selected = null
</script>

{#each $torrents as torrent}
  <TorrentCard {torrent} bind:selected />
{/each}