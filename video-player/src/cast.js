import Peer from './lib/peer.js'

let peer = null
const video = document.querySelector('video')

function addConnection (connection) {
  peer = new Peer({
    polite: false,
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

  peer.pc.ontrack = evt => {
    evt.receiver.playoutDelayHint = 0.5
    if (!video.srcObject) {
      video.srcObject = evt.streams[0]
      video.volume = 1
      video.play()
    }
  }

  // only used to signal description and candidates to the other peer
  // once a connection is establish the DataChannel takes over.
  peer.signalingPort.onmessage = ({ data }) => {
    connection.send(data)
  }

  connection.addEventListener('message', ({ data }) => {
    peer.signalingPort.postMessage(data)
  })
}

if (navigator.presentation.receiver) {
  navigator.presentation.receiver.connectionList.then(list => {
    list.connections.map(connection => addConnection(connection))
    list.addEventListener('connectionavailable', event => {
      addConnection(event.connection)
    })
  })
}
