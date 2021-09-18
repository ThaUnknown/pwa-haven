<script>
  import { SubtitleParser } from 'matroska-subtitles'
  import './util.js'
  import FileReadStream from 'filestream/read'
  export let files = []

  $: testVideo(files)
  async function testVideo(files) {
    if (files && files.length) {
      const parser = new SubtitleParser()
      parser.once('tracks', console.log)
      parser.on('subtitle', console.log)
      const stream = new FileReadStream(files[0])
      console.log(stream, parser)
      stream.pipe(parser)
    }
  }
</script>

<div />
