import { URLFile } from '../../../shared/URLFile.js'
import 'fast-readable-async-iterator'

// way too lazy to implement this on each file the browser creates
URLFile.prototype.onIterator = File.prototype.onIterator = () => {}

File.prototype[Symbol.asyncIterator] = function (opts = {}) {
  return (opts ? this.slice(opts.start) : this).stream()[Symbol.asyncIterator]()
}

URLFile.prototype[Symbol.asyncIterator] = function (opts) {
  return new ReadableURL(this.url, this.size, opts)[Symbol.asyncIterator]()
}

class ReadableURL {
  /**
   * @param {String} url
   * @param {any} opts
   */
  constructor (url, length, opts = {}) {
    if (!length) throw new Error('No length specified!')
    this._length = Number(length)
    this._url = url
    this._start = opts.start || 0
    this._end = opts.end || Number(length)
    this._chunkSize = parseInt(opts.chunkSize || Math.max(this._end / 1000, 200 * 1024))
  }

  async * [Symbol.asyncIterator] () {
    while (true) {
      if (this.destroyed) return null
      const startOffset = this._start
      let endOffset = this._start + this._chunkSize
      if (endOffset >= this._length - 1) endOffset = this._length - 1

      if (startOffset === this._length) return null
      const res = await fetch(this._url, {
        headers: {
          'Content-Range': `bytes ${startOffset}-${endOffset}/${this._length}`,
          range: `bytes=${startOffset}-${endOffset}/${this._length}`,
          'Content-Length': `${endOffset - startOffset + 1}`
        }
      })
      yield new Uint8Array(await res.arrayBuffer())
      // update the stream offset
      this._start = endOffset + 1
    }
  }
}
