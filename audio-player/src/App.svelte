<script>
  let src = null;
  let name = 'Audio Player';
  let audio = null;
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
      setSource(files[0]);
    }
  }

  // these might be false, oh well
  const audioRx = /\.(3gp|aac|ac3|adts|alac|amr|eac3|flac|m4a|m4b|m4p|mp3|mpeg|ogg|oga|mogg|opus|raw|wav|webm)/i;
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
</script>

<div class="w-full h-full overflow-hidden position-relative">
  <audio {src} bind:this={audio} autoplay />
</div>

<svelte:head>
  <title>{name}</title>
</svelte:head>

<svelte:window
  on:drop|preventDefault={handleDrop}
  on:dragenter|preventDefault
  on:dragover|preventDefault
  on:dragstart|preventDefault
  on:dragleave|preventDefault
  on:paste|preventDefault={handlePaste} />

<style>
</style>
