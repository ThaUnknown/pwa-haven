import { Readable } from 'stream'
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
  }

  // this is async, but it really needs to be sync, oops...
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
