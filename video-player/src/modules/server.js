import throughput from 'throughput'
import rangeParser from 'range-parser'

const worker = navigator.serviceWorker.controller
const keepAliveTime = 20000

let workerPortCount = 0
let workerKeepAliveInterval = null
let file = null
export let speed = throughput(5)

export function setFile (streamable) {
  file = streamable
  speed = throughput(5)
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
    .register('/sw.js')
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

function findFile (name) {
  return file?.name === name && file
}

function loadWorker (controller) {
  if (!(controller instanceof ServiceWorker)) throw new Error('Invalid worker registration')
  if (controller.state !== 'activated') throw new Error('Worker isn\'t activated')
  navigator.serviceWorker.addEventListener('message', event => {
    const { data } = event
    if (!data?.type === 'server' || !data.url) return null
    const filePath = decodeURI(data.url.slice(data.url.indexOf('/server/') + 8))
    if (!filePath) return null

    const file = findFile(filePath)
    if (!file) return null

    const [port] = event.ports

    const { status, headers, body } = serveFile(file, data)
    const asyncIterator = body[Symbol.asyncIterator]?.()

    const cleanup = () => {
      port.onmessage = null
      if (body?.destroy) body.destroy()
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
          speed(chunk?.length)
        } catch (e) {
          // chunk is yet to be downloaded or it somehow failed, should this be logged?
        }
        port.postMessage(chunk)
        if (!chunk) cleanup()
        if (!workerKeepAliveInterval) {
          workerKeepAliveInterval = setInterval(
            () => fetch(`${controller.scriptURL.substr(0, controller.scriptURL.lastIndexOf('/') + 1).slice(window.location.origin.length)}server/keepalive/`),
            keepAliveTime
          )
        }
      } else {
        cleanup()
      }
    }
    workerPortCount++
    port.postMessage({
      status,
      headers,
      body: asyncIterator ? 'STREAM' : body
    })
  })
  fetch(`${controller.scriptURL.substr(0, controller.scriptURL.lastIndexOf('/') + 1).slice(window.location.origin.length)}server/cancel/`).then(res => {
    res.body.cancel()
  })
}

function serveFile (file, req) {
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

  if (req.method === 'GET') {
    const iterator = file[Symbol.asyncIterator](range)
    let transform = null
    file.onIterator({ iterator, req, file }, target => {
      transform = target
    })

    res.body = transform || iterator
  } else {
    res.body = false
  }
  return res
}
