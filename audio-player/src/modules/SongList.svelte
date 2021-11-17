<script>
  import { toTS } from '../../../shared/util.js'

  export let current
  export let songs
  function select(song) {
    if (song !== current) current = song
  }
</script>

<div class="col-md-5 bg-dark overflow-y-scroll h-half h-md-full p-20">
  {#if songs.length}
    {#each songs as song}
      <div class="d-flex w-full pointer font-size-20 {song === current ? 'text-primary' : 'text-muted'}" on:click={select(song)}>
        <div class="material-icons font-size-20 center pr-20">
          {song === current ? 'volume_up' : 'play_arrow'}
        </div>
        <div class="text-truncate">{[song.number, song.name].filter(s => s).join('. ')}</div>
        <div class="ml-auto pl-20">{toTS(song.duration)}</div>
      </div>
    {/each}
  {:else}
    <div class="font-size-24 font-weight-bold center text-center h-full pointer">Drag and drop, paste or click here to select a file/folder to play.</div>
  {/if}
</div>

<style>
  .pointer {
    cursor: pointer;
  }
  .pointer:hover {
    color: var(--dm-base-text-color) !important;
  }
  .center {
    display: flex;
    align-items: center;
    justify-content: center;
  }
</style>
