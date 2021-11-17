/* eslint-env browser */
// File object, but for URL xD
export class URLFile {
  constructor (url) {
    if (url instanceof Object) {
      this.name = url.name
      this.url = url.url
      this.type = url.type
    } else {
      this.name = url.substring(url.lastIndexOf('/') + 1)
      this.url = url
      this.type = ''
    }
    this.ready = new Promise((resolve) => {
      // I think no matter how many catches I have, this wont not error xd
      try {
        fetch(this.url, { method: 'HEAD' }).then(res => {
          if (!res.ok) resolve(new Error('Failed to request data!', res))
          const headers = Object.fromEntries(res.headers.entries())
          this.type = headers['content-type'] || this.type
          this.size = headers['content-length']
          if (this.size == null) resolve(new Error('Failed to get size data!', headers, res))
          this.lastModified = Date.parse(headers['last-modified'])
          resolve()
        }).catch(err => {
          resolve(new Error('Failed to make request!', err))
        })
      } catch (e) {
        resolve(e)
      }
    })
  }

  async stream () {
    const { body } = await fetch(this.url)
    return body
  }

  async text () {
    const { text } = await fetch(this.url)
    return text()
  }

  async arrayBuffer () {
    const { arrayBuffer } = await fetch(this.url)
    return arrayBuffer()
  }
}
