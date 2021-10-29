<script>
  import InstallPrompt from './modules/InstallPrompt.svelte'
  import ysFixWebmDuration from 'fix-webm-duration'

  navigator.serviceWorker.register('/sw.js')
  let downloadLink
  let startTime = null
  let mediaRecorder
  const handleRecord = function ({ stream, mimeType }) {
    // to collect stream chunks
    let recordedChunks = []
    mediaRecorder = new MediaRecorder(stream, {
      audioBitsPerSecond: 128000,
      videoBitsPerSecond: 2500000,
      mimeType: 'video/x-matroska'
    })

    mediaRecorder.ondataavailable = function (e) {
      if (e.data.size > 0) {
        recordedChunks.push(e.data)
      }
    }
    mediaRecorder.onstop = async function () {
      const duration = Date.now() - startTime
      const blob = new Blob(recordedChunks)
      for (const track of stream.getTracks()) {
        track.stop()
      }

      ysFixWebmDuration(blob.slice(0, 64), duration, file => {
        console.log(file, duration)
        const patched = new Blob([file, blob.slice(64)])
        downloadLink.href = URL.createObjectURL(patched)
        downloadLink.download = `${Date.now()}.mkv`
        downloadLink.click()
      })
    }

    mediaRecorder.start(200) // here 200ms is interval of chunk collection
    startTime = Date.now()
  }
  async function record() {
    if (mediaRecorder) return mediaRecorder.stop()
    const mimeType = 'video/x-matroska'
    const displayStream = await navigator.mediaDevices.getDisplayMedia({
      video: { frameRate: 60, cursor: 'always' },
      audio: {
        sampleSize: 256,
        channelCount: 2,
        echoCancellation: false
      }
    })
    displayStream.oninactive = () => {
      voiceStream.getAudioTracks()[0].stop()
    }
    console.log(displayStream)
    // voiceStream for recording voice with screen recording
    const voiceStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
    let tracks = [...displayStream.getTracks(), voiceStream.getAudioTracks()[0]]
    const stream = new MediaStream(tracks)
    handleRecord({ stream, mimeType })
  }
</script>

<div class="sticky-alerts d-flex flex-column-reverse">
  <InstallPrompt />
</div>
<div class="w-full h-full overflow-hidden position-relative dragarea">
  <button class="btn" on:click={record} />
  <a bind:this={downloadLink} />
</div>

<svelte:head>
  <title>Screen Recorder</title>
</svelte:head>

<style>
  .sticky-alerts {
    --sticky-alerts-top: auto;
    bottom: 1rem;
  }
</style>
