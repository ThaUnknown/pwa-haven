/* eslint-env browser */
import { audioRx, videoRx, imageRx, subRx, audioExtensions, videoExtensions, imageExtensions, subtitleExtensions, DOMPARSER } from './util'

// types: image, audio, video, subtitle
export async function handleItems (transferList = [], types = []) {
  const items = await Promise.all([...transferList].map(item => processItem(item, types)))
  return items.flat().filter(i => i)
}
const rxMap = {
  audio: audioRx,
  video: videoRx,
  image: imageRx,
  subtitle: subRx
}
const exMap = {
  audio: audioExtensions,
  video: videoExtensions,
  image: imageExtensions,
  subtitle: subtitleExtensions
}
const selectorMap = {
  image: 'img',
  subtitle: 'input'
}

async function processItem (item, types) {
  if (!item) return null
  if (item.type) {
    // type matches File
    if (types.some(type => item.type.indexOf(type) === 0)) return item.getAsFile()
    // text
    if (item.type === 'text/plain') {
      // URL
      if (item.kind === 'string') {
        const string = await new Promise(resolve => item.getAsString(resolve))
        try {
          // URL might be invalid
          const url = new URL(string)
          const type = types.find(type => string.match(rxMap[type]))
          if (url && type) {
            return {
              url: string,
              name: string.substring(string.lastIndexOf('/') + 1),
              type
            }
          }
        } catch (e) { }
        return null
      }
      // Text File
      if (item.kind === 'file') {
        const file = item.getAsFile()
        if (types.some(type => file.name.match(rxMap[type]))) return file
      }
      return null
    }
    // XML or clipboard
    if (item.type === 'text/html') {
      const string = await new Promise(resolve => item.getAsString(resolve))
      const elems = types.map(type => DOMPARSER(string, 'text/html').querySelectorAll(selectorMap[type] || type)).flat()
      if (!elems.length) return null
      return elems.map(elem => {
        const url = elem.src || elem.value
        if (url) {
          return {
            url,
            name: url.substring(url.lastIndexOf('/') + 1)
          }
        }
        return null
      })
    }
  }
  // Folder or unknown file type
  const entry = item.webkitGetAsEntry()
  if (entry?.isDirectory) {
    const entries = await new Promise(resolve => entry.createReader().readEntries(resolve))
    const filePromises = entries.filter(entry => entry.isFile && types.some(type => entry.name.match(rxMap[type]))).map(file => new Promise(resolve => file.file(resolve)))
    return Promise.all(filePromises)
  }
  if (entry?.isFile) {
    if (types.some(type => entry.name.match(rxMap[type]))) {
      return new Promise(resolve => entry.file(resolve))
    }
  }
}
export function filePopup (types = []) {
  return new Promise(resolve => {
    let input = document.createElement('input')
    input.type = 'file'
    input.multiple = 'multiple'
    input.accept = types.map(type => '.' + exMap[type].join(',.')).flat()

    input.onchange = async ({ target }) => {
      resolve([...target.files])
      input = null
    }
    input.click()
  })
}

export function getSearchFiles (types) {
  const search = [...new URLSearchParams(location.search)]
  if (!search.length) return null
  const files = []
  for (const param of search) {
    const type = types.find(type => param[1].match(rxMap[type]))
    if (type) {
      const name = param[1].substring(Math.max(param[1].lastIndexOf('\\') + 2, param[1].lastIndexOf('/') + 1))
      files.push({
        name,
        url: param[1]
      })
    }
  }
  return files
}
export async function getLaunchFiles () {
  /* global launchQueue */
  launchQueue.setConsumer(async launchParams => {
    if (!launchParams.files.length) {
      return
    }
    const promises = launchParams.files.map(file => file.getFile())
    // for some fucking reason, the same file can get passed multiple times, why? I still want to future-proof multi-files
    return (await Promise.all(promises)).filter((file, index, all) => {
      return all.findIndex(search => {
        return search.name === file.name && search.size === file.size && search.lastModified === file.lastModified
      }) === index
    })
  })
}
