<script>
  import { fastPrettyBytes, fastToTS } from '../modules/util.js'
  import { Tabs, TabLabel, Tab } from '../modules/Tabination.js'
  import { onMount, onDestroy } from 'svelte'

  export let selected = null

  function close() {
    selected = null
  }
  let interval
  onMount(() => {
    interval = setInterval(() => {
      selected = selected
    }, 200)
  })
  onDestroy(() => {
    clearInterval(interval)
  })
</script>

{#if selected}
  <div class="height">
    <Tabs>
      <div class="d-flex flex-column h-full">
        <div class="d-flex flex-row px-20 pt-5">
          <TabLabel>Stats</TabLabel>
          <TabLabel>
            Files {selected.files?.length || ''}
          </TabLabel>
          <TabLabel>
            Peers {selected.numPeers || ''}
          </TabLabel>
          <div on:click={close} class="pointer px-10 py-5 mx-5 ml-auto sidebar-link bg-dark-dm bg-white-lm">Close</div>
        </div>
        <div class="bg-dark-dm bg-white-lm h-full overflow-y-scroll">
          <Tab>
            <div class="content my-5 d-flex flex-column">
              <table class="table">
                <tbody>
                  <tr>
                    <th>Upload Speed</th>
                    <td>{fastPrettyBytes(selected.uploadSpeed)}/s</td>
                    <th>Uploaded</th>
                    <td>{fastPrettyBytes(selected.uploaded)}</td>
                  </tr>
                  <tr>
                    <th>Download Speed</th>
                    <td>{fastPrettyBytes(selected.downloadSpeed)}/s</td>
                    <th>Downloaded</th>
                    <td>{fastPrettyBytes(selected.downloaded)}</td>
                  </tr>
                  <tr>
                    <th>Ratio</th>
                    <td>{selected.ratio.toFixed(3) || 0}</td>
                    <th>Time Remaining</th>
                    <td>{fastToTS(parseInt(selected.timeRemaining / 1000))}</td>
                  </tr>
                  <tr>
                    <th>Peers</th>
                    <td>{selected.numPeers || 0}</td>
                    <th>Files</th>
                    <td>{selected.files?.length || 0}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Tab>
          <Tab>
            <div class="content my-5">
              <table class="table table-auto">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Filesize</th>
                    <th>Downloaded</th>
                    <th>Progress</th>
                  </tr>
                </thead>
                <tbody>
                  {#if selected.files}
                    {#each selected.files.sort((a, b) => b.length - a.length) as file}
                      <tr>
                        <td>{file.name}</td>
                        <td>{fastPrettyBytes(file.length)}</td>
                        <td>{fastPrettyBytes(file.downloaded)}</td>
                        <td>{parseInt(file.progress * 100)}%</td>
                      </tr>
                    {/each}
                  {/if}
                </tbody>
              </table>
            </div>
          </Tab>
          <Tab>
            <div class="content my-5">
              <table class="table">
                <thead>
                  <tr>
                    <th>Address</th>
                    <th>Type</th>
                    <th>Up</th>
                    <th>Speed</th>
                    <th>Down</th>
                    <th>Speed</th>
                    <th>Ratio</th>
                    <th>Destroy</th>
                  </tr>
                </thead>
                <tbody>
                  {#if selected.wires}
                    {#each selected.wires.sort((a, b) => (a.peerId > b.peerId ? 1 : -1)) as wire}
                      <tr>
                        <td>{wire.remoteAddress || wire.type}</td>
                        <td>{wire.type}</td>
                        <td>{fastPrettyBytes(wire.uploaded)}</td>
                        <td>{fastPrettyBytes(wire.uploadSpeed())}/s</td>
                        <td>{fastPrettyBytes(wire.downloaded)}</td>
                        <td>{fastPrettyBytes(wire.downloadSpeed())}/s</td>
                        <td>{(wire.downloaded / (wire.uploaded || 1) / selected.length).toFixed(2)}</td>
                        <td class="text-danger pointer material-icons w-50" on:click={() => wire.destroy()}>link_off</td>
                      </tr>
                    {/each}
                  {/if}
                </tbody>
              </table>
            </div>
          </Tab>
        </div>
      </div>
    </Tabs>
  </div>
{/if}

<style>
  table {
    table-layout: fixed;
  }

  .table-auto {
    table-layout: auto;
  }
  .height {
    max-height: 50%;
    height: 30rem;
  }
</style>
