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

  async function handleSingleHandle(handle) {
    if (!(await asyncSome(handles, recent => recent.isSameEntry(handle)))) {
      handles.unshift(handle)
      handles.length = Math.min(handles.length, 15)
      set('recents', handles, db)
    }
  }
  export async function updateRecents(files) {
    if (supported && db) {
      for (const file of files) {
        handleSingleHandle(file instanceof FileSystemFileHandle ? file : await file.getAsFileSystemHandle())
      }
      set('recents', handles, db)
    }
  }
</script>

<script>
  export let files = null
  let recents = []
  get('recents', db).then(async rec => {
    recents = handles = await Promise.all(rec || [])
  })
  async function selectFile(handle) {
    await handle.requestPermission({ mode: 'read' })
    files = [await handle.getFile()]
  }

  export let handlePopup = () => {}
</script>

<div class="h-full my-0 bg-very-dark">
  <div class="container h-full py-20">
    <div class="py-20 d-flex flex-column h-full">
      <div class="font-weight-bold font-size-24 p-5">Recent Files</div>
      <hr class="w-full my-15"/>
      <div class="overflow-y-auto">
        {#if supported}
          {#each recents as recent}
            <div class="p-5 pointer text-muted hover" on:click={selectFile(recent)}>
              <div class="ml-5">{recent.name}</div>
            </div>
          {:else}
            <div class="ml-5 p-5">Your recent files will show up here!</div>
          {/each}
        {:else if window.chrome}
          <div>
            Your browser doesn't support recent files, but it could! Visit <code class="code">chrome://flags</code> and enable <code class="code">#file-system-access-api!</code>
          </div>
        {:else}
          <div>Your browser doesn't support recent files.</div>
        {/if}
      </div>
      <div class="py-20 pointer text-muted hover mt-auto" on:click={handlePopup}>You can also drag-drop or paste files, or click here to select some!</div>
    </div>
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
