import handleVideoUrls from '../../netlify/functions/video-urls.mjs'

export default function onRequest() {
  return handleVideoUrls()
}
