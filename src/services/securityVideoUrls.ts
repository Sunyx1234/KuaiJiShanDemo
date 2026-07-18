import { securityCameras } from '../data/mock'

interface SignedVideoUrlResponse {
  urls?: Record<string, string>
}

let configurePromise: Promise<void> | undefined

export function configureSecurityVideoUrls(): Promise<void> {
  if (import.meta.env.VITE_USE_OSS_SIGNED_VIDEOS !== 'true') {
    return Promise.resolve()
  }

  if (configurePromise) {
    return configurePromise
  }

  configurePromise = fetch('/.netlify/functions/video-urls', {
    headers: { Accept: 'application/json' },
  })
    .then(async (response) => {
      if (!response.ok) {
        throw new Error(`视频签名服务返回 ${response.status}`)
      }

      const payload = await response.json() as SignedVideoUrlResponse
      if (!payload.urls) {
        throw new Error('视频签名服务未返回地址')
      }

      for (const camera of securityCameras) {
        const signedUrl = payload.urls[camera.id]
        if (typeof signedUrl === 'string' && signedUrl.startsWith('https://')) {
          camera.videoUrl = signedUrl
        }
      }
    })
    .catch((error: unknown) => {
      console.error('OSS 视频地址加载失败，将保留本地演示地址。', error)
    })

  return configurePromise
}
