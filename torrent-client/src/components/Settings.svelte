<script context="module">
  import { get, set, createStore } from 'idb-keyval'
  const customStore = createStore('torrent-client-settings', 'settings')
  get('settings', customStore).then(obj => {
    if (obj) settings = obj
  })
  export let settings = {
    trackers: 'wss://tracker.openwebtorrent.com\nwss://spacetradersapi-chatbox.herokuapp.com:443/announce\nwss://peertube.cpy.re:443/tracker/socket',
    speed: 10,
    compact: false,
    folder: null
  }
  function saveSettings() {
    console.log(settings)
    if (settings) set('settings', settings, customStore)
  }
  let folderName = null
  async function pickFolder() {
    const handle = await window.showDirectoryPicker()
    await handle.requestPermission({ mode: 'readwrite' })
    settings.folder = handle
    folderName = 'Folder: ' + handle.name || 'none'
    saveSettings()
  }
</script>

<div class="content flex-row flex-wrap mw-600">
  <div class="form-control-lg w-600 h-150 mb-10">
    <h1 class="content-title font-size-22">Tracker List</h1>
    <textarea class="form-control w-600 h-100" bind:value={settings.trackers} on:change={saveSettings} />
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
      <input type="text" readonly class="form-control form-control-lg pl-10" placeholder="Folder" value={folderName} />
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
    <input id="torrent7" type="number" bind:value={settings.speed} on:change={saveSettings} min="0" max="50" class="form-control text-right form-control-lg" />
    <div class="input-group-append">
      <span class="input-group-text">MB/s</span>
    </div>
  </div>
  <div class="custom-switch mb-10 ml-10 font-size-16 w-300" data-toggle="tooltip" data-placement="top" data-title="Compact View For Torrent List">
    <input type="checkbox" id="compact" bind:checked={settings.compact} on:change={saveSettings} />
    <label for="compact">Compact View</label>
  </div>
</div>
