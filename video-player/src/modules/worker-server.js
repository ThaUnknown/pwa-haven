let serviceWorker = null
let workerPortCount
let workerKeepAliveInterval = null
const scope = location.pathname.substr(0, location.pathname.lastIndexOf('/') + 1)
const worker = location.origin + scope + 'server.js' === navigator.serviceWorker?.controller?.scriptURL && navigator.serviceWorker.controller
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

function loadWorker (controller, cb = () => {}) {
  if (!(controller instanceof ServiceWorker)) throw new Error('Invalid worker registration')
  if (controller.state !== 'activated') throw new Error('Worker isn\'t activated')
  const keepAliveTime = 20000

  serviceWorker = controller

  navigator.serviceWorker.addEventListener('message', event => {
    const { data } = event
    if (!data?.type === 'player' || !data.url) return null
    let [infoHash, ...filePath] = data.url.slice(data.url.indexOf(data.scope + 'player/') + 11 + data.scope.length).split('/')
    filePath = decodeURI(filePath.join('/'))
    if (!infoHash || !filePath) return null

    const [port] = event.ports

    const file = this.get(infoHash) && this.get(infoHash).files.find(file => file.path === filePath)
    if (!file) return null

    const [response, stream, raw] = file._serve(data)
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
        if (!workerKeepAliveInterval) workerKeepAliveInterval = setInterval(() => fetch(`${serviceWorker.scriptURL.substr(0, serviceWorker.scriptURL.lastIndexOf('/') + 1).slice(window.location.origin.length)}player/keepalive/`), keepAliveTime)
      } else {
        cleanup()
      }
    }
    workerPortCount++
    port.postMessage(response)
  })
  cb(serviceWorker)
}
