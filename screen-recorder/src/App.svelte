<script>
  import InstallPrompt from '../../shared/InstallPrompt.svelte'
  import Recorder from './lib/recorder.js'
  import Preview from './modules/Preview.svelte'
  import Settings from './modules/Settings.svelte'

  navigator.serviceWorker.register('/sw.js')

  let mediaRecorder = null
  async function record () {
    if (mediaRecorder) {
      mediaRecorder.destroy()
      mediaRecorder = null
    } else {
      mediaRecorder = new Recorder()
      mediaRecorder.addEventListener('destroyed', () => {
        mediaRecorder = null
      })
    }
  }
</script>

<div class='sticky-alerts d-flex flex-column-reverse'>
  <InstallPrompt />
</div>
<div class='w-full h-full overflow-hidden position-relative dragarea d-flex align-items-center justify-content-center overflow-auto'>
  <div class='content flex-row flex-wrap mw-600'>
    {#if 'getDisplayMedia' in navigator.mediaDevices}
      <Preview {mediaRecorder} />
      <Settings />
      <button class='btn mt-10' on:click={record}>{mediaRecorder ? 'Stop Recording' : 'Start Recording'}</button>
    {:else}
      <h1 class='font-weight-bold'>Media Recording Unsupported!</h1>
    {/if}
  </div>
</div>

<svelte:head>
  <title>Screen Recorder</title>
</svelte:head>

<style>
  * {
    user-select: none;
  }
  :root {
    --tooltip-width: 17rem;
  }
  .sticky-alerts {
    --sticky-alerts-top: auto;
    bottom: 1rem;
  }
  :global(::-webkit-inner-spin-button) {
    opacity: 1;
    margin-left: 0.4rem;
    margin-right: -0.5rem;
    filter: invert(0.84);
    padding-top: 2rem;
  }

  :global(.bg-dark::-webkit-inner-spin-button) {
    filter: invert(0.942);
  }
</style>
