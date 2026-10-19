import { shallowRef, ref } from 'vue'
import { securityCameras } from '../data/mock'

interface SignedVideoUrlResponse { urls?: Record<string, string>; expiresIn?: number }
export const securityVideoStatus = ref<'idle' | 'loading' | 'ready' | 'error'>('idle')
export const securityVideoError = ref('')
const signedVideoUrls = shallowRef<Record<string, string>>({})
let configurePromise: Promise<boolean> | undefined
let refreshAt = 0

// Only local development may opt in to local files; production always uses the video service.
export const usesSignedSecurityVideos = import.meta.env.PROD || import.meta.env.VITE_USE_OSS_SIGNED_VIDEOS !== 'false'
export function getSecurityVideoUrl(cameraId: string): string {
  return usesSignedSecurityVideos ? signedVideoUrls.value[cameraId] ?? '' : securityCameras.find(camera => camera.id === cameraId)?.videoUrl ?? ''
}

export function configureSecurityVideoUrls(options: { force?: boolean } = {}): Promise<boolean> {
  if (!usesSignedSecurityVideos) return Promise.resolve(true)
  if (configurePromise) return configurePromise
  if (!options.force && Date.now() < refreshAt) return Promise.resolve(true)
  securityVideoStatus.value = 'loading'
  securityVideoError.value = ''
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 12000)
  configurePromise = (async () => {
    try {
      const response = await fetch('/api/video-urls', { headers: { Accept: 'application/json' }, cache: 'no-store', signal: controller.signal })
      if (!response.ok) throw new Error(`视频地址服务暂不可用（${response.status}）`)
      if (!response.headers.get('content-type')?.includes('application/json')) throw new Error('视频地址接口未正确配置')
      const payload = await response.json() as SignedVideoUrlResponse
      const urls: Record<string, string> = {}
      for (const camera of securityCameras) {
        const url = payload.urls?.[camera.id]
        if (typeof url === 'string' && url.startsWith('https://')) urls[camera.id] = url
      }
      if (Object.keys(urls).length !== securityCameras.length) throw new Error('视频地址不完整，请重试')
      signedVideoUrls.value = urls
      const expiresIn = Number.isFinite(payload.expiresIn) && Number(payload.expiresIn) > 0 ? Number(payload.expiresIn) : 300
      refreshAt = Date.now() + Math.max(1, expiresIn - Math.min(60, expiresIn / 2)) * 1000
      securityVideoStatus.value = 'ready'
      return true
    } catch (error) {
      refreshAt = 0
      securityVideoStatus.value = 'error'
      securityVideoError.value = error instanceof Error && error.name !== 'AbortError' ? error.message : '视频地址请求超时，请重试'
      return false
    } finally {
      clearTimeout(timeout)
      configurePromise = undefined
    }
  })()
  return configurePromise
}
