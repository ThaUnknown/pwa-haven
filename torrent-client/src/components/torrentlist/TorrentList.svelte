<script>
  import TorrentCard from './TorrentCard.svelte'
  export let torrents = []
  export let selected = null
  export let updateTorrents = () => {}
  export let removeTorrent = () => {}
</script>

{#each torrents as torrent}
  <TorrentCard {torrent} bind:selected {updateTorrents} {removeTorrent} />
{/each}