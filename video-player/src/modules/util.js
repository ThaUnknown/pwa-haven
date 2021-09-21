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
