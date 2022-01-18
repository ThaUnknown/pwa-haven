<script>
  import InstallPrompt from './modules/InstallPrompt.svelte'
  import { filePopup, handleItems, getSearchFiles, getLaunchFiles } from '../../shared/inputHandler.js'
  import { unzip } from 'unzipit'
  import Page from './modules/Page.svelte'
  import Reader from './modules/Reader.svelte'
  import VerticalReader from './modules/VerticalReader.svelte'
  let name = 'Manga Reader'
  let pages = []
  let options = {
    mode: 'cover',
    crop: true,
    pad: false
  }

  navigator.serviceWorker.register('/sw.js')

  // loading files
  async function handleInput({ dataTransfer, clipboardData }) {
    const items = clipboardData?.items || dataTransfer?.items
    if (items) {
      handleFiles(await handleItems(items, ['book']))
    }
  }

  if ('launchQueue' in window) {
    getLaunchFiles().then(handleFiles)
  }
  async function handlePopup() {
    if (!files.length) {
      handleFiles(await filePopup(['book']))
    }
  }
  async function handleFiles(newfiles) {
    if (newfiles?.length) {
      pages = Object.values((await unzip(newfiles[0])).entries).filter(page => !page.isDirectory)
      name = newfiles[0].name.match(/([^-–]+)/)[0].trim()
      currentIndex = 0
    }
  }
  handleFiles(getSearchFiles(['book']))
  let immersed = false
  let immerseTimeout = null

  function immerseReader() {
    immersed = true
    immerseTimeout = undefined
  }

  function resetImmerse() {
    if (immerseTimeout) {
      clearTimeout(immerseTimeout)
    } else {
      immersed = false
    }
    immerseTimeout = setTimeout(immerseReader, 2 * 1000)
  }

  async function handleKeydown({ key }) {
    switch (key) {
      case 'ArrowLeft':
        gotoNext()
        break
      case 'ArrowRight':
        gotoPrev()
        break
    }
  }
  let gotoNext, gotoPrev
  let currentIndex = 0
</script>

<div class="sticky-alerts d-flex flex-column-reverse">
  <InstallPrompt />
</div>
{#if options.mode === 'vertical'}
  <VerticalReader items={pages} let:item bind:currentIndex>
    <Page file={item} {options}/>
  </VerticalReader>
{:else}
  <Reader items={pages} let:item bind:gotoNext bind:gotoPrev bind:currentIndex>
    <Page file={item} {options} />
  </Reader>
{/if}

<div class="position-absolute buttons row w-full justify-content-center controls" class:immersed>
  {#if options.mode !== 'vertical'}
    <div class="btn-group bg-dark-dm bg-light-lm rounded m-5 col-auto">
      <button class="btn btn-lg btn-square material-icons" type="button" on:click={gotoNext}>arrow_back</button>
      <button class="btn btn-lg btn-square material-icons" type="button" on:click={gotoPrev}>arrow_forward</button>
    </div>
  {/if}

  <div class="btn-group bg-dark-dm bg-light-lm rounded m-5 col-auto">
    <button class="btn btn-lg btn-square material-icons" type="button" on:click={() => (options.mode = 'fit')}>zoom_out_map</button>
    <button class="btn btn-lg btn-square material-icons" type="button" on:click={() => (options.mode = 'cover')}>expand</button>
    <button class="btn btn-lg btn-square material-icons" type="button" on:click={() => (options.mode = 'vertical')}>height</button>
  </div>
  <div class="btn-group bg-dark-dm bg-light-lm rounded m-5 col-auto">
    <button class="btn btn-lg btn-square material-icons" type="button" on:click={() => (options.crop = !options.crop)}>{options.crop ? 'crop' : 'crop_free'}</button>
  </div>
</div>

<svelte:head>
  <title>{name}</title>
</svelte:head>

<svelte:window
  on:drop|preventDefault={handleInput}
  on:dragenter|preventDefault
  on:dragover|preventDefault
  on:dragstart|preventDefault
  on:dragleave|preventDefault
  on:paste|preventDefault={handleInput}
  on:keydown={handleKeydown}
  on:mousemove={resetImmerse}
  on:touchmove={resetImmerse}
  on:mouseleave={immerseReader} />

<style>
  :global(body) {
    position: unset !important;
  }

  .controls {
    transition: 0.5s opacity ease;
    opacity: 1;
  }
  .immersed {
    opacity: 0;
  }
  .buttons {
    bottom: 8rem;
    left: 50%;
    transform: translate(-50%, 0);
  }
  .sticky-alerts {
    --sticky-alerts-top: auto;
    bottom: 1rem;
  }
</style>
