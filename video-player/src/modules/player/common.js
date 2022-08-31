export function toggleDropdown ({ target }) {
  target.closest('.dropdown').classList.toggle('show')
}

export function getBurnIn (video, subs, noSubs = !subs.renderer) {
  const canvas = document.createElement('canvas')
  canvas.style.width = '1px'
  canvas.style.height = '1px'
  canvas.style.position = 'absolute'
  const context = canvas.getContext('2d')
  let loop = null
  canvas.width = video.videoWidth
  canvas.height = video.videoHeight
  if (!noSubs) subs.renderer.resize(video.videoWidth, video.videoHeight)
  const renderFrame = () => {
    context.drawImage(video, 0, 0)
    if (!noSubs) context.drawImage(subs.renderer?._canvas, 0, 0, canvas.width, canvas.height)
    loop = video.requestVideoFrameCallback(renderFrame)
  }
  renderFrame()
  const destroy = () => {
    if (!noSubs) subs.renderer.resize()
    video.cancelVideoFrameCallback(loop)
    canvas.remove()
  }

  return { stream: canvas.captureStream(), destroy, canvas }
}
