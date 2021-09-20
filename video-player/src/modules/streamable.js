import rangeParser from 'range-parser'
import eos from 'end-of-stream'
import FileReadStream from 'filestream/read'

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
  }
})
