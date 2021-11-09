<script>
  import Player from './modules/Player.svelte'
  import { videoRx, subtitleExtensions } from './modules/util.js'
  import InstallPrompt from './modules/InstallPrompt.svelte'

  const DOMPARSER = new DOMParser().parseFromString.bind(new DOMParser())
  let name = ''
  let files = []

  // loading files
  function handleDrop({ dataTransfer }) {
    handleItems([...dataTransfer.items])
  }

  function handlePaste({ clipboardData }) {
    handleItems([...clipboardData.items])
  }

  async function handleItems(items) {
    const promises = items.map(item => {
      if (item.type.indexOf('video/') === 0) {
        return item.getAsFile()
      }
      if (item.type === 'text/plain') {
        if (item.kind === 'string') {
          return new Promise(resolve => {
            item.getAsString(url => {
              if (videoRx.test(url)) {
                const name = url.substring(Math.max(url.lastIndexOf('\\') + 2, url.lastIndexOf('/') + 1))
                resolve({
                  name,
                  url,
                  type: 'video/'
                })
              }
            })
          })
        } else if (item.kind === 'file') {
          return item.getAsFile()
        }
      }
      if (item.type === 'text/html') {
        return new Promise(resolve =>
          item.getAsString(string => {
            const elems = DOMPARSER(string, 'text/html').querySelectorAll('video')
            if (elems.length) resolve(elems.map(video => video?.src))
            resolve()
          })
        )
      }
      if (!item.type) {
        let entry = item.webkitGetAsEntry()
        if (entry?.isDirectory) {
          return new Promise(resolve => {
            folder.createReader().readEntries(async entries => {
              const filePromises = entries.filter(entry => entry.isFile).map(file => new Promise(resolve => file.file(resolve)))
              resolve(await Promise.all(filePromises))
            })
          })
        } else if (entry && !entry.isDirectory) {
          if (subtitleExtensions.some(ext => entry.name.endsWith(ext))) {
            return new Promise(resolve => entry.file(resolve))
          }
        }
        return
      }
      return
    })
    files = files.concat((await Promise.all(promises)).flat().filter(i => i))
    console.log(files)
  }

  if ('launchQueue' in window) {
    launchQueue.setConsumer(async launchParams => {
      if (!launchParams.files.length) {
        return
      }
      const promises = launchParams.files.map(file => file.getFile())
      // for some fucking reason, the same file can get passed multiple times, why? I still want to future-proof multi-files
      files = (await Promise.all(promises)).filter((file, index, all) => {
        return (
          all.findIndex(search => {
            return search.name === file.name && search.size === file.size && search.lastModified === file.lastModified
          }) === index
        )
      })
    })
  }
  const search = new URLSearchParams(location.search)
  for (const param of search) {
    if (videoRx.test(param[1])) {
      const name = param[1].substring(Math.max(param[1].lastIndexOf('\\') + 2, param[1].lastIndexOf('/') + 1))
      files.push({
        name,
        url: param[1],
        type: 'video/'
      })
      if (!current) current = files[0]
    }
  }
  function handlePopup() {
    if (!files.length) {
      let input = document.createElement('input')
      input.type = 'file'
      input.multiple = 'multiple'

      input.onchange = ({ target }) => {
        files = [...target.files]
        input = null
      }
      input.click()
    }
  }
</script>

<div class="sticky-alerts d-flex flex-column-reverse">
  <InstallPrompt />
</div>
<div class="page-wrapper" on:click={handlePopup}>
  <Player bind:files bind:name />
</div>

<svelte:head>
  <title>{name || 'Video Player'}</title>
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
