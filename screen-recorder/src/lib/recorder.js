import { settings, pickFolder } from '../modules/Settings.svelte'
import { fixDuration } from './durationfix.js'

export default class Recorder extends EventTarget {
  constructor () {
    super()
    this.tracks = []
    this.ready = this.init()
  }

  async init () {
    // FSA API access
    if ('showDirectoryPicker' in window) {
      const res = !settings.folder ? await pickFolder() : await settings.folder.requestPermission({ mode: 'readwrite' })
      if (res !== 'granted') return this.destroy()
    }

    // create streams
    let voiceStream, displayStream
    try {
      if (settings.mic) {
        voiceStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: settings.cancellation,
            noiseSuppression: settings.supression
          },
          video: false
        })
      }
      displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: settings.fps, cursor: settings.cursor },
        audio: {
          echoCancellation: false,
          noiseSuppression: false
        }
      })
      this.tracks.push(...displayStream.getTracks())
    } catch (e) {
      console.error(e)
      return this.destroy()
    }

    // store tracks
    this.tracks.push(...displayStream.getTracks())
    if (voiceStream) this.tracks.push(...voiceStream.getTracks())

    for (const track of this.tracks) {
      track.onended = this.destroy.bind(this)
    }

    // if there's audio
    if ((displayStream.getAudioTracks().length + (voiceStream?.getAudioTracks().length || 0)) > 0) {
      console.log('yup')
      this.audioContext = new AudioContext()
      // voice + display -> analyser -> output
      const destination = this.audioContext.createMediaStreamDestination()
      this.analyser = this.audioContext.createAnalyser()
      this.analyser.connect(destination)
      if (voiceStream) this.audioContext.createMediaStreamSource(voiceStream).connect(this.analyser)
      this.audioContext.createMediaStreamSource(displayStream).connect(this.analyser)
      return this.record(new MediaStream([...displayStream.getVideoTracks(), ...destination.stream.getAudioTracks()]))
    } else {
      return this.record(displayStream)
    }
  }

  async record (stream) {
    this.stream = stream
    // to collect stream chunks
    const recordedChunks = []
    this.mediaRecorder = new MediaRecorder(stream, {
      audioBitsPerSecond: settings.audrate * 1000,
      videoBitsPerSecond: settings.vidrate * 1000000,
      mimeType: `video/${settings.container === 'mkv' ? 'x-matroska' : 'webm'};codecs=${settings.codec}`
    })
    const startTime = new Date()
    const fileHandle = await settings.folder?.getFileHandle(`${this.dateString(startTime)}.${settings.container}`, { create: true })
    const writable = await fileHandle?.createWritable()
    if (writable) {
      this.mediaRecorder.ondataavailable = ({ data }) => {
        if (data.size > 0) writable.write(data)
      }
    } else {
      this.mediaRecorder.ondataavailable = ({ data }) => {
        if (data.size > 0) recordedChunks.push(data)
      }
    }
    this.mediaRecorder.onstop = async () => {
      const duration = Date.now() - startTime
      this.destroy()
      if (writable) {
        await writable.close() // force file save
        const saved = await fileHandle?.createWritable()
        await saved.write({ type: 'write', position: 0, data: await fixDuration(await fileHandle.getFile(), duration) }) // overwrite with duration fix
        await saved.close() // force file save
      } else {
        const fixed = await fixDuration(new Blob([recordedChunks], { type: recordedChunks[0].mimeType }), duration)
        const downloadEl = document.createElement('a')
        downloadEl.href = URL.createObjectURL(fixed)
        downloadEl.download = `${this.dateString(startTime)}.${settings.container}`
        downloadEl.click()
        URL.revokeObjectURL(fixed)
      }
    }
    this.mediaRecorder.start(5000)

    return true
  }

  dateString (date) {
    return new Intl.DateTimeFormat('en-GB', { dateStyle: 'short', timeStyle: 'medium' }).format(date).replace(/[:/]/g, '.')
  }

  destroy () {
    if (this.destroyed === true) return null
    this.destroyed = true
    for (const track of this.tracks || []) {
      track.stop()
    }
    this.tracks = []
    this.mediaRecorder?.stop()
    this.mediaRecorder = null
    this.audioContext?.close()
    this.audioContext = null
    this.analyser = null
    this.dispatchEvent(new Event('destroyed'))
  }
}
