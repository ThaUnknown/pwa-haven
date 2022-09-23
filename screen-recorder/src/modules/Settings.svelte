<script context='module'>
  import { createStore, get, set } from 'idb-keyval'
  import { writable } from 'svelte/store'
  let defaultSettings = {
    fps: 60,
    folder: null,
    vidrate: 25,
    audrate: 128,
    mic: false,
    supression: true,
    cancellation: false,
    channels: 2,
    samplesize: 24,
    samplerate: 48,
    codec: 'vp8',
    container: 'webm',
    cursor: 'never'
  }
  export let settings = defaultSettings

  const folderName = writable(null)
  const customStore = createStore('screen-recorder-settings', 'settings')

  const settingsProxy = writable(settings)

  settingsProxy.subscribe((obj) => {
    if (obj !== defaultSettings) {
      settings = obj
      set('settings', settings, customStore)
    } else {
      defaultSettings = null
    }
  }, () => {})
  get('settings', customStore).then(obj => {
    if (obj) {
      settingsProxy.set(obj)
      if (obj.folder) folderName.set(obj.folder.name || 'none')
    }
  })

  export async function pickFolder () {
    const handle = await window.showDirectoryPicker()
    const res = await handle.requestPermission({ mode: 'readwrite' })
    settings.folder = handle
    set('settings', settings, customStore)
    folderName.set(handle.name || 'none')
    return res
  }
</script>

{#if 'showDirectoryPicker' in window}
  <div class='input-group mb-10 w-300' on:click={pickFolder}>
    <div class='input-group-prepend'>
      <button class='btn btn-primary w-150' type='button'>Choose Folder</button>
    </div>
    <input type='text' class='form-control pl-10' placeholder='Folder' value={$folderName} />
  </div>
{:else}
  <div class='font-size-24 font-weight-bold text-danger'>Warning</div>
  <div class='pb-10'>Your browser doesn't support direct file system access.<br>The video will be stored in memory until the recording finishes.<br>Chrome/Edge/Brave is recommended.</div>
{/if}
<div class='input-group mb-10 w-300'>
  <div class='input-group-prepend'>
    <span class='input-group-text w-150 justify-content-center'>Cursor Display</span>
  </div>
  <select class='form-control' bind:value={$settingsProxy.cursor}>
    <option value='never'>Never</option>
    <option value='always'>Always</option>
    <option value='motion'>Motion</option>
  </select>
</div>
<div class='input-group mb-10 w-300'>
  <div class='input-group-prepend'>
    <span class='input-group-text w-150 justify-content-center'>Video Container</span>
  </div>
  <select class='form-control' bind:value={$settingsProxy.container}>
    <option value='mkv'>mkv</option>
    <option value='webm'>webm</option>
  </select>
</div>
<div class='input-group mb-10 w-300'>
  <div class='input-group-prepend'>
    <span class='input-group-text w-150 justify-content-center'>Video Codec</span>
  </div>
  <select class='form-control' bind:value={$settingsProxy.codec}>
    <option value='vp9'>vp9</option>
    <option value='vp8'>vp8</option>
    <option value='h264'>h264</option>
    <option value='avc1'>avc1</option>
  </select>
</div>
<div class='input-group w-300 mb-10'>
  <div class='input-group-prepend'>
    <span class='input-group-text w-150 justify-content-center'>Video Framerate</span>
  </div>
  <input type='number' bind:value={$settingsProxy.fps} min='0' max='120' class='form-control' />
  <div class='input-group-append'>
    <span class='input-group-text w-50'>FPS</span>
  </div>
</div>
<div class='input-group w-300 mb-10'>
  <div class='input-group-prepend'>
    <span class='input-group-text w-150 justify-content-center'>Video Bitrate</span>
  </div>
  <input type='number' bind:value={$settingsProxy.vidrate} min='0' max='50' class='form-control' />
  <div class='input-group-append'>
    <span class='input-group-text w-50'>MB/s</span>
  </div>
</div>
<div class='input-group w-300 mb-10'>
  <div class='input-group-prepend'>
    <span class='input-group-text w-150 justify-content-center'>Audio Bitrate</span>
  </div>
  <input type='number' bind:value={$settingsProxy.audrate} min='0' max='128' class='form-control' />
  <div class='input-group-append'>
    <span class='input-group-text w-50'>KB/s</span>
  </div>
</div>
<div class='input-group w-300 mb-10'>
  <div class='input-group-prepend'>
    <span class='input-group-text w-150 justify-content-center'>Sample Rate</span>
  </div>
  <input type='number' bind:value={$settingsProxy.samplerate} min='22' max='192' class='form-control' />
  <div class='input-group-append'>
    <span class='input-group-text w-50'>KHz</span>
  </div>
</div>
<div class='input-group w-300 mb-10'>
  <div class='input-group-prepend'>
    <span class='input-group-text w-150 justify-content-center'>Sample Size</span>
  </div>
  <input type='number' bind:value={$settingsProxy.samplesize} min='8' max='32' class='form-control' />
  <div class='input-group-append'>
    <span class='input-group-text w-50'>bits</span>
  </div>
</div>
<div class='input-group w-300 mb-10'>
  <div class='input-group-prepend'>
    <span class='input-group-text w-150 justify-content-center'>Audio Channels</span>
  </div>
  <input type='number' bind:value={$settingsProxy.channels} min='1' max='8' class='form-control' />
  <div class='input-group-append'>
    <span class='input-group-text'>Channels</span>
  </div>
</div>
<div class='custom-switch mb-10 font-size-16 w-300'>
  <input type='checkbox' id='compact' bind:checked={$settingsProxy.mic} />
  <label for='compact'>Record Microphone</label>
</div>
<div class='custom-switch mb-10 font-size-16 w-300'>
  <input type='checkbox' id='mic' bind:checked={$settingsProxy.supression} />
  <label for='mic'>Noise Suppression</label>
</div>
<div class='custom-switch mb-10 font-size-16 w-300'>
  <input type='checkbox' id='cancel' bind:checked={$settingsProxy.cancellation} />
  <label for='cancel'>Echo Cancellation</label>
</div>
