import rangeParser from 'range-parser'
import eos from 'end-of-stream'
import FileReadStream from 'filestream/read'
import { Readable } from 'stream'

// yeah, dont do this XD
// way too lazy to implement this on each file the browser creates
Object.assign(File.prototype, {
  onStream: () => {},
  serve (req) {
    const res = {
      status: 200,
      headers: {
        // Support range-requests
        'Accept-Ranges': 'bytes',
        'Content-Type': this.type,
        'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
        Expires: '0'
      },
      body: req.method === 'HEAD' ? '' : 'STREAM'
    }
    // force the browser to download the file if if it's opened in a new tab
    if (req.destination === 'document') {
      res.headers['Content-Type'] = 'application/octet-stream'
      res.headers['Content-Disposition'] = 'attachment'
      res.body = 'DOWNLOAD'
    }

    // `rangeParser` returns an array of ranges, or an error code (number) if
    // there was an error parsing the range.
    let range = rangeParser(this.size, req.headers.range || '')

    if (range.constructor === Array) {
      res.status = 206 // indicates that range-request was understood

      // no support for multi-range request, just use the first range
      range = range[0]

      res.headers['Content-Range'] = `bytes ${range.start}-${range.end}/${this.size}`
      res.headers['Content-Length'] = `${range.end - range.start + 1}`
    } else {
      res.headers['Content-Length'] = this.size
    }

    const stream = req.method === 'GET' && this.createReadStream(range)

    let pipe = null
    if (stream) {
      this.onStream({ stream, req, file: this }, piped => {
        pipe = piped

        // piped stream might not close the original filestream on close/error, this is agressive but necessary
        eos(piped, () => {
          if (piped) piped.destroy()
          stream.destroy()
        })
      })
    }
    return [res, pipe || stream, pipe && stream]
  },
  createReadStream (opts) {
    return new FileReadStream(opts ? this.slice(opts.start) : this)
    // streamX is a viable alternative, but seems to have issues
  }
})

// File object, but for URL xD
export class URLFile {
  constructor (url) {
    if (url instanceof Object) {
      this.name = url.name
      this.url = url.url
      this.type = url.type
    } else {
      this.name = url.substring(Math.max(url.lastIndexOf('\\') + 2, url.lastIndexOf('/') + 1))
      this.url = url
      this.type = ''
    }
    this.ready = new Promise((resolve, reject) => {
      fetch(this.url, { method: 'HEAD' }).then(res => {
        if (!res.ok) reject(new Error('Failed to request data!', res))
        const headers = Object.fromEntries(res.headers.entries())
        this.type = headers['content-type'] || this.type
        this.size = headers['content-length']
        if (this.size == null) reject(new Error('Failed to get size data!', headers, res))
        this.lastModified = Date.parse(headers['last-modified'])
        resolve()
      }).catch(err => {
        throw new Error('Failed to make request!', err)
      })
    })
    this.onStream = () => {}
  }

  async stream () {
    const { body } = await fetch(this.url)
    return body
  }

  async text () {
    const { text } = await fetch(this.url)
    return text()
  }

  async arrayBuffer () {
    const { arrayBuffer } = await fetch(this.url)
    return arrayBuffer()
  }

  createReadStream (opts) {
    return new ReadableURL(this.url, this.size, opts)
  }

  serve (req) {
    const res = {
      status: 200,
      headers: {
        // Support range-requests
        'Accept-Ranges': 'bytes',
        'Content-Type': this.type,
        'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
        Expires: '0'
      },
      body: req.method === 'HEAD' ? '' : 'STREAM'
    }
    // force the browser to download the file if if it's opened in a new tab
    if (req.destination === 'document') {
      res.headers['Content-Type'] = 'application/octet-stream'
      res.headers['Content-Disposition'] = 'attachment'
      res.body = 'DOWNLOAD'
    }

    // `rangeParser` returns an array of ranges, or an error code (number) if
    // there was an error parsing the range.
    let range = rangeParser(this.size, req.headers.range || '')

    if (range.constructor === Array) {
      res.status = 206 // indicates that range-request was understood

      // no support for multi-range request, just use the first range
      range = range[0]

      res.headers['Content-Range'] = `bytes ${range.start}-${range.end}/${this.size}`
      res.headers['Content-Length'] = `${range.end - range.start + 1}`
    } else {
      res.headers['Content-Length'] = this.size
    }

    const stream = req.method === 'GET' && this.createReadStream(range)

    let pipe = null
    if (stream) {
      this.onStream({ stream, req, file: this }, piped => {
        pipe = piped

        // piped stream might not close the original filestream on close/error, this is agressive but necessary
        eos(piped, () => {
          if (piped) piped.destroy()
          stream.destroy()
        })
      })
    }
    return [res, pipe || stream, pipe && stream]
  }
}

class ReadableURL extends Readable {
  /**
   * @param {String} url
   * @param {any} opts
   */
  constructor (url, length, opts = {}) {
    super(opts)
    if (!length) throw new Error('No length specified!')
    this._length = Number(length)
    this._url = url
    this._start = opts.start || 0
    this._end = opts.end || Number(length)
    this._chunkSize = parseInt(opts.chunkSize || Math.max(this._end / 1000, 200 * 1024))
  }

  _read () {
    if (this.destroyed) return
    const startOffset = this._start
    let endOffset = this._start + this._chunkSize
    if (endOffset >= this._length - 1) endOffset = this._length - 1

    if (startOffset === this._length) {
      this.destroy()
      this.push(null)
      return
    }
    fetch(this._url, {
      headers: {
        'Content-Range': `bytes ${startOffset}-${endOffset}/${this._length}`,
        range: `bytes=${startOffset}-${endOffset}/${this._length}`
      }
    }).then(res => {
      res.arrayBuffer().then(ab => {
        this.push(new Uint8Array(ab))
      })
    })
    // update the stream offset
    this._start = endOffset + 1
  }

  destroy () {
    this.destroyed = true
  }
}
