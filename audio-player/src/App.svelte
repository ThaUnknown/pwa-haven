<script>
  let src = null
  let name = ""
  let audio = null
  let volume = 1
  $: progress = currentTime / duration
  $: targetTime = currentTime
  let duration = -1
  let currentTime = 0
  let paused = true
  let muted = false
  let loop = false
  let wasPaused = true
  let cover
  let defaultCover
  const DOMPARSER = new DOMParser().parseFromString.bind(new DOMParser())

  function setSource(target) {
    if (src) URL.revokeObjectURL(src) // gc
    let file = null
    if (target.constructor === String) {
      src = target
      file = target
    } else {
      src = URL.createObjectURL(target)
      file = target.name
    }
    const filename = file.substring(Math.max(file.lastIndexOf("\\"), file.lastIndexOf("/")) + 1)
    name = filename.substring(0, filename.lastIndexOf(".")) || filename
  }
  function setCover(target) {
    if (cover) URL.revokeObjectURL(cover)
    cover = (target && URL.createObjectURL(target)) || defaultCover
  }
  // loading files
  function handleDrop({ dataTransfer }) {
    const { files, items } = dataTransfer
    if (files && files[0]) {
      if (files[0].type) {
        setSource(files[0])
        setCover()
      } else {
        // handle directory, find cover art, oh man why am i doing this to myself

        // TODO: WARN: this should use FSAccessAPI instead of this deprecated api!!!
        // Reason against is it adds an extra dependency which might not be supported, ehkem brave.
        let folder = items[0].webkitGetAsEntry()
        folder = folder.isDirectory && folder
        if (folder) {
          folder.createReader().readEntries(async (entries) => {
            const filePromises = entries.filter((entry) => entry.isFile).map((file) => new Promise((resolve) => file.file(resolve)))
            const files = await Promise.all(filePromises)
            const cover = files.find((file) => file.type.indexOf("image") === 0)
            const songs = files.filter((file) => file.type.indexOf("audio") === 0)
            setSource(songs[0])
            setCover(cover)

            // this is hacky, but audio context api uses x100 CPU and x140 RAM
            const songDataPromises = songs.map((song) => {
              return new Promise((resolve) => {
                let audio = document.createElement("audio")
                audio.preload = "metadata"
                audio.onloadedmetadata = () => {
                  resolve(audio.duration)
                  URL.revokeObjectURL(audio.src)
                  audio = null
                }
                audio.src = URL.createObjectURL(song)
              })
            })
            const songData = await Promise.all(songDataPromises)
            console.log(cover, songs, songData)
          })
        }
      }
    }
  }

  function handlePaste(e) {
    const item = e.clipboardData.items[0]
    if (item?.type.indexOf("audio") === 0) {
      setSource(item.getAsFile())
    } else if (item?.type === "text/plain") {
      item.getAsString(setSource)
    } else if (item?.type === "text/html") {
      item.getAsString((text) => {
        const audio = DOMPARSER(text, "text/html").querySelector("audio")
        if (audio) setSource(audio.src)
      })
    }
  }

  if ("launchQueue" in window) {
    launchQueue.setConsumer(async (launchParams) => {
      if (!launchParams.files.length) {
        return
      }
      setSource(await launchParams.files[0].getFile())
    })
  }
  function toTS(sec, full) {
    if (isNaN(sec) || sec < 0) {
      return full ? "0:00:00.00" : "00:00"
    }
    const hours = Math.floor(sec / 3600)
    let minutes = Math.floor(sec / 60) - hours * 60
    let seconds = full ? (sec % 60).toFixed(2) : Math.floor(sec % 60)
    if (minutes < 10) minutes = "0" + minutes
    if (seconds < 10) seconds = "0" + seconds
    return hours > 0 || full ? hours + ":" + minutes + ":" + seconds : minutes + ":" + seconds
  }

  // todo use a store
  function handleMouseDown({ target }) {
    wasPaused = paused
    paused = true
    targetTime = target.value * duration
  }
  function handleMouseUp() {
    paused = wasPaused
    currentTime = targetTime
  }
  function handleProgress({ target }) {
    targetTime = target.value * duration
  }

  function playPause() {
    paused = !paused
  }
  function toggleMute() {
    muted = !muted
  }
  function toggleLoop() {
    loop = !loop
  }
</script>

<audio {src} bind:this={audio} autoplay bind:volume bind:duration bind:currentTime bind:paused bind:muted {loop} />
<div class="page-wrapper with-navbar-fixed-bottom">
  <div class="content-wrapper">
    <img src={cover} alt="cover" />
  </div>
  <nav class="navbar navbar-fixed-bottom p-0 d-flex flex-column border-0">
    <div class="d-flex w-full prog">
      <input
        class="w-full top-0"
        type="range"
        min="0"
        max="1"
        bind:value={progress}
        on:mousedown={handleMouseDown}
        on:mouseup={handleMouseUp}
        on:input={handleProgress}
        step="any"
        style="--value: {progress * 100}%" />
    </div>
    <div class="d-flex w-full flex-grow-1 px-20 justify-content-between">
      <div class="d-flex align-items-center">
        <span class="material-icons font-size-20 ctrl pointer" type="button"> skip_previous </span>
        <span class="material-icons font-size-24 ctrl pointer" type="button" on:click={playPause}>
          {paused ? "play_arrow" : "pause"}
        </span>
        <span class="material-icons font-size-20 ctrl pointer" type="button"> skip_next </span>
        <div class="text-muted center ml-10 text-nowrap">
          {toTS(targetTime)} / {toTS(duration)}
        </div>
      </div>
      <div class="center px-20 mw-0">
        <span class="text-truncate text-muted">{name}</span>
      </div>
      <div class="d-flex align-items-center">
        <input class="ml-auto px-5 h-half" type="range" min="0" max="1" bind:value={volume} step="any" style="--value: {volume * 100}%" />
        <span class="material-icons font-size-20 ctrl pointer" type="button" on:click={toggleMute}>
          {muted ? "volume_off" : "volume_up"}
        </span>
        <span class="material-icons font-size-20 ctrl pointer" type="button" on:click={toggleLoop}>
          {loop ? "repeat_one" : "repeat"}
        </span>
      </div>
    </div>
  </nav>
</div>

<svelte:head>
  <title>{name || "Audio Player"}</title>
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
  img:not([src]) {
    display: none;
  }
  input[type="range"] {
    -webkit-appearance: none;
    background: transparent;
    margin: 0;
    cursor: pointer;
    height: 8px;
  }

  input[type="range"]:focus {
    outline: none;
  }

  input[type="range"]::-webkit-slider-runnable-track {
    height: 3px;
  }

  input[type="range"]::-webkit-slider-thumb {
    height: 0;
    width: 0;
    border-radius: 50%;
    background: #ff3c00;
    -webkit-appearance: none;
    appearance: none;
    transition: all 0.1s ease;
  }

  input[type="range"]:hover::-webkit-slider-thumb {
    height: 12px;
    width: 12px;
    margin-top: -4px;
  }

  input[type="range"] {
    --volume: 0%;
  }

  input[type="range"]::-webkit-slider-runnable-track {
    background: linear-gradient(90deg, #ff3c00 var(--value), rgba(255, 255, 255, 0.2) var(--value));
  }

  .pointer {
    cursor: pointer;
  }

  .ctrl {
    width: 3.5rem;
    height: 3.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .center {
    display: flex;
    align-items: center;
    justify-content: center;
    line-height: 1;
  }

  .prog {
    position: relative;
    height: 0.2rem;
  }
  .prog input {
    position: absolute;
    margin-top: -0.7rem;
    height: 1.4rem;
  }
  .mw-0 {
    min-width: 0;
  }
</style>
