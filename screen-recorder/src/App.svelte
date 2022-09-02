<script>
  import InstallPrompt from '../../shared/InstallPrompt.svelte'
  import { fixDuration } from './lib/durationfix.js'
  import { createStore, get, set } from 'idb-keyval'

  navigator.serviceWorker.register('/sw.js')

  const customStore = createStore('screen-recorder-settings', 'settings')
  let settings = {
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
  let folderName = null

  get('settings', customStore).then(obj => {
    if (obj) {
      settings = obj
      if (obj.folder) folderName = obj.folder.name || 'none'
    }
  })

  $: set('settings', settings, customStore)
  async function pickFolder () {
    const handle = await window.showDirectoryPicker()
    const res = await handle.requestPermission({ mode: 'readwrite' })
    settings.folder = handle
    folderName = handle.name || 'none'
    return res
  }

  let startTime = null
  let mediaRecorder = null
  let displayStream = null
  let voiceStream = null
  let audioContext = null
  const handleRecord = async stream => {
    // to collect stream chunks
    const recordedChunks = []
    mediaRecorder = new MediaRecorder(stream, {
      audioBitsPerSecond: settings.audrate * 1000,
      videoBitsPerSecond: settings.vidrate * 1000000,
      mimeType: `video/${settings.container === 'mkv' ? 'x-matroska' : 'webm'};codecs=${settings.codec}`
    })
    startTime = new Date()
    const fileHandle = await settings.folder?.getFileHandle(`${dateString(startTime)}.${settings.container}`, { create: true })
    const writable = await fileHandle?.createWritable()
    if (writable) {
      mediaRecorder.ondataavailable = ({ data }) => {
        if (data.size > 0) writable.write(data)
      }
    } else {
      mediaRecorder.ondataavailable = ({ data }) => {
        if (data.size > 0) recordedChunks.push(data)
      }
    }
    mediaRecorder.onstop = async () => {
      const duration = Date.now() - startTime
      cleanup()
      if (writable) {
        await writable.close() // force file save
        const saved = await fileHandle?.createWritable()
        await saved.write({ type: 'write', position: 0, data: await fixDuration(await fileHandle.getFile(), duration) }) // overwrite with duration fix
        await saved.close() // force file save
      } else {
        const fixed = await fixDuration(new Blob([recordedChunks], { type: recordedChunks[0].mimeType }), duration)
        const downloadEl = document.createElement('a')
        downloadEl.href = URL.createObjectURL(fixed)
        downloadEl.download = `${dateString(startTime)}.${settings.container}`
        downloadEl.click()
        URL.revokeObjectURL(fixed)
      }
    }

    mediaRecorder.start(200) // 200ms interval
  }
  let tracks = []
  function cleanup () {
    for (const track of tracks) {
      track.stop()
    }
    tracks = []
    if (audioContext) {
      audioContext.close()
      audioContext = null
    }
    mediaRecorder?.stop()
    mediaRecorder = null
    voiceStream = null
    displayStream = null
  }
  async function record () {
    if (mediaRecorder) return cleanup()

    if ('showDirectoryPicker' in window) {
      const res = !settings.folder ? await pickFolder() : await settings.folder.requestPermission({ mode: 'readwrite' })
      if (res !== 'granted') return cleanup()
    }
    try {
      if (settings.mic) {
        voiceStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: settings.cancellation,
            noiseSuppression: settings.supression
          },
          video: false
        })
        tracks.push(...voiceStream.getTracks())
      }
      displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: settings.fps, cursor: settings.cursor },
        audio: {
          echoCancellation: false,
          noiseSuppression: false
        }
      })
    } catch (e) {
      cleanup()
      console.error(e)
    }
    const displayTracks = displayStream.getTracks()
    tracks.push(...displayTracks)
    displayTracks[0].onended = cleanup
    if (settings.mic) {
      let dest = null
      if (displayStream.getAudioTracks().length) {
        audioContext = new AudioContext()
        const audio1 = audioContext.createMediaStreamSource(voiceStream)
        const audio2 = audioContext.createMediaStreamSource(displayStream)
        dest = audioContext.createMediaStreamDestination()
        audio1.connect(dest)
        audio2.connect(dest)
      }
      handleRecord(new MediaStream([...displayStream.getVideoTracks(), ...(dest?.stream || voiceStream).getAudioTracks()]))
    } else {
      handleRecord(new MediaStream(displayTracks))
    }
  }
  function dateString (date) {
    return new Intl.DateTimeFormat('en-GB', { dateStyle: 'short', timeStyle: 'medium' }).format(date).replace(/[:/]/g, '.')
  }
</script>

<div class='sticky-alerts d-flex flex-column-reverse'>
  <InstallPrompt />
</div>
<div class='w-full h-full overflow-hidden position-relative dragarea d-flex align-items-center justify-content-center overflow-auto'>
  <div class='content flex-row flex-wrap mw-600'>
    {#if 'getDisplayMedia' in navigator.mediaDevices}
      {#if 'showDirectoryPicker' in window}
        <div class='input-group mb-10 w-300' on:click={pickFolder}>
          <div class='input-group-prepend'>
            <button class='btn btn-primary w-150' type='button'>Choose Folder</button>
          </div>
          <input type='text' class='form-control pl-10' placeholder='Folder' value={folderName} />
        </div>
      {:else}
        <div class='font-size-24 font-weight-bold text-danger'>Warning</div>
        <div class='pb-10'>Your browser doesn't support direct file system access.<br>The video will be stored in memory until the recording finishes.<br>Chrome/Edge/Brave is recommended.</div>
      {/if}
      <div class='input-group mb-10 w-300'>
        <div class='input-group-prepend'>
          <span class='input-group-text w-150 justify-content-center'>Cursor Display</span>
        </div>
        <select class='form-control' bind:value={settings.cursor}>
          <option value='never'>Never</option>
          <option value='always'>Always</option>
          <option value='motion'>Motion</option>
        </select>
      </div>
      <div class='input-group mb-10 w-300'>
        <div class='input-group-prepend'>
          <span class='input-group-text w-150 justify-content-center'>Video Container</span>
        </div>
        <select class='form-control' bind:value={settings.container}>
          <option value='mkv'>mkv</option>
          <option value='webm'>webm</option>
        </select>
      </div>
      <div class='input-group mb-10 w-300'>
        <div class='input-group-prepend'>
          <span class='input-group-text w-150 justify-content-center'>Video Codec</span>
        </div>
        <select class='form-control' bind:value={settings.codec}>
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
        <input type='number' bind:value={settings.fps} min='0' max='120' class='form-control' />
        <div class='input-group-append'>
          <span class='input-group-text w-50'>FPS</span>
        </div>
      </div>
      <div class='input-group w-300 mb-10'>
        <div class='input-group-prepend'>
          <span class='input-group-text w-150 justify-content-center'>Video Bitrate</span>
        </div>
        <input type='number' bind:value={settings.vidrate} min='0' max='50' class='form-control' />
        <div class='input-group-append'>
          <span class='input-group-text w-50'>MB/s</span>
        </div>
      </div>
      <div class='input-group w-300 mb-10'>
        <div class='input-group-prepend'>
          <span class='input-group-text w-150 justify-content-center'>Audio Bitrate</span>
        </div>
        <input type='number' bind:value={settings.audrate} min='0' max='128' class='form-control' />
        <div class='input-group-append'>
          <span class='input-group-text w-50'>KB/s</span>
        </div>
      </div>
      <div class='input-group w-300 mb-10'>
        <div class='input-group-prepend'>
          <span class='input-group-text w-150 justify-content-center'>Sample Rate</span>
        </div>
        <input type='number' bind:value={settings.samplerate} min='22' max='192' class='form-control' />
        <div class='input-group-append'>
          <span class='input-group-text w-50'>KHz</span>
        </div>
      </div>
      <div class='input-group w-300 mb-10'>
        <div class='input-group-prepend'>
          <span class='input-group-text w-150 justify-content-center'>Sample Size</span>
        </div>
        <input type='number' bind:value={settings.samplesize} min='8' max='32' class='form-control' />
        <div class='input-group-append'>
          <span class='input-group-text w-50'>bits</span>
        </div>
      </div>
      <div class='input-group w-300 mb-10'>
        <div class='input-group-prepend'>
          <span class='input-group-text w-150 justify-content-center'>Audio Channels</span>
        </div>
        <input type='number' bind:value={settings.channels} min='1' max='8' class='form-control' />
        <div class='input-group-append'>
          <span class='input-group-text'>Channels</span>
        </div>
      </div>
      <div class='custom-switch mb-10 font-size-16 w-300'>
        <input type='checkbox' id='compact' bind:checked={settings.mic} />
        <label for='compact'>Record Microphone</label>
      </div>
      <div class='custom-switch mb-10 font-size-16 w-300'>
        <input type='checkbox' id='mic' bind:checked={settings.supression} />
        <label for='mic'>Noise Suppression</label>
      </div>
      <div class='custom-switch mb-10 font-size-16 w-300'>
        <input type='checkbox' id='cancel' bind:checked={settings.cancellation} />
        <label for='cancel'>Echo Cancellation</label>
      </div>

      <button class='btn mt-10' on:click={record}>{mediaRecorder ? 'Stop Recording' : 'Start Recording'}</button>
    {:else}
      <h1 class='font-weight-bold'>Media Recording Unsupported!</h1>
    {/if}
  </div>
</div>

<svelte:head>
  <title>Screen Recorder</title>
</svelte:head>

<style>
  * {
    user-select: none;
  }
  :root {
    --tooltip-width: 17rem;
  }
  .sticky-alerts {
    --sticky-alerts-top: auto;
    bottom: 1rem;
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
