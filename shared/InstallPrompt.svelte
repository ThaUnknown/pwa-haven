<script>
  let deferredPrompt

  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault()
    deferredPrompt = e
  })
  async function promptInstall () {
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      deferredPrompt = null
    }
  }
  function dismiss () {
    deferredPrompt = null
  }
</script>

{#if deferredPrompt}
  <div class="alert alert-success filled-dm show" on:click={promptInstall}>
    <h4 class="alert-heading">Install</h4>
    <button class="close" type="button" on:click={dismiss}><span>×</span></button>
    Click here to install the app for more features!
  </div>
{/if}

<style>
  .alert {
    display: block !important;
    animation: fly-in 0.4s cubic-bezier(0.25, 0.8, 0.25, 1);
  }

  @keyframes fly-in {
    0% {
      right: -50rem;
    }
    100% {
      right: 0;
    }
  }
</style>
