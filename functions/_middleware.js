export async function onRequest ({ request, next }) {
  const res = await next()
  const url = new URL(request.url)
  if (url.pathname.endsWith('/public/')) {
    const search = [...url.searchParams]
    if (search.length) {
      return new HTMLRewriter().on('meta', {
        element (element) {
          const elem = Object.fromEntries([...element.attributes])
          if (elem.property === 'og:image' && url.pathname.startsWith('/img-viewer/')) element.setAttribute('content', search[0][1])
          if (elem.property === 'twitter:image' && url.pathname.startsWith('/img-viewer/')) element.setAttribute('content', search[0][1])
          if (elem.property === 'og:audio' && url.pathname.startsWith('/audio-player/')) element.setAttribute('content', search[0][1])
          if (elem.property === 'og:video' && url.pathname.startsWith('/video-player/')) element.setAttribute('content', search[0][1])
        }
      }).transform(res)
    }
  }
  return res
}
