<script>
  import { toTS } from './util.js'
  export let current
  export let songs
  import { createEventDispatcher } from 'svelte'
  const dispatch = createEventDispatcher()
  function select(song) {
    if (song !== current) current = song
  }
</script>

<div class="col-md-5 bg-dark overflow-y-scroll h-half h-md-full p-20" on:click={() => dispatch('popup')}>
  {#if songs.length}
    {#each songs as song}
      <div class="d-flex w-full pointer font-size-20 {song === current ? 'text-primary' : 'text-muted'}" on:click={select(song)}>
        <div class="material-icons font-size-20 center pr-20">
          {song === current ? 'volume_up' : 'play_arrow'}
        </div>
        <div class="text-truncate">{song.name}</div>
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
