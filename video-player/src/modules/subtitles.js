export default class Subtitles {
  constructor (video, files, selected) {
    this.video = video
    this.selected = selected || null
    this.files = files || []
  }

  destroy () {
    this.files = null
    this.video = null
    this.selected = null
  }
}
