const units = [' B', ' kB', ' MB', ' GB', ' TB']
export function fastPrettyBytes (num) {
  if (isNaN(num)) return '0 B'
  if (num < 1) return num + ' B'
  const exponent = Math.min(Math.floor(Math.log(num) / Math.log(1000)), units.length - 1)
  return Number((num / Math.pow(1000, exponent)).toFixed(2)) + units[exponent]
}

export function fastToTS (sec, full) {
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
