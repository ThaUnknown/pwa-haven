import { URLFile } from '../../../shared/URLFile.js'

export default class PopoutVisualizer {
  constructor (audio, playPause, current) {
    if ((current.file instanceof File || current.file instanceof URLFile)) {
      this.audio = audio
      this.context = new AudioContext({ latencyHint: 'interactive' })
      this.src = this.context.createMediaElementSource(audio)
      this.analyser = this.context.createAnalyser()
      this.src.connect(this.context.destination)
      this.playPause = playPause
    }
  }

  createCanvas () {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    canvas.width = 1024
    canvas.height = 256
    return { ctx, canvas }
  }

  async setCurrent (current) {
    if (current) {
      this.startTime = Date.now()
      this.current = current
      const image = new Image()
      image.src = (current.cover && (current.cover?.url || URL.createObjectURL(current.cover))) || './512.png'
      await new Promise(resolve => { image.onload = resolve })
      this.image = image
      this.redraw()
    }
  }

  redraw () {
    const current = this.current
    if (!current) return

    const { ctx, canvas } = this.createCanvas()

    ctx.fillStyle = '#111417'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    const padding = 32

    ctx.fillStyle = '#ffffffcc'
    ctx.textBaseline = 'top'
    ctx.font = 'bold 56px -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif,"Apple Color Emoji","Segoe UI Emoji","Segoe UI Symbol"'
    ctx.fillText(current.artist, padding * 1.3, padding)
    ctx.font = '56px -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif,"Apple Color Emoji","Segoe UI Emoji","Segoe UI Symbol"'
    ctx.fillStyle = '#ffffff99'

    const text = current.album ? `${current.name} \u2022 ${current.album}` : current.name
    const textTimeSpan = (ctx.measureText(text).width) - (canvas.width - canvas.height - padding * 1.3)
    let offset = 0
    if (textTimeSpan > 0) {
      offset = Math.floor((Date.now() - this.startTime) / 20) % (textTimeSpan + canvas.height + padding * 1.3) - 1000 / 20
      if (offset < 0) offset = 0
    }

    ctx.fillText(text, padding * 1.3 - offset, padding * 2 + 56)

    ctx.fillStyle = '#111417'
    ctx.fillRect(0, 0, padding * 1.3, canvas.height)
    ctx.fillRect(canvas.width - canvas.height - padding * 1.3, 0, canvas.height - padding, canvas.height)

    ctx.fillStyle = '#ffffffcc'
    ctx.drawImage(this.image, canvas.width - canvas.height, 0, canvas.height, canvas.height)
    this.background = ctx.getImageData(0, 0, canvas.width, canvas.height)
    canvas.remove()
  }

  cleanup () {
    this.analyser.disconnect()
    this.src.connect(this.context.destination)
    this.canvas?.remove()
    this.video?.remove()
    cancelAnimationFrame(this.pip)
    this.pip = null
    navigator.mediaSession.setActionHandler('play', this.playPause)
    navigator.mediaSession.setActionHandler('pause', this.playPause)
  }

  togglePopout () {
    if (this.pip) {
      document.exitPictureInPicture()
    } else if (this.context) {
      const { ctx, canvas } = this.createCanvas()
      this.startTime = Date.now()
      this.canvas = canvas

      this.analyser = this.context.createAnalyser()
      this.src.disconnect()
      this.src.connect(this.analyser)
      this.analyser.connect(this.context.destination)
      this.analyser.smoothingTimeConstant = 0.5

      this.analyser.fftSize = 256

      const bufferLength = this.analyser.frequencyBinCount

      const dataArray = new Uint8Array(bufferLength)

      const barWidth = (canvas.width / bufferLength)

      this.video = document.createElement('video')
      this.video.srcObject = canvas.captureStream()
      this.video.onloadedmetadata = () => {
        this.video.play()
        this.video.requestPictureInPicture().catch(e => {
          this.cleanup()
        })
      }
      this.video.onleavepictureinpicture = () => {
        this.cleanup()
      }

      navigator.mediaSession.setActionHandler('play', () => {
        this.video.play()
        this.playPause()
      })
      navigator.mediaSession.setActionHandler('pause', () => {
        this.video.pause()
        this.playPause()
      })

      const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height)
      gradient.addColorStop(0, '#400032')
      gradient.addColorStop(1, '#50fa32')

      const renderFrame = () => {
        this.pip = requestAnimationFrame(renderFrame)

        let x = 0

        this.analyser.getByteFrequencyData(dataArray)

        this.redraw()
        ctx.putImageData(this.background, 0, 0)
        ctx.fillStyle = gradient
        ctx.fillRect(0, 0, canvas.width * (this.audio.currentTime / this.audio.duration), 3)

        for (let i = 0; i < bufferLength; i++) {
          const barHeight = dataArray[i] / 2

          const r = barHeight + (25 * (i / bufferLength))
          const g = 250 * (i / bufferLength)

          ctx.fillStyle = 'rgb(' + r + ',' + g + ', 50)'
          ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight)

          x += barWidth + 3
        }
      }
      this.pip = renderFrame()
    }
  }
}
