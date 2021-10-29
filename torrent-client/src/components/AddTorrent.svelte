<script>
  import { Tabs, TabLabel, Tab } from '../modules/Tabination.js'
  import { fastPrettyBytes } from '../modules/util.js'
  import { addTorrent, removeTorrent } from '../modules/client.js'
  let value = ''
  let torrent = null
  let files = []
  let fileInput
  const defaultData = {
    announce: ['wss://tracker.openwebtorrent.com', 'wss://spacetradersapi-chatbox.herokuapp.com:443/announce', 'wss://peertube.cpy.re:443/tracker/socket'],
    comment: 'Created With PWA Haven',
    createdBy: 'PWA Haven',
    name: ''
  }
  let createTorrent = Object.assign({}, defaultData)
  function handleClose(success) {
    if (!(success === true)) torrent?.destroy({ destroyStore: true })
    files = []
    torrent = null
    value = ''
    createTorrent = Object.assign({}, defaultData)
    fileInput.files = null
    fileInput.value = null
  }
  function handleFileInput({ target }) {
    files = [...target.files]
    handleTorrent(files, true)
  }
  function handleTextInput({ target }) {
    handleTorrent([target.value], true)
  }
  const torrentRx = /(^magnet:)|(^[A-F\d]{8,40}$)|(\.torrent$)/i
  let peers = []
  export function handleTorrent(fileList, skip) {
    if (!skip) files = fileList
    const initTorrent = async () => {
      let id = null
      if (fileList.length === 1) {
        if (typeof fileList[0] === 'string' && torrentRx.test(fileList[0])) {
          id = fileList[0]
        } else if (torrentRx.test(fileList[0].name)) {
          id = fileList[0]
        }
      }
      if (id) {
        torrent = await addTorrent(id)
        torrent.once('ready', () => {
          torrent.pause()
          files = torrent.files
          peers = Object.values(torrent._peers).map(peer => ({ type: peer.type, addr: peer.addr }))
          for (const id in torrent._peers) {
            torrent.removePeer(id)
          }
          torrent = torrent
        })
      }
      value = fileList.map(file => (typeof file === 'string' ? file : file.name)).join(' ,')
    }

    if (torrent) {
      peers = []
      removeTorrent(torrent, { destroyStore: true }, initTorrent)
      torrent = null
      files = []
    } else {
      initTorrent()
    }
  }
  function handleAddTorrent() {
    if (torrent) {
      torrent.resume()
      for (const peer of peers) {
        if (peer.type === 'webSeed') {
          torrent.addWebSeed(peer.addr)
        } else if (peer.type !== 'webrtc') {
          torrent.addPeer(peer.addr)
        }
      }
    } else {
      addTorrent(files, createTorrent)
    }
    handleClose(true)
  }
  function setPriority(value, file) {
    torrent.files.filter(item => item === file)[0].select(value)
  }
  function handleTracker({ target }) {
    if (torrent) {
      torrent.announce = target.value.split('\n')
    } else {
      createTorrent.announce = target.value.split('\n')
    }
  }
</script>

<div class="modal-dialog" role="document">
  <div class="modal-content w-three-quarter mh-three-quarter d-flex flex-column justify-content-between bg-very-dark-dm bg-light-lm p-0">
    <div class="content">
      <button class="close" data-dismiss="modal" type="button" aria-label="Close" on:click={handleClose}>
        <span aria-hidden="true">&times;</span>
      </button>
      <h5 class="modal-title font-weight-bold">Add Torrent</h5>
      <div class="text-right mt-20">
        <div class="input-group">
          <div class="input-group-prepend">
            <input type="file" class="d-none" id="torrent-file-input" bind:this={fileInput} on:input={handleFileInput} multiple />
            <label for="torrent-file-input" class="btn btn-primary">Select File</label>
          </div>
          <input type="text" class="form-control" placeholder="File, Magnet or InfoHash" {value} on:input={handleTextInput} />
          <div class="input-group-append" on:click={handleAddTorrent}>
            <button class="btn btn-success font-weight-bold" type="button" data-dismiss="modal" aria-label="Close">Add</button>
          </div>
        </div>
      </div>
    </div>
    {#if files?.length}
      <Tabs>
        <div class="d-flex flex-column w-full overflow-hidden flex-grow-1">
          <div class="d-flex flex-row px-20 pt-5">
            <div class="d-flex flex-row">
              <TabLabel>Information</TabLabel>
              <TabLabel>
                Files {files?.length}
              </TabLabel>
              <TabLabel>
                Trackers {torrent?.announce?.length || createTorrent.announce.length}
              </TabLabel>
            </div>
          </div>
          <div class="bg-dark-dm bg-white-lm overflow-y-scroll flex-grow-1">
            <Tab>
              <div class="content my-20">
                <div class="input-group my-5">
                  <div class="input-group-prepend">
                    <span class="input-group-text w-100 flex-row-reverse">Name</span>
                  </div>
                  {#if torrent}
                    <input type="text" class="form-control" placeholder="Torrent Name" value={torrent.name || ''} name="name" readonly />
                  {:else}
                    <input type="text" class="form-control" placeholder="Torrent Name" bind:value={createTorrent.name} name="name" />
                  {/if}
                </div>
                <div class="input-group my-5">
                  <div class="input-group-prepend">
                    <span class="input-group-text w-100 flex-row-reverse">Comment</span>
                  </div>
                  {#if torrent}
                    <input type="text" class="form-control" placeholder="Created With wTorrent" value={torrent.comment || ''} name="comment" readonly />
                  {:else}
                    <input type="text" class="form-control" placeholder="Created With wTorrent" bind:value={createTorrent.comment} name="comment" />
                  {/if}
                </div>
                <div class="input-group my-5">
                  <div class="input-group-prepend">
                    <span class="input-group-text w-100 flex-row-reverse">Author</span>
                  </div>
                  {#if torrent}
                    <input type="text" class="form-control" placeholder="wTorrent" value={torrent.createdBy || ''} name="createdBy" readonly />
                  {:else}
                    <input type="text" class="form-control" placeholder="wTorrent" bind:value={createTorrent.createdBy} name="createdBy" />
                  {/if}
                </div>
                <div class="input-group my-5">
                  <div class="input-group-prepend">
                    <span class="input-group-text w-100 flex-row-reverse">File Size</span>
                  </div>
                  <input type="text" class="form-control" value={fastPrettyBytes(torrent?.length || files.reduce((sum, { size }) => sum + size, 0))} readonly />
                </div>
              </div>
            </Tab>
            <Tab>
              <div class="content my-5">
                <table class="table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Filesize</th>
                      {#if torrent}
                        <th class="w-100">Priority</th>
                      {/if}
                    </tr>
                  </thead>
                  <tbody>
                    {#each files.sort((a, b) => b.length - a.length) as file}
                      <tr>
                        <td>{file.name}</td>
                        <td>{(file.length && fastPrettyBytes(file.length)) || (file.size && fastPrettyBytes(file.size)) || '?'}</td>
                        {#if torrent}
                          <td><input type="number" placeholder="0" class="form-control" on:input={value => setPriority(value, file)} /></td>
                        {/if}
                      </tr>
                    {/each}
                  </tbody>
                </table>
              </div>
            </Tab>
            <Tab>
              <div class="content my-5">
                <textarea
                  class="form-control w-full h-350 my-20 form-control-md"
                  placeholder="wss://exampletracker.xyz:port"
                  value={(torrent?.announce || createTorrent.announce).join('\n')}
                  on:input={handleTracker} />
              </div>
            </Tab>
          </div>
        </div>
      </Tabs>
    {/if}
  </div>
</div>

<style>
  .mh-three-quarter {
    max-height: 75%;
  }
</style>
