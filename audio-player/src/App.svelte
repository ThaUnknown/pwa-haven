<script>
  import InstallPrompt from '../../shared/InstallPrompt.svelte'
  import Player from './modules/Player.svelte'
  import { parseBlob } from 'music-metadata-browser'
  import { handleItems, getSearchFiles, getLaunchFiles, filePopup } from '../../shared/inputHandler.js'
  import { URLFile } from '../../shared/URLFile.js'
  import RecentFiles, { initDb } from '../../shared/RecentFiles.svelte'

  initDb('audio-player')

  let name = ''
  let files = []

  navigator.serviceWorker.register('/sw.js')

  // loading files
  async function handleInput ({ dataTransfer, clipboardData }) {
    const items = clipboardData?.items || dataTransfer?.items
    if (items) {
      handleFiles(await handleItems(items, ['audio', 'image']))
    }
  }

  if ('launchQueue' in window) {
    getLaunchFiles().then(handleFiles)
  }
  async function handlePopup () {
    if (!songs.length) {
      handleFiles(await filePopup(['audio', 'image']))
    }
  }
  let songs = []
  $: handleFiles(files)
  async function handleFiles (files) {
    if (files?.length) {
      const image = files.find(file => file.type.indexOf('image') === 0)
      const audio = files.filter(file => file.type.indexOf('audio') === 0)
      const songDataPromises = audio.map(async audio => {
        let file = audio
        if (!(file instanceof File)) {
          const urlfile = new URLFile(file)
          if (!((await urlfile.ready) instanceof Error)) {
            file = urlfile
          }
        }
        if (file instanceof File || file instanceof URLFile) {
          let parsed = {}
          try {
            parsed = await parseBlob(file)
          } catch (e) {}
          const { common, format } = parsed
          const name = common?.title || file.name.substring(0, file.name.lastIndexOf('.')) || file.name
          const cover = (common?.picture?.length && new Blob([common.picture[0].data], { type: common.picture[0].format })) || image
          return { file, name, artist: common?.artist, album: common?.album, cover, duration: format?.duration, number: common?.track?.no }
        } else {
          // if metadata can't be parsed, rely on good old regex and audio element x)
          const filename = file.name.substring(0, file.name.lastIndexOf('.')) || file.name
          const [match, number, artist, name] = filename.match(/(?:(^\d*)\.)?(?:(.*)-)?(.+)$/) || []
          const duration = await new Promise(resolve => {
            let audio = document.createElement('audio')
            audio.preload = 'metadata'
            audio.onloadedmetadata = () => {
              resolve(audio.duration)
              URL.revokeObjectURL(audio.src)
              audio = null
            }
            audio.src = file.url
          })
          return { file, artist, name: name || filename, duration, number, cover: image }
        }
      })
      songs = songs.concat(await Promise.all(songDataPromises)).sort((a, b) => (a.file.name > b.file.name ? 1 : b.file.name > a.file.name ? -1 : 0))
    }
  }
  handleFiles(getSearchFiles(['audio', 'image']))
</script>

<div class='sticky-alerts d-flex flex-column-reverse'>
  <InstallPrompt />
</div>
<div class='page-wrapper with-navbar-fixed-bottom'>
  {#if !songs.length}
    <RecentFiles bind:files {handlePopup} />
  {:else}
    <Player bind:name {songs} />
  {/if}
</div>

<svelte:head>
  <title>{name || 'Audio Player'}</title>
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
