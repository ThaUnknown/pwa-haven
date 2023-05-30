<script>
  export let video
  export let buffer = 0
  let stats = null
  let requestCallback = null
  export function toggleStats () {
    if ('requestVideoFrameCallback' in HTMLVideoElement.prototype) {
      if (requestCallback) {
        stats = null
        video.cancelVideoFrameCallback(requestCallback)
        requestCallback = null
      } else {
        requestCallback = video.requestVideoFrameCallback((a, b) => {
          stats = {}
          handleStats(a, b, b)
        })
      }
    }
  }
  async function handleStats (now, metadata, lastmeta) {
    if (stats) {
      const msbf = (metadata.mediaTime - lastmeta.mediaTime) / (metadata.presentedFrames - lastmeta.presentedFrames)
      const fps = (1 / msbf).toFixed(3)
      stats = {
        fps,
        presented: metadata.presentedFrames,
        dropped: video.getVideoPlaybackQuality()?.droppedVideoFrames,
        processing: metadata.processingDuration + ' ms',
        viewport: video.clientWidth + 'x' + video.clientHeight,
        resolution: video.videoWidth + 'x' + video.videoHeight,
        buffer: (buffer - metadata.mediaTime | 0) + ' s',
        speed: video.playbackRate || 1
      }
      setTimeout(() => video.requestVideoFrameCallback((n, m) => handleStats(n, m, metadata)), 200)
    }
  }

</script>

{#if stats}
  <div class='position-absolute top-0 bg-tp p-10 m-15 text-monospace rounded z-50'>
    <button class='close' type='button' on:click={toggleStats}><span>×</span></button>
    FPS: {stats.fps}<br />
    Presented frames: {stats.presented}<br />
    Dropped frames: {stats.dropped}<br />
    Frame time: {stats.processing}<br />
    Viewport: {stats.viewport}<br />
    Resolution: {stats.resolution}<br />
    Buffer health: {stats.buffer}<br />
    Playback speed: x{stats.speed?.toFixed(1)}
  </div>
{/if}

<style>
  .bg-tp {
    background: #000000bb;
    backdrop-filter: blur(10px);
  }
  .bg-tp .close {
    position: absolute;
    top: 0;
    right: 0;
    cursor: pointer;
    color: inherit;
    padding: var(--alert-close-padding);
    line-height: var(--alert-close-line-height);
    font-size: var(--alert-close-font-size);
    background-color: transparent;
    border-color: transparent;
  }
</style>
