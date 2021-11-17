/* eslint-env browser */
export const videoExtensions = ['3g2', '3gp', 'asf', 'avi', 'dv', 'flv', 'gxf', 'm2ts', 'm4a', 'm4b', 'm4p', 'm4r', 'm4v', 'mkv', 'mov', 'mp4', 'mpd', 'mpeg', 'mpg', 'mxf', 'nut', 'ogm', 'ogv', 'swf', 'ts', 'vob', 'webm', 'wmv', 'wtv']
export const videoRx = new RegExp(`.(${videoExtensions.join('|')})$`, 'i')

export const subtitleExtensions = ['srt', 'vtt', 'ass', 'ssa', 'sub', 'txt']
export const subRx = new RegExp(`.(${subtitleExtensions.join('|')})$`, 'i')

export const audioExtensions = ['3gp', '3gpp', '3g2', 'aac', 'adts', 'ac3', 'amr', 'eac3', 'flac', 'mp3', 'm4a', 'mp4', 'mp4a', 'mpga', 'mp2', 'mp2a', 'mp3', 'm2a', 'm3a', 'oga', 'ogg', 'mogg', 'spx', 'opus', 'raw', 'wav', 'weba']
export const audioRx = new RegExp(`.(${audioExtensions.join('|')})$`, 'i')

export const imageExtensions = ['apng', 'avif', 'bmp', 'gif', 'ico', 'jpg', 'jpeg', 'jfif', 'pjpeg', 'pjp', 'png', 'svg', 'tif', 'tiff', 'webp']
export const imageRx = new RegExp(`.(${imageExtensions.join('|')})$`, 'i')

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

export const DOMPARSER = new DOMParser().parseFromString.bind(new DOMParser())

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
