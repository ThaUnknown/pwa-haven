<script>
  import { SubtitleStream } from 'matroska-subtitles'
  import './util.js'
  import FileReadStream from 'filestream/read'
  import rangeParser from 'range-parser'
  import eos from 'end-of-stream'
  export let files = []
  let src = null
  let parsed = false
  let parser = null
  let workerPortCount = 0
  let workerKeepAliveInterval = null
  const scope = location.pathname.substr(0, location.pathname.lastIndexOf('/') + 1)
  const worker = location.origin + scope + 'server.js' === navigator.serviceWorker?.controller?.scriptURL && navigator.serviceWorker.controller

  function handleParser(parser) {
    parser.once('tracks', console.log)
    parser.on('subtitle', console.log)
  }

  const handleWorker = worker => {
    const checkState = worker => {
      return worker.state === 'activated' && loadWorker(worker)
    }
    if (!checkState(worker)) {
      worker.addEventListener('statechange', ({ target }) => checkState(target))
    }
  }
  if (worker) {
    handleWorker(worker)
  } else {
    navigator.serviceWorker
      .register('server.js', { scope })
      .then(reg => {
        handleWorker(reg.active || reg.waiting || reg.installing)
      })
      .catch(e => {
        if (String(e) === 'InvalidStateError: Failed to register a ServiceWorker: The document is in an invalid state.') {
          location.reload() // weird workaround for a weird bug
        } else {
          throw e
        }
      })
  }

  function findFile(name) {
    return files.find(file => file.name === name)
  }

  function createReadStream(file, opts) {
    const sliced = file.slice(opts.start, opts.end + 1)
    return new FileReadStream(sliced)
  }

  function serveFile(file, req) {
    const res = {
      status: 200,
      headers: {
        // Support range-requests
        'Accept-Ranges': 'bytes',
        'Content-Type': file.type,
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
    let range = rangeParser(file.size, req.headers.range || '')

    if (range.constructor === Array) {
      res.status = 206 // indicates that range-request was understood

      // no support for multi-range request, just use the first range
      range = range[0]

      res.headers['Content-Range'] = `bytes ${range.start}-${range.end}/${file.size}`
      res.headers['Content-Length'] = `${range.end - range.start + 1}`
    } else {
      res.headers['Content-Length'] = file.size
    }

    const stream = req.method === 'GET' && createReadStream(file, range)

    let pipe = null
    if (stream && req.destination === 'video' && file.name.endsWith('.mkv') && !parsed) {
      pipe = parser = new SubtitleStream(parser)
      handleParser(parser)
      stream.pipe(parser)
      eos(pipe, () => {
        if (pipe) pipe.destroy()
        stream.destroy()
      })
    }
    return [res, pipe || stream, pipe && stream]
  }

  function loadWorker(controller) {
    if (!(controller instanceof ServiceWorker)) throw new Error('Invalid worker registration')
    if (controller.state !== 'activated') throw new Error("Worker isn't activated")
    const keepAliveTime = 20000

    navigator.serviceWorker.addEventListener('message', event => {
      const { data } = event
      if (!data?.type === 'player' || !data.url) return null
      const filePath = decodeURI(data.url.slice(data.url.indexOf(data.scope + 'player/') + 7 + data.scope.length))
      if (!filePath) return null

      const file = findFile(filePath)
      if (!file) return null

      const [port] = event.ports

      const [response, stream, raw] = serveFile(file, data)
      const asyncIterator = stream && stream[Symbol.asyncIterator]()

      const cleanup = () => {
        port.onmessage = null
        if (stream) stream.destroy()
        if (raw) raw.destroy()
        workerPortCount--
        if (!workerPortCount) {
          clearInterval(workerKeepAliveInterval)
          workerKeepAliveInterval = null
        }
      }

      port.onmessage = async msg => {
        if (msg.data) {
          let chunk
          try {
            chunk = (await asyncIterator.next()).value
          } catch (e) {
            // chunk is yet to be downloaded or it somehow failed, should this be logged?
          }
          port.postMessage(chunk)
          if (!chunk) cleanup()
          if (!workerKeepAliveInterval) {
            workerKeepAliveInterval = setInterval(
              () => fetch(`${controller.scriptURL.substr(0, controller.scriptURL.lastIndexOf('/') + 1).slice(window.location.origin.length)}player/keepalive/`),
              keepAliveTime
            )
          }
        } else {
          cleanup()
        }
      }
      workerPortCount++
      port.postMessage(response)
    })
  }

  $: testVideo(files)
  async function testVideo(files) {
    if (files && files.length) {
      src = `player/${files[0].name}`
    }
  }
</script>

<!-- svelte-ignore a11y-media-has-caption -->
<video {src} width="300px" controls />
