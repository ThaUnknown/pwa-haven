<script context="module">
  import { get, set, createStore } from 'idb-keyval'

  const supported = 'FileSystemFileHandle' in window

  const asyncSome = async (arr, predicate) => {
    for (let e of arr) {
      if (await predicate(e)) return true
    }
    return false
  }

  let db = null
  export function initDb(appName) {
    db = createStore(appName, 'recents')
  }

  let handles = []
  export async function updateRecents(file) {
    if (supported) {
      const handle = file instanceof FileSystemFileHandle ? file : await file.getAsFileSystemHandle()
      if (!(await asyncSome(handles, recent => recent.isSameEntry(handle)))) {
        handles.unshift(handle)
        handles.length = Math.min(handles.length, 15)
        set('recents', handles, db)
      }
    }
  }
</script>

<script>
  export let files = null
  let recents = []
  get('recents', db).then(async rec => {
    recents = handles = (await Promise.all(rec)) || []
  })
  async function selectFile(handle) {
    await handle.requestPermission({ mode: 'read' })
    files = [await handle.getFile()]
  }

  export let handlePopup = () => {}
</script>

<div class="content h-full my-0">
  <div class="container d-flex flex-column justify-content-between h-full py-20">
    <div class="py-20">
      <div class="font-weight-bold font-size-24 p-5">Recent Files</div>
      <hr />
      {#if supported}
        {#each recents as recent}
          <div class="p-5 pointer text-muted hover" on:click={selectFile(recent)}>
            <div class="ml-5">{recent.name}</div>
          </div>
        {:else}
          <div>Your recent files will show up here!</div>
        {/each}
      {:else if window.chrome}
        <div>Your browser doesn't support recent files, but it could! Visit chrome://flags and enable #file-system-access-api!</div>
      {:else}
        <div>Your browser doesn't support recent files.</div>
      {/if}
    </div>
    <div class="py-20 pointer" on:click={handlePopup}>You can also drag-drop or paste files, or click here to select some!</div>
  </div>
</div>

<style>
  .pointer {
    cursor: pointer;
  }
  .hover:hover {
    color: #fff !important;
  }
</style>
