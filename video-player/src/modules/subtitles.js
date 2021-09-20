import { SubtitleParser, SubtitleStream } from 'matroska-subtitles'
import SubtitlesOctopus from '../lib/subtitles-octopus.js'

const subtitleExtensions = ['.srt', '.vtt', '.ass', '.ssa']
const videoExtensions = ['.3g2', '.3gp', '.asf', '.avi', '.dv', '.flv', '.gxf', '.m2ts', '.m4a', '.m4b', '.m4p', '.m4r', '.m4v', '.mkv', '.mov', '.mp4', '.mpd', '.mpeg', '.mpg', '.mxf', '.nut', '.ogm', '.ogv', '.swf', '.ts', '.vob', '.webm', '.wmv', '.wtv']
const defaultHeader = `[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default, Roboto Medium,26,&H00FFFFFF,&H000000FF,&H00020713,&H00000000,0,0,0,0,100,100,0,0,1,1.3,0,2,20,20,23,1
[Events]

`
export default class Subtitles {
  constructor (video, files, selected) {
    this.video = video
    this.selected = selected || null
    this.files = files || []
    this.headers = []
    this.tracks = []
    this.fonts = []
    this.renderer = null
    this.parsed = false
    this.stream = null
    this.parser = null
    this.current = 0
    this.videoFiles = files.filter(file => videoExtensions.some(ext => file.name.endsWith(ext)))
    this.timeout = null

    this.initParser(this.selected).then(() => {
      this.selected.onStream = ({ stream, file, req }, cb) => {
        if (req.destination === 'video' && file.name.endsWith('.mkv') && !this.parsed) {
          const temp = this.stream
          this.stream = new SubtitleStream(temp) // this should work, but doesn't, mangle it.
          this.stream.subtitleTracks = temp.subtitleTracks
          this.stream.timecodeScale = temp.timecodeScale
          this.stream.unstable = true
          temp.end()
          temp.destroy()
          this.handleSubtitleParser(this.stream, true)
          stream.pipe(this.stream)
          cb(this.stream)
        }
      }
    })

    this.video.addEventListener('loadedmetadata', () => this.findSubtitleFiles(this.selected))
  }

  findSubtitleFiles (targetFile) {
    const videoName = targetFile.name.substring(0, targetFile.name.lastIndexOf('.')) || targetFile.name
    // array of subtitle files that match video name, or all subtitle files when only 1 vid file
    const subtitleFiles = this.files.filter(file => {
      return subtitleExtensions.some(ext => file.name.endsWith(ext)) && (this.videoFiles.length === 1 ? true : file.name.includes(videoName))
    })
    if (subtitleFiles.length) {
      this.parsed = true
      this.current = 0
      for (const [index, file] of subtitleFiles.entries()) {
        const isAss = file.name.endsWith('.ass') || file.name.endsWith('.ssa')
        const extension = /\.(\w+)$/
        const name = file.name.replace(targetFile.name, '') === file.name
          ? file.name.replace(targetFile.name.replace(extension, ''), '').slice(0, -4).replace(/[,._-]/g, ' ').trim()
          : file.name.replace(targetFile.name, '').slice(0, -4).replace(/[,._-]/g, ' ').trim()
        const header = {
          header: defaultHeader,
          language: name,
          number: index,
          type: file.name.match(extension)[1]
        }
        this.headers.push(header)
        this.tracks[index] = []
        this.convertSubFile(file, isAss, subtitles => {
          if (isAss) {
            this.headers[index].header = subtitles
          } else {
            this.tracks[index] = subtitles
          }
          if (this.current === index) this.selectCaptions(this.current)
        })
        this.initSubtitleRenderer()
      }
    }
  }

  async initSubtitleRenderer () {
    if (!this.renderer) {
      const options = {
        video: this.video,
        targetFps: await this.video.fps,
        subContent: this.headers[this.current].header.slice(0, -1),
        renderMode: 'offscreen',
        fonts: this.fonts,
        fallbackFont: 'https://fonts.gstatic.com/s/roboto/v20/KFOlCnqEu92Fr1MmEU9fBBc4.woff2',
        workerUrl: 'lib/subtitles-octopus-worker.js',
        onReady: () => { // weird hack for laggy subtitles, this is some issue in SO
          if (!this.video.paused) {
            this.video.pause()
            this.video.play()
          }
        }
      }
      if (!this.renderer) {
        this.renderer = new SubtitlesOctopus(options)
        this.selectCaptions(this.current)
      }
    }
  }

  static toTS (sec, full) {
    if (isNaN(sec) || sec < 0) {
      return full ? '0:00:00.00' : '00:00'
    }
    const hours = Math.floor(sec / 3600)
    let minutes = Math.floor(sec / 60) - (hours * 60)
    let seconds = full ? (sec % 60).toFixed(2) : Math.floor(sec % 60)
    if (minutes < 10) minutes = '0' + minutes
    if (seconds < 10) seconds = '0' + seconds
    return (hours > 0 || full) ? hours + ':' + minutes + ':' + seconds : minutes + ':' + seconds
  }

  static convertSubFile (file, isAss, callback) {
    const regex = /(?:\d+\n)?(\S{9,12})\s?-->\s?(\S{9,12})(.*)\n([\s\S]*)$/i
    file.text.then(text => {
      const subtitles = isAss ? text : []
      if (isAss) {
        callback(subtitles)
      } else {
        const replaced = text.replace(/\r/g, '')
        for (const split of replaced.split('\n\n')) {
          const match = split.match(regex)
          if (match) {
            match[1] = match[1].match(/.*[.,]\d{2}/)[0]
            match[2] = match[2].match(/.*[.,]\d{2}/)[0]
            if (match[1].length === 9) {
              match[1] = '0:' + match[1]
            } else {
              if (match[1][0] === '0') {
                match[1] = match[1].substring(1)
              }
            }
            match[1].replace(',', '.')
            if (match[2].length === 9) {
              match[2] = '0:' + match[2]
            } else {
              if (match[2][0] === '0') {
                match[2] = match[2].substring(1)
              }
            }
            match[2].replace(',', '.')
            const matches = match[4].match(/<[^>]+>/g) // create array of all tags
            if (matches) {
              matches.forEach(matched => {
                if (/<\//.test(matched)) { // check if its a closing tag
                  match[4] = match[4].replace(matched, matched.replace('</', '{\\').replace('>', '0}'))
                } else {
                  match[4] = match[4].replace(matched, matched.replace('<', '{\\').replace('>', '1}'))
                }
              })
            }
            subtitles.push('Dialogue: 0,' + match[1].replace(',', '.') + ',' + match[2].replace(',', '.') + ',Default,,0,0,0,,' + match[4])
          }
        }
        callback(subtitles)
      }
    })
  }

  static constructSub (subtitle, isNotAss) {
    if (isNotAss === true) { // converts VTT or other to SSA
      const matches = subtitle.text.match(/<[^>]+>/g) // create array of all tags
      if (matches) {
        matches.forEach(match => {
          if (/<\//.test(match)) { // check if its a closing tag
            subtitle.text = subtitle.text.replace(match, match.replace('</', '{\\').replace('>', '0}'))
          } else {
            subtitle.text = subtitle.text.replace(match, match.replace('<', '{\\').replace('>', '1}'))
          }
        })
      }
      // replace all html special tags with normal ones
      subtitle.text.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, '\\h')
    }
    return 'Dialogue: ' +
    (subtitle.layer || 0) + ',' +
    this.toTS(subtitle.time / 1000, true) + ',' +
    this.toTS((subtitle.time + subtitle.duration) / 1000, true) + ',' +
    (subtitle.style || 'Default') + ',' +
    (subtitle.name || '') + ',' +
    (subtitle.marginL || '0') + ',' +
    (subtitle.marginR || '0') + ',' +
    (subtitle.marginV || '0') + ',' +
    (subtitle.effect || '') + ',' +
    subtitle.text || ''
  }

  parseSubtitles (file, skipFiles) { // parse subtitles fully after a download is finished
    return new Promise((resolve) => {
      if (file.name.endsWith('.mkv')) {
        let parser = new SubtitleParser()
        this.handleSubtitleParser(parser, skipFiles)
        parser.on('finish', () => {
          console.log('Sub parsing finished', this.toTS((performance.now() - t0) / 1000))
          this.parsed = true
          this.stream?.destroy()
          this.stream = undefined
          this.parser.destroy()
          this.parser = undefined
          this.selectCaptions(this.current)
          parser = undefined
          if (!this.video.paused) {
            this.video.pause()
            this.video.play()
          }
          resolve()
        })
        const t0 = performance.now()
        console.log('Sub parsing started')
        this.parser = file.createReadStream().pipe(parser)
      } else {
        resolve()
      }
    })
  }

  initParser (file) {
    return new Promise(resolve => {
      this.stream = new SubtitleParser()
      this.handleSubtitleParser(this.stream)
      this.stream.once('tracks', tracks => {
        if (!tracks.length) {
          this.parsed = true
          resolve()
          this.stream.destroy()
          fileStreamStream.destroy()
        }
      })
      this.stream.once('subtitle', () => {
        resolve()
        fileStreamStream.destroy()
      })
      const fileStreamStream = file.createReadStream()
      fileStreamStream.pipe(this.stream)
    })
  }

  handleSubtitleParser (parser, skipFile) {
    parser.once('tracks', tracks => {
      if (!tracks.length) {
        this.parsed = true
      } else {
        for (const track of tracks) {
          if (!this.tracks[track.number]) {
            // overwrite webvtt or other header with custom one
            if (track.type !== 'ass') track.header = this.defaultHeader
            if (!this.current) {
              this.current = track.number
            }
            this.tracks[track.number] = new Set()
            this.headers[track.number] = track
          }
        }
      }
    })
    parser.on('subtitle', (subtitle, trackNumber) => {
      if (!this.parsed) {
        if (!this.renderer) this.initSubtitleRenderer()
        this.tracks[trackNumber].add(this.constructor.constructSub(subtitle, this.headers[trackNumber].type !== 'ass'))
        if (this.current === trackNumber) this.selectCaptions(trackNumber) // yucky
      }
    })
    if (!skipFile) {
      parser.on('file', file => {
        if (file.mimetype === 'application/x-truetype-font' || file.mimetype === 'application/font-woff' || file.mimetype === 'application/vnd.ms-opentype') {
          this.fonts.push(URL.createObjectURL(new Blob([file.data], { type: file.mimetype })))
        }
      })
    }
  }

  selectCaptions (trackNumber) {
    if (trackNumber !== undefined) {
      trackNumber = Number(trackNumber)
      this.current = trackNumber
      if (!this.timeout) {
        this.timeout = setTimeout(() => {
          this.timeout = undefined
          this.renderer?.setTrack(trackNumber !== -1 ? this.headers[trackNumber].header.slice(0, -1) + Array.from(this.tracks[trackNumber]).join('\n') : defaultHeader)
        }, 1000)
      }
    }
  }

  destroy () {
    this.files = null
    this.video = null
    this.selected = null
    this.renderer?.dispose()
    this.tracks = null
    this.headers = null
    this.stream?.destroy()
    this.parser?.destroy()
    this.fonts?.forEach(file => URL.revokeObjectURL(file))
    this.video.removeEventListener(this.findSubtitleFiles)
  }
}
