<script>
  import { toggleDropdown } from './common.js'
  export let subHeaders = null
  export let video = null
  let subDelay = 0
  export let subs = null

  $: updateDelay(subDelay)
  function updateDelay (delay) {
    if (subs?.renderer) subs.renderer.timeOffset = delay
  }
  function selectAudio (id) {
    if (id !== undefined) {
      for (const track of video.audioTracks) {
        track.enabled = track.id === id
      }
      video.currentTime -= 0.1
    }
  }
  function selectVideo (id) {
    if (id !== undefined) {
      for (const track of video.videoTracks) {
        track.selected = track.id === id
      }
    }
  }

</script>
<!-- svelte-ignore missing-declaration -->
{#if 'audioTracks' in HTMLVideoElement.prototype && video?.audioTracks?.length > 1}
  <div class='dropdown dropup with-arrow' on:click={toggleDropdown}>
    <span class='material-icons ctrl' title='Audio Tracks'>
      queue_music
    </span>
    <div class='dropdown-menu dropdown-menu-left ctrl custom-radio p-10 pb-5 text-capitalize'>
      {#each video.audioTracks as track}
        <input name='audio-radio-set' type='radio' id='audio-{track.id}-radio' value={track.id} checked={track.enabled} />
        <label for='audio-{track.id}-radio' on:click|stopPropagation={() => selectAudio(track.id)} class='text-truncate pb-5'>
          {(track.language || (!Object.values(video.audioTracks).some(track => track.language === 'eng' || track.language === 'en') ? 'eng' : track.label)) +
            (track.label ? ' - ' + track.label : '')}</label>
      {/each}
    </div>
  </div>
{/if}
<!-- svelte-ignore missing-declaration -->
{#if 'videoTracks' in HTMLVideoElement.prototype && video?.videoTracks?.length > 1}
  <div class='dropdown dropup with-arrow' on:click={toggleDropdown}>
    <span class='material-icons ctrl' title='Video Tracks'>
      playlist_play
    </span>
    <div class='dropdown-menu dropdown-menu-left ctrl custom-radio p-10 pb-5 text-capitalize'>
      {#each video.videoTracks as track}
        <input name='video-radio-set' type='radio' id='video-{track.id}-radio' value={track.id} checked={track.selected} />
        <label for='video-{track.id}-radio' on:click|stopPropagation={() => selectVideo(track.id)} class='text-truncate pb-5'>
          {(track.language || (!Object.values(video.videoTracks).some(track => track.language === 'eng' || track.language === 'en') ? 'eng' : track.label)) +
            (track.label ? ' - ' + track.label : '')}</label>
      {/each}
    </div>
  </div>
{/if}
{#if subHeaders?.length}
  <div class='dropdown dropup with-arrow' on:click={toggleDropdown}>
    <span class='material-icons ctrl' title='Subtitles [C]'>
      subtitles
    </span>
    <div class='dropdown-menu dropdown-menu-right ctrl custom-radio p-10 pb-5 text-capitalize w-200'>
      <input name='subtitle-radio-set' type='radio' id='subtitle-off-radio' value='off' checked={subHeaders && subs?.current === -1} />
      <label for='subtitle-off-radio' on:click|stopPropagation={() => subs.selectCaptions(-1)} class='text-truncate pb-5'> OFF </label>
      {#each subHeaders as track}
        {#if track}
          <input name='subtitle-radio-set' type='radio' id='subtitle-{track.number}-radio' value={track.numer} checked={track.number === subs.current} />
          <label for='subtitle-{track.nubmer}-radio' on:click={() => subs.selectCaptions(track.number)} class='text-truncate pb-5'>
            {(track.language || (!Object.values(subs.headers).some(header => header.language === 'eng' || header.language === 'en') ? 'eng' : track.type)) +
              (track.name ? ' - ' + track.name : '')}
          </label>
        {/if}
      {/each}
      <input type='number' step='0.1' bind:value={subDelay} class='form-control text-right form-control-sm' />
    </div>
  </div>
{/if}

<style>
  .material-icons {
    font-size: 2.6rem;
    padding: 1.5rem;
    display: flex;
  }
  .ctrl {
    cursor: pointer;
  }
  .ctrl:hover {
    filter: drop-shadow(0 0 8px #000);
  }
  ::-webkit-inner-spin-button {
    opacity: 1;
    margin-left: 0.4rem;
    margin-right: -0.5rem;
    filter: invert(0.84);
    padding-top: 2rem;
  }
</style>
