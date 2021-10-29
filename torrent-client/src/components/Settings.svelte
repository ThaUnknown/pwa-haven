<script context="module">
  import { get, set, createStore } from 'idb-keyval'
  import { writable } from 'svelte/store'
  const customStore = createStore('torrent-client-settings', 'settings')
  get('settings', customStore).then(async obj => {
    if (obj) {
      settingsObj = obj
      if (obj.folder) {
        await new Promise(resolve => {
          async function handleClick() {
            await obj.folder.requestPermission({ mode: 'readwrite' })
            document.removeEventListener('click', handleClick)
            resolve()
          }
          document.addEventListener('click', handleClick)
        })
      }
    }
    settings.set(settingsObj)
  })
  let settingsObj = {
    trackers: 'wss://tracker.openwebtorrent.com\nwss://spacetradersapi-chatbox.herokuapp.com:443/announce\nwss://peertube.cpy.re:443/tracker/socket',
    speed: 10,
    compact: false,
    folder: null
  }
  export const settings = writable(null)
</script>

<script>
  import { onMount } from 'svelte'
  function saveSettings() {
    set('settings', settingsObj, customStore)
    settings.set(settingsObj)
  }
  let folderName
  async function pickFolder() {
    const handle = await window.showDirectoryPicker()
    await handle.requestPermission({ mode: 'readwrite' })
    settingsObj.folder = handle
    folderName.value = 'Folder: ' + handle.name || 'none'
    console.log(handle, folderName)
    saveSettings()
  }
  onMount(() => {
    if (settingsObj.folder) folderName.value = 'Folder: ' + settingsObj.folder.name || 'none'
  })
</script>

<div class="content flex-row flex-wrap mw-600">
  <div class="form-control-lg w-600 h-150 mb-10">
    <h1 class="content-title font-size-22">Tracker List</h1>
    <textarea class="form-control w-600 h-100" bind:value={settingsObj.trackers} on:change={saveSettings} />
  </div>
  {#if 'showDirectoryPicker' in window}
    <div
      class="input-group mb-10 form-control-lg w-600"
      data-toggle="tooltip"
      data-placement="top"
      data-title="Specifies Folder To Store Torrents In, Which Is Accessible Externally."
      on:click={pickFolder}>
      <div class="input-group-prepend">
        <button class="btn btn-lg btn-primary" type="button">Choose Folder</button>
      </div>
      <input type="text" class="form-control form-control-lg pl-10" placeholder="Folder" bind:this={folderName} />
    </div>
  {/if}
  <div
    class="input-group w-300 mb-10 form-control-lg"
    data-toggle="tooltip"
    data-placement="top"
    data-title="Download/Upload Speed Limit For Torrents, Higher Values Increase CPU Usage">
    <div class="input-group-prepend">
      <span class="input-group-text w-150 justify-content-center">Max Speed</span>
    </div>
    <input id="torrent7" type="number" bind:value={settingsObj.speed} on:change={saveSettings} min="0" max="50" class="form-control text-right form-control-lg" />
    <div class="input-group-append">
      <span class="input-group-text">MB/s</span>
    </div>
  </div>
  <div class="custom-switch mb-10 ml-10 font-size-16 w-300" data-toggle="tooltip" data-placement="top" data-title="Compact View For Torrent List">
    <input type="checkbox" id="compact" bind:checked={settingsObj.compact} on:change={saveSettings} />
    <label for="compact">Compact View</label>
  </div>
</div>
