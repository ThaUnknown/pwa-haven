<script>
  let src = null;
  let name = null;
  let audio = null;
  let volume = 1;
  $: progress = currentTime / duration;
  let duration = 1;
  let currentTime = 0;
  let targetTime = 0;
  let paused = true;
  let wasPaused = true;
  const DOMPARSER = new DOMParser().parseFromString.bind(new DOMParser());

  function setSource(target) {
    if (src) URL.revokeObjectURL(src); // gc
    if (target.constructor === String) {
      src = target;
      const startIndex = Math.max(target.lastIndexOf('\\'), target.lastIndexOf('/')) + 1;
      name = target.substring(startIndex);
    } else {
      src = URL.createObjectURL(target);
      const startIndex = Math.max(target.name.lastIndexOf('\\'), target.name.lastIndexOf('/')) + 1;
      name = target.name.substring(startIndex);
    }
  }
  // loading files
  function handleDrop(e) {
    const {
      dataTransfer: { files },
    } = e;
    if (files && files[0]) {
      if (files[0].type) {
        setSource(files[0]);
      } else {
        // handle directory, find cover art, oh man why am i doing this to myself
      }
    }
  }

  function handlePaste(e) {
    const item = e.clipboardData.items[0];
    if (item?.type.indexOf('audio') === 0) {
      setSource(item.getAsFile());
    } else if (item?.type === 'text/plain') {
      item.getAsString(setSource);
    } else if (item?.type === 'text/html') {
      item.getAsString((text) => {
        const audio = DOMPARSER(text, 'text/html').querySelector('audio');
        if (audio) setSource(audio.src);
      });
    }
  }

  if ('launchQueue' in window) {
    launchQueue.setConsumer(async (launchParams) => {
      if (!launchParams.files.length) {
        return;
      }
      setSource(await launchParams.files[0].getFile());
    });
  }

  // todo use a store
  function handleMouseDown({ target }) {
    wasPaused = paused;
    paused = true;
    targetTime = target.value * duration;
  }
  function handleMouseUp() {
    paused = wasPaused;
    currentTime = targetTime;
  }
  function handleProgress({ target }) {
    targetTime = target.value * duration;
  }

  function playPause() {
    paused = !paused;
  }
</script>

<audio {src} bind:this={audio} autoplay bind:volume bind:duration bind:currentTime bind:paused />
<div class="page-wrapper with-navbar-fixed-bottom">
  <div class="content-wrapper" />
  <nav class="navbar navbar-fixed-bottom p-0 d-flex flex-column border-0">
    <div class="d-flex w-full">
      <input
        class="w-full top-0 d-flex align-items-start"
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
    <div class="d-flex w-full flex-grow-1 align-items-center">
      <div class="ctrl pointer" on:click={playPause}>
        <span class="material-icons font-size-24" type="button">
          {paused ? 'play_arrow' : 'pause'}
        </span>
      </div>
      <input type="range" min="0" max="1" bind:value={volume} step="any" style="--value: {volume * 100}%" />
    </div>
  </nav>
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
  input[type='range'] {
    -webkit-appearance: none;
    background: transparent;
    margin: 0;
    cursor: pointer;
    height: 8px;
  }

  input[type='range']:focus {
    outline: none;
  }

  input[type='range']::-webkit-slider-runnable-track {
    height: 3px;
  }

  input[type='range']::-webkit-slider-thumb {
    height: 0;
    width: 0;
    border-radius: 50%;
    background: #ff3c00;
    -webkit-appearance: none;
    appearance: none;
    transition: all 0.1s ease;
  }

  input[type='range']:hover::-webkit-slider-thumb {
    height: 12px;
    width: 12px;
    margin-top: -4px;
  }

  input[type='range'] {
    --volume: 0%;
  }

  input[type='range']::-webkit-slider-runnable-track {
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
</style>
