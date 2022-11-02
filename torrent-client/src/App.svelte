<script>
  import InstallPrompt from '../../shared/InstallPrompt.svelte'
  import Sidebar from './components/sidebar/Sidebar.svelte'
  import TorrentList from './components/torrentlist/TorrentList.svelte'
  import TorrentInfo from './components/TorrentInfo.svelte'
  import AddTorrent from './components/AddTorrent.svelte'
  import Settings from './components/Settings.svelte'
  import { current } from './modules/client.js'
  import { onMount } from 'svelte'

  let selected = null
  let handleTorrent
  let prompt = null

  // loading files
  function handleDrop ({ dataTransfer }) {
    handleItems([...dataTransfer.items])
  }

  function handlePaste ({ clipboardData }) {
    handleItems([...clipboardData.items])
  }

  async function handleItems (items) {
    const promises = items.map(item => {
      if (item.kind === 'file') {
        return item.getAsFile()
      }
      if (item.type === 'text/plain') {
        if (item.kind === 'string') {
          return new Promise(resolve => {
            item.getAsString(url => {
              if (/(^magnet:)|(^[A-F\d]{8,40}$)|(.*\.torrent$)/i.test(url)) {
                resolve(url)
              } else {
                resolve()
              }
            })
          })
        } else if (item.kind === 'file') {
          return item.getAsFile()
        }
      }
      if (!item.type) {
        const entry = item.webkitGetAsEntry()
        if (entry?.isDirectory) {
          return new Promise(resolve => {
            folder.createReader().readEntries(async entries => {
              const filePromises = entries.filter(entry => entry.isFile).map(file => new Promise(resolve => file.file(resolve)))
              resolve(await Promise.all(filePromises))
            })
          })
        } else if (entry && !entry.isDirectory) {
          return new Promise(resolve => entry.file(resolve))
        }
      }
    })
    handleTorrent((await Promise.all(promises)).flat().filter(i => i))
    prompt?.classList.add('show')
  }
  onMount(() => {
    const search = new URLSearchParams(location.search)
    const files = []
    for (const param of search) files.push(param[1])
    if (files.length) {
      handleTorrent(files)
      prompt.classList.add('show')
    }

    if ('launchQueue' in window) {
      launchQueue.setConsumer(async launchParams => {
        if (!launchParams.files.length) {
          return
        }
        handleTorrent([await launchParams.files[0].getFile()])
        prompt.classList.add('show')
      })
    }
  })
</script>

<div class='sticky-alerts d-flex flex-column-reverse'>
  <InstallPrompt />
</div>
<div class='modal' class:show={$current === 'Add Torrent'} id='modal-add' tabIndex='-1' role='dialog' data-overlay-dismissal-disabled='true' bind:this={prompt}>
  <AddTorrent bind:handleTorrent />
</div>
<div class='page-wrapper with-sidebar'>
  <Sidebar />
  <div class='content-wrapper d-flex flex-column justify-content-between'>
    {#if $current !== 'Settings'}
      <div class='overflow-x-auto overflow-y-scroll flex-grow-1'>
        <TorrentList bind:selected />
      </div>
      <TorrentInfo bind:selected />
    {:else}
      <Settings />
    {/if}
  </div>
</div>

<svelte:head>
  <title>Torrent Client</title>
</svelte:head>

<svelte:window on:drop|preventDefault={handleDrop} on:dragover|preventDefault on:paste={handlePaste} />

<style>
  * {
    user-select: none;
  }
  .sticky-alerts {
    --sticky-alerts-top: auto;
    bottom: 1rem;
  }
  :global(.pointer) {
    cursor: pointer;
  }
  :root {
    --tooltip-width: 17rem;
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
