<script>
  import { setFile } from './server.js'
  import './streamable.js'
  import Subtitles from './subtitles.js'
  export let files = []
  let src = null
  let video = null
  let selected = null
  let subs = null

  $: testVideo(files)
  async function testVideo(files) {
    if (files && files.length) {
      selected = files[0]
      setFile(selected)
      subs = new Subtitles(video, files, selected)
      console.log(subs)
      src = `player/${selected.name}`
    }
  }
</script>

<!-- svelte-ignore a11y-media-has-caption -->
<video {src} width="700px" controls bind:this={video} />
