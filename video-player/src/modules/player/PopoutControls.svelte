<script>
  import { getBurnIn } from './common.js'

  export let video
  export let subs
  export let pip = false
  export let container

  export function togglePopout () {
    if (video.readyState) {
      if (!subs?.renderer) {
        if (video !== document.pictureInPictureElement) {
          video.requestPictureInPicture()
          pip = true
        } else {
          document.exitPictureInPicture()
          pip = false
        }
      } else {
        if (document.pictureInPictureElement && !document.pictureInPictureElement.id) {
          // only exit if pip is the custom one, else overwrite existing pip with custom
          document.exitPictureInPicture()
          pip = false
        } else {
          const canvasVideo = document.createElement('video')
          const { stream, destroy, canvas } = getBurnIn(video, subs)
          container.append(canvas)
          const cleanup = () => {
            pip = false
            destroy()
            canvasVideo.remove()
          }
          pip = true
          canvasVideo.srcObject = stream
          canvasVideo.onloadedmetadata = () => {
            canvasVideo.play()
            if (pip) {
              canvasVideo.requestPictureInPicture().catch(e => {
                cleanup()
                console.warn('Failed To Burn In Subtitles ' + e)
              })
            } else {
              cleanup()
            }
          }
          canvasVideo.onleavepictureinpicture = cleanup
        }
      }
    }
  }
</script>

{#if 'pictureInPictureEnabled' in document}
  <span class='material-icons ctrl' title='Popout Window [P]' on:click={togglePopout}>
    {pip ? 'featured_video' : 'picture_in_picture'}
  </span>
{/if}

<style>
  .material-icons {
    font-size: 2.6rem;
    padding: 1.5rem;
    display: flex;
  }
  .ctrl {
    cursor: pointer;
  }
  .ctrl:hover {
    filter: drop-shadow(0 0 8px #000);
  }
  :global(:fullscreen) .ctrl {
    display: none !important;
  }
</style>
