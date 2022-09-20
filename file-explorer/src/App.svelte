<script>
  import InstallPrompt from '../../shared/InstallPrompt.svelte'
  import { get, set, createStore } from 'idb-keyval'
  import Breadcrumbs from './Breadcrumbs.svelte'

  navigator.serviceWorker.register('/sw.js')

  let currentHandle = null

  let driveHandles = {}

  const db = createStore('file-explorer', 'drives')
  async function load () {
    driveHandles = (await get('drives', db)) || {}
  }
  load()

  async function handleInput ({ dataTransfer }) {
    const drives = [...dataTransfer.files].map(file => file.name.endsWith('_drive') && file.name[0])
    console.log(drives)
    const handles = await Promise.all([...dataTransfer.items].map(item => item.getAsFileSystemHandle()))
    currentHandle = handles[0]
    for (let i = 0; i < drives.length; ++i) {
      const drive = drives[i]
      if (drive) {
        driveHandles[drive] = handles[i]
      }
    }
    set('drives', driveHandles, db)
    console.log(handles[0])
  }

  async function asyncItToArr (asyncIterator) {
    const arr = []
    for await (const i of asyncIterator) arr.push(i)
    return arr
  }

  async function getEntries (handle) {
    if (!handle) return
    const entries = handle.entries()
    const arr = (await asyncItToArr(entries)).filter(([name]) => !(name.startsWith('$') || name.endsWith('.sys')))
    arr.sort(([aname, aprot], [bname, bprot]) => {
      if (aprot.constructor === bprot.constructor) {
        return aname - bname
      } else {
        return aprot instanceof FileSystemDirectoryHandle ? -1 : 1
      }
    })
    return arr
  }

  async function useHandle (handle) {
    if (handle instanceof FileSystemDirectoryHandle) {
      await handle.requestPermission({ mode: 'read' })
      if (currentHandle) crumbs.push(currentHandle)
      crumbs = crumbs
      currentHandle = handle
    } else {
      console.log(handle)
    }
  }

  let crumbs = []

  function popCrum () {
    currentHandle = crumbs.pop()
    crumbs = crumbs
  }

</script>

<svelte:window
  on:drop|preventDefault={handleInput}
  on:dragenter|preventDefault
  on:dragover|preventDefault
  on:dragstart|preventDefault
  on:dragleave|preventDefault
  on:paste|preventDefault={handleInput} />

<div class='sticky-alerts d-flex flex-column-reverse'>
  <InstallPrompt />
</div>
<div class='page-wrapper'>
  <div class='content-wrapper overflow-y-auto h-full'>
    {#if !currentHandle}
      {#if !Object.values(driveHandles).length}
        Drop a Root Drive
      {:else}
        {#each Object.entries(driveHandles) as [drive, handle]}
          <div>
            <a href='#' class='directory' on:click={() => useHandle(handle)}>
              {drive}
            </a>
          </div>
        {/each}
      {/if}
    {:else}
      <Breadcrumbs bind:crumbs bind:currentHandle />
      {#await getEntries(currentHandle)}
        Loading...
      {:then entries}
        {#if crumbs.length}
          <div>
            <a href='#' class='directory' on:click={popCrum}>
              ...
            </a>
          </div>
        {/if}
        {#each entries as [name, handle]}
          <div>
            <a href='#' class:directory={handle.kind === 'directory'} on:click={() => useHandle(handle)}>
              {name}
            </a>
          </div>
        {/each}
      {/await}
    {/if}
  </div>
</div>

<style>
  .sticky-alerts {
    --sticky-alerts-top: auto;
    bottom: 1rem;
  }
  .directory {
    padding: 0 0 0 1.5em;
    background: url('/folder.svg') 0 0.1em no-repeat;
    background-size: 1em 1em;
  }
</style>
