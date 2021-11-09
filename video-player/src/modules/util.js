/* eslint-env browser */
export function toTS (sec, full) {
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

const videoExtensions = ['3g2', '3gp', 'asf', 'avi', 'dv', 'flv', 'gxf', 'm2ts', 'm4a', 'm4b', 'm4p', 'm4r', 'm4v', 'mkv', 'mov', 'mp4', 'mpd', 'mpeg', 'mpg', 'mxf', 'nut', 'ogm', 'ogv', 'swf', 'ts', 'vob', 'webm', 'wmv', 'wtv']
export const videoRx = new RegExp(`.(${videoExtensions.join('|')})$`, 'i')
const subtitleExtensions = ['srt', 'vtt', 'ass', 'ssa', 'sub', 'txt']
export const subRx = new RegExp(`.(${subtitleExtensions.join('|')})$`, 'i')

export function requestTimeout (callback, delay) {
  const startedAt = Date.now()
  let animationFrame = requestAnimationFrame(tick)
  function tick () {
    if (Date.now() - startedAt >= delay) {
      callback()
    } else {
      animationFrame = requestAnimationFrame(tick)
    }
  }
  return {
    clear: () => cancelAnimationFrame(animationFrame)
  }
}

export function cancelTimeout (timeout) {
  if (timeout) {
    timeout.clear()
  }
}
