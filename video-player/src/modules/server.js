/* eslint-env browser */
const worker = navigator.serviceWorker.controller
const keepAliveTime = 20000

let workerPortCount = 0
let workerKeepAliveInterval = null
let file = null

export function setFile (streamable) {
  file = streamable
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
    if (!data?.type === 'player' || !data.url) return null
    const filePath = decodeURI(data.url.slice(data.url.indexOf(data.scope + 'video-player/public/player/') + 27 + data.scope.length))
    if (!filePath) return null

    const file = findFile(filePath)
    if (!file) return null

    const [port] = event.ports

    const [response, stream, raw] = file.serve(data)
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
