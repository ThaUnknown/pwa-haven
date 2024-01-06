<script>
  import Seekbar from 'perfect-seekbar'

  export let currentTime = 0
  export let safeduration = 0
  export let targetTime = 0
  export let thumbnailData = null
  export let paused = false
  export let chapters = []
  export let buffer = 0
  $: progress = currentTime / safeduration * 100

  let wasPaused = false
  function handleMouseDown ({ detail }) {
    if (wasPaused == null) {
      wasPaused = paused
      paused = true
    }
    targetTime = detail / 100 * safeduration
  }
  function handleMouseUp () {
    paused = wasPaused
    wasPaused = null
    currentTime = targetTime
  }
  function getThumbnail (percent) {
    return thumbnailData.thumbnails[Math.floor(percent / 100 * safeduration / thumbnailData.interval)] || ''
  }

  function sanitiseChapters (chapters, safeduration) {
    if (!chapters?.length) return []
    const sanitised = []
    const first = chapters[0]
    if (first.start !== 0) {
      sanitised.push({ size: Math.max(first.start, 0) / 10 / safeduration })
    }
    for (let { start, end, text } of chapters) {
      if (start > safeduration * 1000) continue
      if (end > safeduration * 1000) end = safeduration * 1000
      sanitised.push({
        size: (end / 10 / safeduration) - (start / 10 / safeduration),
        text
      })
    }
    const last = sanitised[sanitised.length - 1]
    if (last.end !== safeduration) {
      sanitised.push(100 - (last.end / 10 / safeduration))
    }
    return sanitised
  }
</script>

<div class='w-full d-flex align-items-center h-20 mb--5'>
  <Seekbar
    accentColor='#ff3c00'
    class='font-size-20'
    length={safeduration}
    buffer={buffer / safeduration * 100}
    bind:progress={progress}
    on:seeking={handleMouseDown}
    on:seeked={handleMouseUp}
    chapters={sanitiseChapters(chapters, safeduration)}
    {getThumbnail}
  />
</div>
