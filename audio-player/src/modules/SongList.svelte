<script>
  import { toTS } from './util.js'
  export let current
  export let songs
  function select(song){
    current = song
  }
</script>

<div class="col-4">
  {#each songs as song}
    <div class={song === current ? 'text-primary' : 'text-muted'} on:click={select(song)}>
      {song.name} - {toTS(song.duration)}
    </div>
  {/each}
</div>
