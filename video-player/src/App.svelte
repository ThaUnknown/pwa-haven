<script>
  import Player from './modules/Player.svelte'
  import {videoRx} from './modules/util.js'

  const DOMPARSER = new DOMParser().parseFromString.bind(new DOMParser())
  let name = ''
  let files

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
        return new Promise(resolve =>
          item.getAsString(url => {
            if (videoRx.test(url)) {
              const filename = url.substring(Math.max(url.lastIndexOf('\\'), url.lastIndexOf('/')) + 1)
              const name = filename.substring(0, filename.lastIndexOf('.')) || filename
              resolve({
                name,
                url,
                type: 'video/'
              })
            }
            resolve()
          })
        )
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
    files = (await Promise.all(promises)).flat().filter(i => i)
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
      console.log(files)
    })
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

<div class="page-wrapper with-navbar-fixed-bottom bg-very-dark" on:click={handlePopup}>
  <Player bind:files />
</div>

<svelte:head>
  <title>{name || 'Video Player'}</title>
</svelte:head>

<svelte:window
  on:drop|preventDefault={handleDrop}
  on:dragover|preventDefault
  on:paste|preventDefault={handlePaste} />

<style>
  * {
    user-select: none;
  }
</style>
