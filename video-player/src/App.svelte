<script>
  import Player from './modules/Player.svelte'
  import InstallPrompt from '../../shared/InstallPrompt.svelte'
  import { filePopup, handleItems, getSearchFiles, getLaunchFiles } from '../../shared/inputHandler.js'
  import { fromURL } from '@thaunknown/url-file'
  import RecentFiles, { initDb } from '../../shared/RecentFiles.svelte'

  initDb('video-player')

  let name = ''
  let files = []

  // mistakes have been made
  if (navigator.serviceWorker?.controller?.scriptURL.endsWith('server-worker.js')) {
    navigator.serviceWorker.ready.then(reg => {
      reg.unregister().then(() => location.reload())
    })
  }

  // loading files
  async function handleInput ({ dataTransfer, clipboardData }) {
    const items = clipboardData?.items || dataTransfer?.items
    if (items) {
      handleFiles(await handleItems(items, ['video', 'subtitle']))
    }
  }

  if ('launchQueue' in window) {
    getLaunchFiles().then(handleFiles)
  }
  async function handlePopup () {
    if (!files.length) {
      handleFiles(await filePopup(['video', 'subtitle']))
    }
  }
  async function handleFiles (newfiles) {
    if (newfiles?.length) {
      files = files.concat(
        await Promise.all(
          newfiles.map(async file => {
            if (file instanceof File) return file
            try {
              return await fromURL(file.url)
            } catch (e) {
              console.warn('Failed to use remote URL as a file:', e)
              return file
            }
          })
        )
      )
    }
  }
  handleFiles(getSearchFiles(['video', 'subtitle']))
</script>

<div class='sticky-alerts d-flex flex-column-reverse'>
  <InstallPrompt />
</div>
<div class='page-wrapper'>
  {#if !files.length}
    <RecentFiles bind:files {handlePopup} />
  {:else}
    <Player bind:files bind:name />
  {/if}
</div>

<svelte:head>
  <title>{name || 'Video Player'}</title>
</svelte:head>

<svelte:window on:drop|preventDefault={handleInput} on:dragover|preventDefault on:paste|preventDefault={handleInput} />

<style>
  * {
    user-select: none;
  }
  .sticky-alerts {
    --sticky-alerts-top: auto;
    bottom: 1rem;
  }
</style>
