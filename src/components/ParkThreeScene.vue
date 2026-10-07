<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { Aim, FullScreen, RefreshLeft, VideoPause, VideoPlay, ZoomIn, ZoomOut } from '@element-plus/icons-vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { createJiaxingPark } from '../three/createJiaxingPark'

const emit = defineEmits<{
  ready: []
}>()

const canvasHost = ref<HTMLDivElement | null>(null)
const webglAvailable = ref(true)
const autoRotating = ref(false)
const viewPreset = ref<'overview' | 'top' | 'custom'>('overview')
const zoomPercent = ref(100)

let scene: THREE.Scene | null = null
let camera: THREE.OrthographicCamera | null = null
let renderer: THREE.WebGLRenderer | null = null
let controls: OrbitControls | null = null
let resizeObserver: ResizeObserver | null = null
let motionPreference: MediaQueryList | null = null
let animationFrame = 0
let previousFrameTime = 0
let disposed = false
let modelBounds = new THREE.Box3()
let frameHeight = 245
const initialPosition = new THREE.Vector3(200, 185, 260)
const lookTarget = new THREE.Vector3(0, 0, 0)

function requestRender() {
  if (disposed || document.hidden || !renderer || animationFrame) return
  animationFrame = window.requestAnimationFrame(renderFrame)
}

function renderFrame(now: number) {
  animationFrame = 0
  if (disposed || document.hidden || !renderer || !scene || !camera || !controls) return
  const delta = previousFrameTime ? Math.min((now - previousFrameTime) / 1000, 0.05) : 1 / 60
  previousFrameTime = now
  const changed = controls.update(delta)
  renderer.render(scene, camera)
  zoomPercent.value = Math.round(camera.zoom * 100)
  // OrbitControls.update() returns false once damping has settled.
  if (controls.autoRotate || changed) requestRender()
  else previousFrameTime = 0
}

function stopRotation() {
  autoRotating.value = false
  if (controls) controls.autoRotate = false
}

function toggleRotation() {
  if (!controls) return
  autoRotating.value = !autoRotating.value
  controls.autoRotate = autoRotating.value
  if (autoRotating.value) viewPreset.value = 'custom'
  requestRender()
}

function handleInteractionStart() {
  stopRotation()
  viewPreset.value = 'custom'
  requestRender()
}

function updateFrustum() {
  if (!camera || !canvasHost.value) return
  const { clientWidth, clientHeight } = canvasHost.value
  if (!clientWidth || !clientHeight) return
  const halfHeight = frameHeight / 2
  const halfWidth = halfHeight * clientWidth / clientHeight
  camera.left = -halfWidth
  camera.right = halfWidth
  camera.top = halfHeight
  camera.bottom = -halfHeight
  camera.updateProjectionMatrix()
}

function fitModelToView() {
  if (!camera || !canvasHost.value || modelBounds.isEmpty()) return
  const aspect = canvasHost.value.clientWidth / Math.max(1, canvasHost.value.clientHeight)
  camera.updateMatrixWorld(true)
  let horizontalExtent = 0
  let verticalExtent = 0
  for (const x of [modelBounds.min.x, modelBounds.max.x]) {
    for (const y of [modelBounds.min.y, modelBounds.max.y]) {
      for (const z of [modelBounds.min.z, modelBounds.max.z]) {
        const point = new THREE.Vector3(x, y, z).applyMatrix4(camera.matrixWorldInverse)
        horizontalExtent = Math.max(horizontalExtent, Math.abs(point.x))
        verticalExtent = Math.max(verticalExtent, Math.abs(point.y))
      }
    }
  }
  // Leave breathing room around the model for the scene controls.
  frameHeight = Math.max(verticalExtent * 2 / 0.82, horizontalExtent * 2 / (aspect * 0.84), 120)
  updateFrustum()
}

function resizeRenderer() {
  if (!canvasHost.value || !renderer || !camera) return
  const { clientWidth, clientHeight } = canvasHost.value
  if (!clientWidth || !clientHeight) return
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75))
  renderer.setSize(clientWidth, clientHeight, false)
  if (viewPreset.value !== 'custom') fitModelToView()
  else updateFrustum()
  requestRender()
}

function setView(preset: 'overview' | 'top') {
  if (!camera || !controls) return
  stopRotation()
  // Flush any pending drag inertia before applying an exact preset.
  const damping = controls.enableDamping
  controls.enableDamping = false
  controls.update()
  controls.target.copy(lookTarget)
  camera.position.copy(preset === 'top' ? new THREE.Vector3(0, 360, 0.01) : initialPosition)
  camera.zoom = 1
  camera.lookAt(lookTarget)
  controls.update()
  controls.enableDamping = damping
  viewPreset.value = preset
  fitModelToView()
  requestRender()
}

function changeZoom(factor: number) {
  if (!camera || !controls) return
  camera.zoom = THREE.MathUtils.clamp(camera.zoom * factor, controls.minZoom, controls.maxZoom)
  camera.updateProjectionMatrix()
  requestRender()
}

function handleKeydown(event: KeyboardEvent) {
  if (!controls || event.altKey || event.ctrlKey || event.metaKey) return
  const angle = Math.PI / 18
  switch (event.key) {
    case 'ArrowLeft': handleInteractionStart(); controls.rotateLeft(angle); break
    case 'ArrowRight': handleInteractionStart(); controls.rotateLeft(-angle); break
    case 'ArrowUp': handleInteractionStart(); controls.rotateUp(angle); break
    case 'ArrowDown': handleInteractionStart(); controls.rotateUp(-angle); break
    case '+': case '=': changeZoom(1.15); break
    case '-': case '_': changeZoom(1 / 1.15); break
    case 'Home': setView('overview'); break
    case 't': case 'T': setView('top'); break
    case 'r': case 'R': toggleRotation(); break
    default: return
  }
  event.preventDefault()
  event.stopPropagation()
  requestRender()
}

function handlePointerDown() {
  renderer?.domElement.focus({ preventScroll: true })
}

function handleVisibilityChange() {
  previousFrameTime = 0
  if (document.hidden) {
    window.cancelAnimationFrame(animationFrame)
    animationFrame = 0
  } else requestRender()
}

function handleMotionPreference() {
  if (!controls) return
  controls.enableDamping = !motionPreference?.matches
  if (motionPreference?.matches) stopRotation()
  requestRender()
}

function handleContextLost(event: Event) {
  event.preventDefault()
  showFallback()
}

function disposeScene() {
  window.cancelAnimationFrame(animationFrame)
  animationFrame = 0
  resizeObserver?.disconnect()
  resizeObserver = null
  controls?.removeEventListener('change', requestRender)
  controls?.removeEventListener('start', handleInteractionStart)
  controls?.removeEventListener('end', requestRender)
  controls?.dispose()
  controls = null
  const canvas = renderer?.domElement
  if (canvas) {
    canvas.removeEventListener('keydown', handleKeydown)
    canvas.removeEventListener('pointerdown', handlePointerDown)
    canvas.removeEventListener('webglcontextlost', handleContextLost)
  }
  const geometries = new Set<THREE.BufferGeometry>()
  const materials = new Set<THREE.Material>()
  const textures = new Set<THREE.Texture>()
  scene?.traverse(object => {
    const renderable = object as THREE.Mesh
    if (renderable.geometry) geometries.add(renderable.geometry)
    const objectMaterials = Array.isArray(renderable.material) ? renderable.material : [renderable.material]
    objectMaterials.forEach(material => {
      if (!material) return
      materials.add(material)
      Object.values(material).forEach(value => {
        if (value instanceof THREE.Texture) textures.add(value)
      })
      if (material instanceof THREE.ShaderMaterial) {
        Object.values(material.uniforms).forEach(uniform => {
          if (uniform.value instanceof THREE.Texture) textures.add(uniform.value)
        })
      }
    })
    if (object instanceof THREE.Light && 'shadow' in object) {
      (object as THREE.DirectionalLight).shadow?.dispose()
    }
  })
  textures.forEach(texture => texture.dispose())
  materials.forEach(material => material.dispose())
  geometries.forEach(geometry => geometry.dispose())
  renderer?.dispose()
  renderer?.forceContextLoss()
  canvas?.remove()
  renderer = null
  scene = null
  camera = null
}

function showFallback() {
  webglAvailable.value = false
  stopRotation()
  disposeScene()
}

function initializeScene() {
  if (!canvasHost.value) return
  try {
    scene = new THREE.Scene()
    camera = new THREE.OrthographicCamera(-250, 250, 125, -125, 0.1, 1600)
    camera.position.copy(initialPosition)
    camera.lookAt(lookTarget)
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' })
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.12
    renderer.setClearColor(0x020d20, 0)
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFShadowMap
    // The model and lights are static; camera movement can reuse the shadow map.
    renderer.shadowMap.autoUpdate = false
    renderer.shadowMap.needsUpdate = true
    const canvas = renderer.domElement
    canvas.className = 'park-three__canvas'
    canvas.tabIndex = 0
    canvas.setAttribute('role', 'img')
    canvas.setAttribute('aria-label', '正泰嘉兴园区三维模型。拖动旋转，滚轮缩放；键盘方向键旋转，加减键缩放，Home 复位，T 俯视，R 切换自动旋转。')
    canvasHost.value.appendChild(canvas)

    scene.add(new THREE.HemisphereLight(0xbfe9ff, 0x092547, 1.6))
    const keyLight = new THREE.DirectionalLight(0xdaf0ff, 2.4)
    keyLight.position.set(-100, 230, 140)
    keyLight.castShadow = true
    keyLight.shadow.mapSize.set(2048, 2048)
    Object.assign(keyLight.shadow.camera, { left: -200, right: 200, top: 200, bottom: -200, near: 1, far: 600 })
    keyLight.shadow.bias = -0.0003
    keyLight.shadow.normalBias = 0.45
    keyLight.shadow.camera.updateProjectionMatrix()
    scene.add(keyLight)
    const fillLight = new THREE.DirectionalLight(0x348bff, 1.05)
    fillLight.position.set(160, 85, -140)
    scene.add(fillLight)
    const park = createJiaxingPark()
    scene.add(park)
    modelBounds = new THREE.Box3().setFromObject(park)

    controls = new OrbitControls(camera, canvas)
    controls.target.copy(lookTarget)
    controls.enableDamping = !motionPreference?.matches
    controls.dampingFactor = 0.09
    controls.enablePan = false
    controls.minZoom = 0.6
    controls.maxZoom = 2.8
    controls.minPolarAngle = 0.00001
    controls.maxPolarAngle = Math.PI * 0.44
    controls.rotateSpeed = 0.56
    controls.zoomSpeed = 0.85
    controls.autoRotateSpeed = 0.48
    controls.addEventListener('change', requestRender)
    controls.addEventListener('start', handleInteractionStart)
    controls.addEventListener('end', requestRender)
    canvas.addEventListener('keydown', handleKeydown)
    canvas.addEventListener('pointerdown', handlePointerDown)
    canvas.addEventListener('webglcontextlost', handleContextLost)
    resizeObserver = new ResizeObserver(resizeRenderer)
    resizeObserver.observe(canvasHost.value)
    resizeRenderer()
    controls.update()
    emit('ready')
  } catch (error) {
    console.warn('当前设备无法显示三维模型，已显示园区参考图。', error)
    showFallback()
  }
}

onMounted(() => {
  motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)')
  motionPreference.addEventListener('change', handleMotionPreference)
  document.addEventListener('visibilitychange', handleVisibilityChange)
  initializeScene()
})

onBeforeUnmount(() => {
  disposed = true
  document.removeEventListener('visibilitychange', handleVisibilityChange)
  motionPreference?.removeEventListener('change', handleMotionPreference)
  motionPreference = null
  disposeScene()
})
</script>

<template>
  <div class="park-three-scene">
    <div v-if="webglAvailable" ref="canvasHost" class="park-three__host" />
    <div v-else class="park-three__fallback">
      <img src="/assets/jiaxing-park-reference.png" alt="正泰嘉兴园区建模参考图" />
      <p role="status">当前设备无法显示三维模型，以下为参考图</p>
    </div>

    <div class="park-three__controls" role="group" aria-label="三维视角控制">
      <button type="button" :disabled="!webglAvailable" :class="{ active: autoRotating }"
        :aria-pressed="autoRotating" :aria-label="autoRotating ? '暂停自动旋转' : '开启自动旋转'"
        :title="autoRotating ? '暂停自动旋转 (R)' : '自动旋转 (R)'" @click.stop="toggleRotation">
        <component :is="autoRotating ? VideoPause : VideoPlay" /><span>{{ autoRotating ? '暂停' : '旋转' }}</span>
      </button>
      <button type="button" :disabled="!webglAvailable" :class="{ active: viewPreset === 'top' }"
        :aria-pressed="viewPreset === 'top'" aria-label="园区俯视图" title="俯视全园 (T)" @click.stop="setView('top')">
        <FullScreen /><span>俯视</span>
      </button>
      <button type="button" :disabled="!webglAvailable" aria-label="复位至初始视角" title="复位视角 (Home)" @click.stop="setView('overview')">
        <RefreshLeft /><span>复位</span>
      </button>
      <i class="park-three__separator" />
      <button type="button" class="park-three__zoom" :disabled="!webglAvailable || zoomPercent >= 280"
        aria-label="放大模型" title="放大 (+)" @click.stop="changeZoom(1.15)"><ZoomIn /></button>
      <output aria-label="缩放比例">{{ zoomPercent }}<small>%</small></output>
      <button type="button" class="park-three__zoom" :disabled="!webglAvailable || zoomPercent <= 60"
        aria-label="缩小模型" title="缩小 (-)" @click.stop="changeZoom(1 / 1.15)"><ZoomOut /></button>
    </div>

    <div v-if="webglAvailable" class="park-three__hint" aria-hidden="true">
      <Aim /><span>拖动旋转</span><i /><span>滚轮缩放</span><i /><span>双指缩放</span>
    </div>
  </div>
</template>

<style scoped>
.park-three-scene {
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse at 49% 46%, rgba(14, 53, 89, .8), rgba(3, 19, 39, .42) 58%, rgba(2, 13, 32, .6));
}
.park-three__host {
  position: absolute;
  inset: 0;
  z-index: 0;
}
.park-three__host :deep(canvas) {
  display: block;
  width: 100%;
  height: 100%;
  touch-action: none;
  cursor: grab;
}
.park-three__host :deep(canvas:active) { cursor: grabbing; }
.park-three__host :deep(canvas:focus-visible) {
  outline: 1px solid #51c5f7;
  outline-offset: -4px;
}
.park-three__controls {
  position: absolute;
  z-index: 8;
  right: 18px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 48px;
  padding: 5px 0;
  border: 1px solid rgba(44, 113, 162, .7);
  background: rgba(3, 21, 43, .89);
  box-shadow: 0 5px 22px rgba(0, 5, 14, .24), inset 0 0 16px rgba(18, 85, 138, .12);
}
.park-three__controls button {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 3px;
  width: 46px;
  height: 46px;
  padding: 4px 0;
  border: 0;
  background: transparent;
  color: #83acc9;
  font: inherit;
  font-size: 10px;
  cursor: pointer;
}
.park-three__controls button svg { width: 18px; height: 18px; }
.park-three__controls button:hover,
.park-three__controls button.active { background: rgba(21, 107, 168, .25); color: #72dcff; }
.park-three__controls button:focus-visible { outline: 1px solid #71d6ff; outline-offset: -3px; }
.park-three__controls button:disabled { color: #496179; cursor: default; background: transparent; }
.park-three__controls .park-three__zoom { height: 29px; }
.park-three__separator { width: 27px; margin: 4px 0; border-top: 1px solid rgba(46, 108, 151, .5); }
.park-three__controls output { color: #94bdd8; font: 10px ui-monospace, monospace; line-height: 16px; }
.park-three__controls output small { font-size: 8px; }
.park-three__hint {
  position: absolute;
  z-index: 2;
  bottom: 19px;
  left: 20px;
  display: flex;
  align-items: center;
  gap: 8px;
  pointer-events: none;
  color: #6d96b4;
  font-size: 10px;
  letter-spacing: .5px;
}
.park-three__hint svg { width: 13px; height: 13px; color: #42b9e9; }
.park-three__hint i { width: 2px; height: 2px; border-radius: 50%; background: #3f7294; }
.park-three__fallback { position: absolute; inset: 0; }
.park-three__fallback img { width: 100%; height: 100%; padding-top: 54px; box-sizing: border-box; object-fit: contain; }
.park-three__fallback p {
  position: absolute;
  left: 18px;
  top: 14px;
  margin: 0;
  padding: 8px 12px;
  border: 1px solid #265475;
  background: rgba(3, 21, 43, .9);
  color: #a5c3d9;
  font-size: 11px;
}
@media (max-width: 700px) {
  .park-three__controls { right: 10px; }
  .park-three__hint { left: 12px; gap: 6px; font-size: 9px; }
}
@media (max-height: 560px) {
  .park-three__controls {
    top: auto;
    bottom: 10px;
    left: 50%;
    right: auto;
    transform: translateX(-50%);
    flex-direction: row;
    width: max-content;
    padding: 2px 5px;
  }
  .park-three__controls button { width: 39px; height: 35px; gap: 1px; font-size: 9px; }
  .park-three__controls button svg { width: 15px; height: 15px; }
  .park-three__controls .park-three__zoom { width: 31px; height: 35px; }
  .park-three__separator { width: 0; height: 20px; margin: 0 4px; border-top: 0; border-left: 1px solid #285572; }
  .park-three__controls output { width: 36px; text-align: center; }
  .park-three__hint { display: none; }
}
</style>
