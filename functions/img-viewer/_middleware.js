export async function onRequest ({ request, next }) {
  const url = new URL(request.url)
  if (url.pathname.includes('img-viewer/https://slow.pics/c/')) {
    const res = await fetch(url.pathname.split('/img-viewer/')[1])
    const text = await res.text()
    const match = text.match(/var collection = (.*);\n/)
    if (!match[1]) return next()
    const obj = JSON.parse(match[1])

    let destinationURL = url.origin + '/img-viewer/public/?'

    let i = 0
    for (const comparison of obj.comparisons) {
      for (const image of comparison.images) {
        destinationURL += i++ + '=' + 'https://i.slow.pics/' + image.publicFileName + '&'
      }
    }
    return Response.redirect(destinationURL, 301)
  } else {
    return next()
  }
}
