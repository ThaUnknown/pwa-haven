<script>
  import Peer from '../../../../shared/Peer.js'
  import { getBurnIn } from './common.js'

  export let video = null
  export let subs = null
  export let paused = false
  export let container
  let canCast = false

  let presentationConnection = null
  let presentationRequest = null

  if ('PresentationRequest' in window) {
    const handleAvailability = aval => {
      canCast = !!aval
    }
    presentationRequest = new PresentationRequest(['build/cast.html'])
    presentationRequest.addEventListener('connectionavailable', e => initCast(e))
    navigator.presentation.defaultRequest = presentationRequest
    presentationRequest.getAvailability().then(aval => {
      aval.onchange = e => handleAvailability(e.target.value)
      handleAvailability(aval.value)
    })
  }

  export function toggleCast () {
    if (video.readyState) {
      if (presentationConnection) {
        presentationConnection?.terminate()
      } else {
        presentationRequest.start()
      }
    }
  }
  function initCast (event) {
    // these quality settings are likely to make cast overheat, oh noes!
    let peer = new Peer({
      polite: true,
      quality: {
        audio: {
          stereo: 1,
          'sprop-stereo': 1,
          maxaveragebitrate: 510000,
          maxplaybackrate: 510000,
          cbr: 0,
          useinbandfec: 1,
          usedtx: 1,
          maxptime: 20,
          minptime: 10
        },
        video: {
          bitrate: 2000000,
          codecs: ['VP9', 'VP8', 'H264']
        }
      }
    })

    presentationConnection = event.connection
    presentationConnection.addEventListener('terminate', () => {
      presentationConnection = null
      peer = null
    })

    peer.signalingPort.onmessage = ({ data }) => {
      presentationConnection.send(data)
    }

    presentationConnection.addEventListener('message', ({ data }) => {
      peer.signalingPort.postMessage(data)
    })

    peer.dc.onopen = () => {
      if (peer && presentationConnection) {
        const tracks = []
        const videostream = video.captureStream()
        if (subs?.renderer) {
          // TODO: check if cast supports codecs
          const { stream, destroy, canvas } = getBurnIn(video, subs)
          container.append(canvas)
          tracks.push(stream.getVideoTracks()[0], videostream.getAudioTracks()[0])
          presentationConnection.addEventListener('terminate', destroy)
        } else {
          tracks.push(videostream.getVideoTracks()[0], videostream.getAudioTracks()[0])
        }
        for (const track of tracks) {
          peer.pc.addTrack(track, videostream)
        }
        paused = false // video pauses for some reason
      }
    }
  }
</script>

{#if 'PresentationRequest' in window && canCast && video.readyState}
  <span class='material-icons ctrl' title='Cast Video [D]' data-name='toggleCast' on:click={toggleCast}>
    {presentationConnection ? 'cast_connected' : 'cast'}
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
