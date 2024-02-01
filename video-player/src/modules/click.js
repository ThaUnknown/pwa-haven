let lastTapElement = null
let lastHoverElement = null

document.addEventListener('pointerup', () => {
  setTimeout(() => {
    lastTapElement?.(false)
    lastTapElement = null
    lastHoverElement?.(false)
    lastHoverElement = null
  })
})

export function click (node, cb = _ => {}) {
  node.tabIndex = 0
  node.role = 'button'
  node.addEventListener('click', e => {
    e.stopPropagation()
    navigator.vibrate(15)
    cb(e)
  })
  node.addEventListener('pointerup', e => {
    e.stopPropagation()
  })
  node.addEventListener('pointerleave', e => {
    e.stopPropagation()
  })
  node.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      e.stopPropagation()
      cb(e)
    }
  })
}
