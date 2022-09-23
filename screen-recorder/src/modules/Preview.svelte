<script>
  export let mediaRecorder
  let preview

  let raf = null
  async function handleRecorder (mediaRecorder) {
    if (!await mediaRecorder?.ready) return null

    if (mediaRecorder.analyser) {
      const data = new Float32Array(mediaRecorder.analyser.fftSize)
      const visualizeAudio = () => {
        mediaRecorder.analyser.getFloatTimeDomainData(data)
        let sumSquares = 0.0
        for (const amplitude of data) sumSquares += amplitude * amplitude
        value = Math.sqrt(sumSquares / data.length)
        console.log(value, sumSquares)
        raf = requestAnimationFrame(visualizeAudio)
      }
      raf = requestAnimationFrame(visualizeAudio)
      mediaRecorder.addEventListener('destroyed', () => {
        cancelAnimationFrame(raf)
        raf = null
      })
    }

    preview.srcObject = mediaRecorder.stream
    preview.play()
  }

  $: handleRecorder(mediaRecorder)

  let value = 0
</script>

<div class:d-none={!mediaRecorder} class='w-300 mb-10'>
  <div class='font-weight-bold font-size-24 mb-10'>Preview</div>
  <!-- eslint-disable-next-line svelte/valid-compile -->
  <video bind:this={preview} class='w-full mb-10' muted />
  <div class='progress mb-20' class:d-none={!raf}>
    <div class='progress-bar' style='width: {value * 100}%' />
  </div>
</div>
