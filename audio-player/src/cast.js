import Peer from '../../shared/Peer.js'
function toTS (sec, full) {
  if (isNaN(sec) || sec < 0) {
    return full ? '00:00' : '0:00'
  }
  const hours = Math.floor(sec / 3600)
  let minutes = Math.floor(sec / 60) - hours * 60
  let seconds = Math.floor(sec % 60)
  if (full && minutes < 10) minutes = '0' + minutes
  if (seconds < 10) seconds = '0' + seconds
  return hours > 0 ? hours + ':' + minutes + ':' + seconds : minutes + ':' + seconds
}
let peer = null
const audio = document.querySelector('audio')
const duration = document.querySelector('.duration')
const current = document.querySelector('.current')
const artist = document.querySelector('.artist')
const title = document.querySelector('.title')
const cover = document.querySelector('.cover')
const backdrop = document.querySelector('.backdrop')
const progress = document.querySelector('progress')

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
      }
    }
  })

  peer.pc.ontrack = evt => {
    evt.receiver.playoutDelayHint = 0.1 // audio has less data, so less delay
    audio.srcObject = evt.streams[0]
    audio.volume = 1
    audio.play()
  }

  const dataport = peer.pc.createDataChannel('current', { negotiated: true, id: 2 })
  let imageData = []
  function buildImage () {
    const blob = new Blob(imageData)
    const url = URL.createObjectURL(blob)
    cover.src = url
    backdrop.src = url
    imageData = []
  }
  let dur
  dataport.onmessage = ({ data }) => {
    if (data instanceof ArrayBuffer) {
      imageData.push(data)
    } else {
      const parsed = JSON.parse(data)
      if (parsed.duration) {
        dur = parsed.duration
        duration.textContent = toTS(parsed.duration)
      }
      if (parsed.current) current.textContent = toTS(parsed.current)
      if (parsed.artist) artist.textContent = parsed.artist
      if (parsed.title) title.textContent = parsed.title
      if (parsed.ended) buildImage()
      if (parsed.current && dur) progress.value = parsed.current / dur
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
