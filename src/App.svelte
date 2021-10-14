<script>
  if ('serviceWorker' in navigator) {
    // navigator.serviceWorker.register('./sw.js')
  }
  const offline = 'serviceWorker' in navigator
  const desktop = 'onbeforeinstallprompt' in window
  const audio = 'audioTracks' in HTMLVideoElement.prototype
  const cast = 'PresentationRequest' in window
  const controls = 'mediaSession' in navigator

  function supportText(value) {
    return value ? 'Supported' : 'Unsupported'
  }
  function supportClass(value) {
    return value ? 'text-success' : 'text-danger'
  }
</script>

<div class="page-wrapper">
  <div class="content-wrapper">
    <div class="content">
      <h2 class="content-title">Feature Support</h2>
      <p class="mt-0 mb-0 {supportClass(offline)}">Offline Mode {supportText(offline)}</p>
      <p class="mt-0 mb-0 {supportClass(desktop)}">Desktop Mode {supportText(desktop)}</p>
      <p class="mt-0 mb-0 {supportClass(audio)}">Multi Audio Tracks in Video {supportText(audio)}</p>
      <p class="mt-0 mb-0 {supportClass(cast)}">Casting {supportText(cast)}</p>
      <p class="mt-0 mb-0 {supportClass(controls)}">Media Controls {supportText(controls)}</p>
      <h2 class="content-title mt-20">App List</h2>
      <div class="row">
        <a href="img-viewer/public" class="card w-350 mw-full m-0 p-0 d-flex mr-10 mb-10" target="_blank" rel="noopener">
          <div class="w-100 h-100 m-10 align-self-center rounded d-flex align-items-center justify-content-center">
            <img src="img-viewer/public/128.png" class="d-block rounded h-100 w-100" alt="logo" />
          </div>
          <div class="flex-grow-1 overflow-y-hidden d-flex align-items-center position-relative h-120">
            <div class="p-10 w-full m-auto">
              <p class="m-0 font-weight-medium text-dark-lm text-light-dm text-reset">Image Viewer</p>
              <p class="font-size-12 mt-0 mb-0">Simple and Fast Image Viewer</p>
            </div>
          </div>
        </a>

        <a href="audio-player/public" class="card w-350 mw-full m-0 p-0 d-flex mr-10 mb-10" target="_blank" rel="noopener">
          <div class="w-100 h-100 m-10 align-self-center rounded d-flex align-items-center justify-content-center">
            <img src="audio-player/public/128.png" class="d-block rounded h-100 w-100" alt="logo" />
          </div>
          <div class="flex-grow-1 overflow-y-hidden d-flex align-items-center position-relative h-120">
            <div class="p-10 w-full m-auto">
              <p class="m-0 font-weight-medium text-dark-lm text-light-dm text-reset">Audio Player</p>
              <p class="font-size-12 mt-0 mb-0">Simple and Fast Audio Player</p>
            </div>
          </div>
        </a>

        <a href="video-player/public" class="card w-350 mw-full m-0 p-0 d-flex mr-10 mb-10" target="_blank" rel="noopener">
          <div class="w-100 h-100 m-10 align-self-center rounded d-flex align-items-center justify-content-center">
            <img src="video-player/public/128.png" class="d-block rounded h-100 w-100" alt="logo" />
          </div>
          <div class="flex-grow-1 overflow-y-hidden d-flex align-items-center position-relative h-120">
            <div class="p-10 w-full m-auto">
              <p class="m-0 font-weight-medium text-dark-lm text-light-dm text-reset">Video Player</p>
              <p class="font-size-12 mt-0 mb-0">Simple and Powerful Video Player</p>
            </div>
          </div>
        </a>
      </div>
    </div>
  </div>
</div>

<style>
  .card:hover {
    color: rgba(255, 255, 255, 0.6) !important;
  }
</style>
