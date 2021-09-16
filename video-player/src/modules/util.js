export function toTS (sec, full) {
  if (isNaN(sec) || sec < 0) {
    return full ? '00:00' : '0:00'
  }
  const hours = Math.floor(sec / 3600)
  let minutes = Math.floor(sec / 60) - hours * 60
  let seconds = Math.floor(sec % 60)
  if (full && minutes < 10) minutes = '0' + minutes
  if (seconds < 10) seconds = '0' + seconds
  return hours > 0 ? hours + ':' + minutes + ':' + seconds : minutes + ':' + seconds
}

if (!ReadableStream.prototype[Symbol.asyncIterator]) {
  ReadableStream.prototype[Symbol.asyncIterator] = async function * () {
    const reader = this.getReader()
    while (1) {
      const chunk = await reader.read()
      if (chunk.done) return chunk.value
      yield chunk.value
    }
  }
}
