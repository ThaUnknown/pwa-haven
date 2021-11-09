<script>
  import InstallPrompt from './modules/InstallPrompt.svelte'
  import Player from './modules/Player.svelte'
  import { parseBlob } from 'music-metadata-browser'

  const DOMPARSER = new DOMParser().parseFromString.bind(new DOMParser())
  let name = ''
  let files

  navigator.serviceWorker.register('/sw.js')

  // loading files
  function handleDrop({ dataTransfer }) {
    handleItems([...dataTransfer.items])
  }

  function handlePaste({ clipboardData }) {
    handleItems([...clipboardData.items])
  }
  const audioRx = /\.(3gp|3gpp|3g2|aac|adts|ac3|amr|eac3|flac|mp3|m4a|mp4|mp4a|mpga|mp2|mp2a|mp3|m2a|m3a|oga|ogg|mogg|spx|opus|raw|wav|weba)$/i
  async function handleItems(items) {
    const promises = items.map(item => {
      if (item.type.indexOf('audio') === 0 || item.type.indexOf('image') === 0 || item.type.indexOf('video') === 0) {
        return item.getAsFile()
      }
      if (item.type === 'text/plain') {
        return new Promise(resolve =>
          item.getAsString(url => {
            if (audioRx.test(url)) {
              const filename = url.substring(Math.max(url.lastIndexOf('\\'), url.lastIndexOf('/')) + 1)
              const name = filename.substring(0, filename.lastIndexOf('.')) || filename
              resolve({
                name,
                url,
                type: 'audio/'
              })
            }
            resolve()
          })
        )
      }
      if (item.type === 'text/html') {
        return new Promise(resolve =>
          item.getAsString(string => {
            const elems = DOMPARSER(string, 'text/html').querySelectorAll('audio')
            if (elems.length) resolve(elems.map(audio => audio?.src))
            resolve()
          })
        )
      }
      if (!item.type) {
        let folder = item.webkitGetAsEntry()
        folder = folder.isDirectory && folder
        if (folder) {
          return new Promise(resolve => {
            folder.createReader().readEntries(async entries => {
              const filePromises = entries.filter(entry => entry.isFile).map(file => new Promise(resolve => file.file(resolve)))
              resolve(await Promise.all(filePromises))
            })
          })
        }
        return
      }
      return
    })
    processFiles((await Promise.all(promises)).flat().filter(i => i))
  }

  if ('launchQueue' in window) {
    launchQueue.setConsumer(async launchParams => {
      if (!launchParams.files.length) {
        return
      }
      const promises = launchParams.files.map(file => file.getFile())
      // for some fucking reason, the same file can get passed multiple times, why? I still want to future-proof multi-files
      processFiles(
        (await Promise.all(promises)).filter((file, index, all) => {
          return (
            all.findIndex(search => {
              return search.name === file.name && search.size === file.size && search.lastModified === file.lastModified
            }) === index
          )
        })
      )
    })
  }
  const search = new URLSearchParams(location.search)
  for (const param of search) {
    if (audioRx.test(param[1])) {
      const filename = param[1].substring(Math.max(param[1].lastIndexOf('\\'), param[1].lastIndexOf('/')) + 1)
      const name = filename.substring(0, filename.lastIndexOf('.')) || filename
      files.push({
        name,
        url: param[1],
        type: 'audio/'
      })
      if (!current) current = files[0]
    }
  }
  function handlePopup() {
    if (!songs.length) {
      let input = document.createElement('input')
      input.type = 'file'
      input.multiple = 'multiple'

      input.onchange = ({ target }) => {
        processFiles([...target.files])
        input = null
      }
      input.click()
    }
  }
  let songs = []
  async function processFiles(files) {
    if (files.length) {
      const image = files.find(file => file.type.indexOf('image') === 0)
      const audio = files.filter(file => file.type.indexOf('audio') === 0)
      const songDataPromises = audio.map(async file => {
        const { common, format } = await parseBlob(file)
        const name = common?.title || file.name.substring(0, file.name.lastIndexOf('.')) || file.name
        const artist = common?.artist
        const album = common?.album
        const cover = (common?.picture?.length && new Blob([common.picture[0].data], { type: common.picture[0].format })) || image
        const duration = format?.duration
        const number = common?.track?.no
        return { file, name, artist, album, cover, duration, number }
      })
      songs = songs.concat(await Promise.all(songDataPromises)).sort((a, b) => (a.file.name > b.file.name ? 1 : b.file.name > a.file.name ? -1 : 0))
    }
  }
</script>

<div class="sticky-alerts d-flex flex-column-reverse">
  <InstallPrompt />
</div>
<div class="page-wrapper with-navbar-fixed-bottom">
  <Player bind:name {songs} on:popup={handlePopup} />
</div>

<svelte:head>
  <title>{name || 'Audio Player'}</title>
</svelte:head>

<svelte:window on:drop|preventDefault={handleDrop} on:dragover|preventDefault on:paste|preventDefault={handlePaste} />

<style>
  * {
    user-select: none;
  }
  .sticky-alerts {
    --sticky-alerts-top: auto;
    bottom: 1rem;
  }
</style>
