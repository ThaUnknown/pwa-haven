<script>
  import Player from './modules/Player.svelte'

  const DOMPARSER = new DOMParser().parseFromString.bind(new DOMParser())
  let name = ''
  let files

  // loading files
  function handleDrop({ dataTransfer }) {
    const { items } = dataTransfer
    handleItems([...items])
  }

  function handlePaste({ clipboardData }) {
    const { items } = clipboardData
    handleItems([...items])
  }

  async function handleItems(items) {
    const promises = items.map(item => {
      if (item.type.indexOf('audio') === 0) {
        return item.getAsFile()
      }
      if (item.type === 'text/plain') {
        return new Promise(resolve => item.getAsString(resolve))
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
    files = (await Promise.all(promises)).flat().filter(i => i)
  }

  if ('launchQueue' in window) {
    launchQueue.setConsumer(async launchParams => {
      if (!launchParams.files.length) {
        return
      }
      const promises = launchParams.files.map(file => file.getFile())
      files = await Promise.all(promises)
    })
  }
</script>

<div class="page-wrapper with-navbar-fixed-bottom">
  <Player bind:name bind:files />
</div>

<svelte:head>
  <title>{name || 'Audio Player'}</title>
</svelte:head>

<svelte:window
  on:drop|preventDefault={handleDrop}
  on:dragenter|preventDefault
  on:dragover|preventDefault
  on:dragstart|preventDefault
  on:dragleave|preventDefault
  on:paste|preventDefault={handlePaste} />

<style>
  * {
    user-select: none;
  }
</style>
