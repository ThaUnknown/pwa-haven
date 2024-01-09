import { fontRx } from '../../../shared/util.js'
import Metadata from 'matroska-metadata'
import EventEmitter from 'events'

export default class Parser extends EventEmitter {
  parsed = false
  /** @type {Metadata} */
  metadata
  /** @type {File} */
  file
  destroyed = false
  constructor (file) {
    super()
    this.file = file
    this.metadata = new Metadata(file)

    this.metadata.getTracks().then(tracks => {
      if (this.destroyed) return
      if (!tracks.length) {
        this.parsed = true
        this.destroy()
      } else {
        this.emit('tracks', tracks)
      }
    })

    this.metadata.getChapters().then(chapters => {
      if (this.destroyed) return
      this.emit('chapters', chapters)
    })

    this.metadata.getAttachments().then(files => {
      if (this.destroyed) return
      for (const file of files) {
        if (fontRx.test(file.filename) || file.mimetype.toLowerCase().includes('font')) {
          this.emit('file', file)
        }
      }
    })

    this.metadata.on('subtitle', (subtitle, trackNumber) => {
      if (this.destroyed) return
      this.emit('subtitle', { subtitle, trackNumber })
    })

    if (this.file.name.endsWith('.mkv') || this.file.name.endsWith('.webm')) {
      this.file.onIterator = ({ iterator, req }, cb) => {
        if (this.destroyed) return
        if (req.destination === 'video' && !this.parsed) {
          cb(this.metadata.parseStream(iterator))
        }
      }
    }
  }

  async parseSubtitles () {
    if (this.file.name.endsWith('.mkv') || this.file.name.endsWith('.webm')) {
      console.log('Sub parsing started')
      await this.metadata.parseFile()
      console.log('Sub parsing finished')
    }
  }

  destroy () {
    this.destroyed = true
    this.metadata?.destroy()
    this.metadata = undefined
  }
}
