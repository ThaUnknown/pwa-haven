<script>
  import InstallPrompt from './modules/InstallPrompt.svelte'
  import { filePopup, handleItems, getSearchFiles, getLaunchFiles } from '../../shared/inputHandler.js'
  import { unzip } from 'unzipit'
  import Page from './modules/Page.svelte'
  let name = 'Manga Reader'
  let pages = []
  let options = {
    mode: 'cover',
    crop: true,
    pad: false
  }
  let page = 0
  function next() {
    page = Math.min(pages.length - 1, page + 1)
  }
  function last() {
    page = Math.max(page - 1, 0)
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
      page = 0
    }
  }
  handleFiles(getSearchFiles(['book']))
</script>

<div class="sticky-alerts d-flex flex-column-reverse">
  <InstallPrompt />
</div>
<div
  class="h-full w-full pages-wrapper"
  class:overflow-y-auto={options.mode === 'vertical'}
  class:single={options.mode !== 'vertical'}
  style={options.mode !== 'vertical' ? `transform: translateX(${100 * page}vw)` : ''}>
  {#each pages as file}
    <Page {file} bind:options />
  {/each}
</div>

<div class="position-absolute buttons row w-full justify-content-center">
  <div class="btn-group bg-dark-dm bg-light-lm rounded m-5 col-auto">
    <button class="btn btn-lg btn-square material-icons" type="button" on:click={next}>arrow_back</button>
    <button class="btn btn-lg btn-square material-icons" type="button" on:click={last}>arrow_forward</button>
  </div>

  <!-- <div class="btn-group input-group bg-dark-dm bg-light-lm rounded m-5 w-200 col-auto">
    <button class="btn btn-lg btn-square material-icons" type="button" on:click={resetPos}>zoom_out_map</button>
    <button class="btn btn-lg btn-square material-icons" type="button" on:click={() => handleZoom({ deltaY: 100 })}>remove</button>
    <input type="number" step="0.1" min="0.1" class="form-control form-control-lg text-right" placeholder="Scale" readonly value={zoom.toFixed(1)} />
    <button class="btn btn-lg btn-square material-icons" type="button" on:click={() => handleZoom({ deltaY: -100 })}>add</button>
  </div> -->
  <div class="btn-group bg-dark-dm bg-light-lm rounded m-5 col-auto">
    <button class="btn btn-lg btn-square material-icons" type="button" on:click={() => (options.mode = 'fit')}>zoom_out_map</button>
    <button class="btn btn-lg btn-square material-icons" type="button" on:click={() => (options.mode = 'cover')}>expand</button>
    <button class="btn btn-lg btn-square material-icons" type="button" on:click={() => (options.mode = 'vertical')}>height</button>
  </div>
  <div class="btn-group bg-dark-dm bg-light-lm rounded m-5 col-auto">
    <button class="btn btn-lg btn-square material-icons" type="button" on:click={() => (options.crop = !options.crop)}>{options.crop ? 'crop' : 'crop_free'}</button>
    <button class="btn btn-lg btn-square material-icons" type="button" on:click={() => (options.pad = !options.pad)}>{options.pad ? 'crop_5_4' : 'crop_portrait'}</button>
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
  on:paste|preventDefault={handleInput} />

<style>
  :global(body) {
    position: unset !important;
  }
  .pages-wrapper {
    transition: all 0.2s cubic-bezier(0.25, 0.8, 0.25, 1);
    display: flex;
    flex-direction: column;
  }
  .single {
    flex-direction: row-reverse;
  }
  .input-group button {
    flex: unset;
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
  input::-webkit-inner-spin-button {
    display: none;
  }
  input {
    -moz-appearance: textfield;
  }
</style>
