import handleVideoUrls from '../../netlify/functions/video-urls.mjs'

export default async function onRequest({ request }) {
  const response = await handleVideoUrls()
  const headers = new Headers(response.headers)
  headers.append('Vary', 'Origin')
  if (request.headers.get('Origin') === 'http://139.159.210.165') {
    headers.set('Access-Control-Allow-Origin', 'http://139.159.210.165')
  }
  return new Response(response.body, {
    status: response.status,
    headers,
  })
}
