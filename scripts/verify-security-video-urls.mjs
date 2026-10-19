import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import ts from 'typescript'
import { computed } from 'vue'
const source = await readFile(new URL('../src/services/securityVideoUrls.ts', import.meta.url), 'utf8')
const cameras = ['cam-e01', 'cam-e02'].map(id => ({ id, videoUrl: `/assets/videos/${id}.mp4` }))
const registryUrl = `data:text/javascript;base64,${Buffer.from(`export const securityCameras = ${JSON.stringify(cameras)}`).toString('base64')}`
let sequence = 0
async function load(env = {}) {
  const code = ts.transpileModule(source.replaceAll('import.meta.env', JSON.stringify(env)), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText
    .replaceAll("'vue'", `'${import.meta.resolve('vue')}'`).replaceAll("'../data/mock'", `'${registryUrl}'`)
  return import(`data:text/javascript;base64,${Buffer.from(code + `\n//case ${sequence++}`).toString('base64')}`)
}
const originalFetch = globalThis.fetch, originalNow = Date.now
const urls = Object.fromEntries(cameras.map(c => [c.id, `https://video.example.test/${c.id}.mp4?v=1`]))
const success = () => new Response(JSON.stringify({ urls, expiresIn: 120 }), { headers: { 'content-type': 'application/json' } })
try {
  const prod = await load({ PROD: true, VITE_USE_OSS_SIGNED_VIDEOS: 'false' })
  assert.equal(prod.usesSignedSecurityVideos, true, 'production must not request missing local media')
  const local = await load({ PROD: false, VITE_USE_OSS_SIGNED_VIDEOS: 'false' })
  assert.equal(local.usesSignedSecurityVideos, false)
  assert.equal(local.getSecurityVideoUrl('cam-e01'), cameras[0].videoUrl)
  const service = await load()
  assert.equal(service.usesSignedSecurityVideos, true)
  const selectedUrl = computed(() => service.getSecurityVideoUrl('cam-e01'))
  assert.equal(selectedUrl.value, '')
  let requests = 0, now = 1000000
  Date.now = () => now
  globalThis.fetch = async () => { requests++; return requests === 1 ? new Response('', { status: 503 }) : success() }
  assert.equal(await service.configureSecurityVideoUrls(), false)
  assert.equal(service.securityVideoStatus.value, 'error')
  const first = service.configureSecurityVideoUrls(), second = service.configureSecurityVideoUrls()
  assert.equal(first, second, 'concurrent requests share one fetch')
  assert.equal(await first, true, 'failed request must be retryable')
  assert.equal(selectedUrl.value, urls['cam-e01'], 'late URLs must update active player reactively')
  assert.equal(await service.configureSecurityVideoUrls(), true)
  assert.equal(requests, 2, 'unexpired URLs should be cached')
  now += 61000
  assert.equal(await service.configureSecurityVideoUrls(), true)
  assert.equal(requests, 3, 'URLs refresh before signature expiration')
  await service.configureSecurityVideoUrls({ force: true })
  assert.equal(requests, 4)
  const missingRoute = await load()
  globalThis.fetch = async () => new Response('<html>SPA fallback</html>', { headers: { 'content-type': 'text/html' } })
  assert.equal(await missingRoute.configureSecurityVideoUrls(), false)
  assert.match(missingRoute.securityVideoError.value, /接口/)
  globalThis.fetch = async () => new Response(JSON.stringify({ urls: { 'cam-e01': urls['cam-e01'] } }), { headers: { 'content-type': 'application/json' } })
  assert.equal(await missingRoute.configureSecurityVideoUrls(), false, 'incomplete mappings must fail clearly')
  globalThis.fetch = async () => success()
  assert.equal(await missingRoute.configureSecurityVideoUrls(), true)
  console.log('PASS: production source, local opt-in, reactive URLs, concurrent requests, failure retry, expiry refresh, forced renewal, missing API and incomplete mappings.')
} finally { globalThis.fetch = originalFetch; Date.now = originalNow }
