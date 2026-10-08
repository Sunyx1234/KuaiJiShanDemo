<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { SSAOPass } from 'three/addons/postprocessing/SSAOPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'

const props = defineProps<{ compact?: boolean }>()
const emit = defineEmits<{ ready: []; 'view-change': [] }>()

const assetRoot = '/assets/models/'
const modelUrl = `${assetRoot}huijishan-campus-v8.glb`
const lightingUrl = `${assetRoot}huijishan-lighting-v8.json`
type Fixture = { position: [number, number, number]; color: [number, number, number]; power: number; kind: string }
const host = ref<HTMLDivElement | null>(null)
const loading = ref(true)
const error = ref('')
const progress = ref(0)
const autoRotate = ref(false)

let renderer: THREE.WebGLRenderer | null = null
let composer: EffectComposer | null = null
let scene: THREE.Scene | null = null
let camera: THREE.PerspectiveCamera | null = null
let controls: OrbitControls | null = null
let model: THREE.Group | null = null
let sunlight: THREE.DirectionalLight | null = null
let fixtures: Fixture[] = []
let localLights: THREE.PointLight[] = []
let groundLights: THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial> | null = null
let environmentMap: THREE.Texture | null = null
let environmentGenerator: THREE.PMREMGenerator | null = null
let resizeObserver: ResizeObserver | null = null
let frame = 0
let disposed = false
let homePosition = new THREE.Vector3()
let homeTarget = new THREE.Vector3()
let modelBounds = new THREE.Box3()
let lastProjectionEmit = 0
let viewInteracted = false

function render(now: number) {
  frame = 0
  if (disposed || document.hidden || !renderer || !composer || !scene || !camera || !controls) return
  controls.update()
  updateLocalLights()
  composer.render()
  if (now - lastProjectionEmit > 32) {
    lastProjectionEmit = now
    emit('view-change')
  }
  if (controls.autoRotate) requestRender()
}

function createGroundLights(data: Fixture[]) {
  if (!scene) return
  const positions: number[] = []
  const uvs: number[] = []
  for (const fixture of data) {
    const width = fixture.kind === 'street' ? 22 : 11
    const depth = fixture.kind === 'street' ? 16 : 9
    const x = fixture.position[0]
    const z = -fixture.position[1]
    const corners = [
      [x - width / 2, .27, z - depth / 2],
      [x + width / 2, .27, z - depth / 2],
      [x + width / 2, .27, z + depth / 2],
      [x - width / 2, .27, z + depth / 2],
    ]
    for (const index of [0, 2, 1, 0, 3, 2]) {
      positions.push(...corners[index])
      uvs.push(...[[0, 0], [1, 0], [1, 1], [0, 1]][index])
    }
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    uniforms: { color: { value: new THREE.Color(1, .39, .075) }, strength: { value: .4 } },
    vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'varying vec2 vUv; uniform vec3 color; uniform float strength; void main() { float d = length((vUv - .5) * 2.0); float a = pow(max(0.0, 1.0 - d), 2.4) * strength; gl_FragColor = vec4(color, a); }',
  })
  groundLights = new THREE.Mesh(geometry, material)
  groundLights.renderOrder = 1
  groundLights.frustumCulled = false
  scene.add(groundLights)
}

function updateLocalLights() {
  if (!camera || !controls || !fixtures.length) return
  const distant = camera.position.distanceTo(controls.target) > 260
  const selected = distant
    ? fixtures.filter((_, index) => index % 7 === 0).slice(0, localLights.length)
    : [...fixtures].sort((a, b) => {
        const aPoint = new THREE.Vector3(a.position[0], a.position[2], -a.position[1])
        const bPoint = new THREE.Vector3(b.position[0], b.position[2], -b.position[1])
        return aPoint.distanceToSquared(controls!.target) - bPoint.distanceToSquared(controls!.target)
      }).slice(0, localLights.length)
  localLights.forEach((light, index) => {
    const fixture = selected[index]
    if (!fixture) { light.intensity = 0; return }
    light.position.set(fixture.position[0], fixture.position[2], -fixture.position[1])
    light.color.setRGB(...fixture.color)
    light.intensity = fixture.power / (4 * Math.PI)
  })
}

function requestRender() {
  if (!frame && !disposed && !document.hidden) frame = requestAnimationFrame(render)
}

function resize() {
  if (!host.value || !camera || !renderer) return
  const width = host.value.clientWidth
  const height = host.value.clientHeight
  if (!width || !height) return
  camera.aspect = width / height
  camera.updateProjectionMatrix()
  renderer.setSize(width, height, false)
  composer?.setSize(width, height)
  if (model && !viewInteracted) frameModel(model)
  requestRender()
}

function frameModel(object: THREE.Object3D) {
  if (!camera || !controls || !host.value) return
  const bounds = new THREE.Box3()
  const fitPoints: THREE.Vector3[] = []
  object.traverse(child => {
    if (!(child instanceof THREE.Mesh)) return
    if (!/^(02|03|04|05|06|10|11|12) /.test(child.name)) return
    const positions = child.geometry.getAttribute('position')
    const step = Math.max(1, Math.floor(positions.count / 500))
    for (let index = 0; index < positions.count; index += step) {
      const point = new THREE.Vector3().fromBufferAttribute(positions, index).applyMatrix4(child.matrixWorld)
      fitPoints.push(point)
      bounds.expandByPoint(point)
    }
  })
  if (bounds.isEmpty()) bounds.setFromObject(object)
  modelBounds = bounds
  const size = bounds.getSize(new THREE.Vector3())
  const center = bounds.getCenter(new THREE.Vector3())
  camera.aspect = host.value.clientWidth / Math.max(1, host.value.clientHeight)
  camera.updateProjectionMatrix()
  const direction = new THREE.Vector3(1.25, 1.12, 1.35).normalize()
  if (!fitPoints.length) fitPoints.push(bounds.min.clone(), bounds.max.clone())
  const horizontalLimit = props.compact ? .9 : .88
  const verticalLimit = props.compact ? .8 : .82
  let distance = Math.max(size.x, size.z)
  for (let iteration = 0; iteration < 6; iteration++) {
    camera.position.copy(center).addScaledVector(direction, distance)
    camera.lookAt(center)
    camera.updateMatrixWorld()
    let horizontalExtent = 0
    let verticalExtent = 0
    for (const point of fitPoints) {
      const projected = point.clone().project(camera)
      horizontalExtent = Math.max(horizontalExtent, Math.abs(projected.x))
      verticalExtent = Math.max(verticalExtent, Math.abs(projected.y))
    }
    const correction = Math.max(horizontalExtent / horizontalLimit, verticalExtent / verticalLimit)
    if (Math.abs(correction - 1) < .01) break
    distance *= correction
  }
  // Sparse outer geometry needs less screen space than the occupied campus footprint.
  distance *= props.compact ? .66 : .86
  homeTarget = center
  homePosition = center.clone().addScaledVector(direction, distance)
  camera.near = Math.max(.01, distance / 1000)
  camera.far = distance * 10
  camera.updateProjectionMatrix()
  controls.target.copy(homeTarget)
  camera.position.copy(homePosition)
  controls.minDistance = Math.max(5, distance * .12)
  controls.maxDistance = distance * 4
  if (sunlight) {
    const span = Math.max(size.x, size.z)
    sunlight.position.copy(center).add(new THREE.Vector3(-span * .4, span * .5, span * .42))
    sunlight.target.position.copy(center)
    sunlight.target.updateMatrixWorld()
    const half = span * .75
    Object.assign(sunlight.shadow.camera, { left: -half, right: half, top: half, bottom: -half, near: 1, far: span * 2 })
    sunlight.shadow.camera.updateProjectionMatrix()
    if (renderer) renderer.shadowMap.needsUpdate = true
  }
  controls.update()
  requestRender()
}

function projectPoint(x: number, y: number) {
  if (!camera || modelBounds.isEmpty()) return null
  const size = modelBounds.getSize(new THREE.Vector3())
  const center = modelBounds.getCenter(new THREE.Vector3())
  const point = new THREE.Vector3(
    center.x + (x - 50) / 50 * size.x * .68,
    modelBounds.min.y + 10,
    center.z + (y - 50) / 50 * size.z * .68,
  ).project(camera)
  return { x: (point.x + 1) * 50, y: (1 - point.y) * 50 }
}

defineExpose({ projectPoint })

function resetView() {
  if (!camera || !controls) return
  viewInteracted = false
  camera.position.copy(homePosition)
  controls.target.copy(homeTarget)
  controls.update()
  requestRender()
}

function toggleRotation() {
  if (!controls) return
  autoRotate.value = !autoRotate.value
  controls.autoRotate = autoRotate.value
  requestRender()
}

function zoom(factor: number) {
  if (!camera || !controls) return
  viewInteracted = true
  const offset = camera.position.clone().sub(controls.target).multiplyScalar(factor)
  const distance = THREE.MathUtils.clamp(offset.length(), controls.minDistance, controls.maxDistance)
  camera.position.copy(controls.target).add(offset.setLength(distance))
  controls.update()
  requestRender()
}

function onVisibilityChange() {
  if (document.hidden) {
    cancelAnimationFrame(frame)
    frame = 0
  } else requestRender()
}

function makeEdgeFade(size = 128, feather = .075) {
  const pixels = new Uint8Array(size * size * 4)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const edge = Math.min(x, y, size - 1 - x, size - 1 - y) / (size - 1)
      const t = THREE.MathUtils.clamp(edge / feather, 0, 1)
      const opacity = Math.round((t * t * (3 - 2 * t)) * 255)
      const index = (y * size + x) * 4
      pixels[index] = pixels[index + 1] = pixels[index + 2] = opacity
      pixels[index + 3] = 255
    }
  }
  const texture = new THREE.DataTexture(pixels, size, size, THREE.RGBAFormat)
  texture.magFilter = THREE.LinearFilter
  texture.minFilter = THREE.LinearFilter
  texture.needsUpdate = true
  return texture
}

function fadePlateEdges(mesh: THREE.Mesh, material: THREE.MeshStandardMaterial, feather: number) {
  const geometry = mesh.geometry
  const position = geometry.getAttribute('position')
  const bounds = new THREE.Box3().setFromObject(mesh)
  const size = bounds.getSize(new THREE.Vector3())
  const uv = new Float32Array(position.count * 2)
  const point = new THREE.Vector3()
  for (let index = 0; index < position.count; index++) {
    point.fromBufferAttribute(position, index).applyMatrix4(mesh.matrixWorld)
    uv[index * 2] = (point.x - bounds.min.x) / Math.max(1, size.x)
    uv[index * 2 + 1] = (point.z - bounds.min.z) / Math.max(1, size.z)
  }
  geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2))
  material.alphaMap = makeEdgeFade(128, feather)
  material.transparent = true
  material.depthWrite = false
  material.needsUpdate = true
}

function finishMaterials(object: THREE.Group) {
  const colors: Record<string, string> = {
    浅灰场地: '#173447',
    灰模白墙: '#a8bdc5',
    灰模深屋顶: '#5a7080',
    蓝色彩钢: '#39758c',
    框架深灰: '#2d4a58',
    金属设施: '#7b929c',
    光伏边框: '#78939d',
    江南灰瓦: '#5a6f78',
    道路深灰: '#354a56',
    道路标线: '#8299a5',
    水道示意: '#256575',
    农田示意: '#647b68',
    草坪: '#507660',
    绿化示意: '#416b5b',
    树冠00: '#4c745c',
    树冠01: '#668168',
    树冠02: '#71886b',
    树冠03: '#52796b',
    树冠04: '#7e8a69',
  }
  object.updateMatrixWorld(true)
  object.traverse(child => {
    if (!(child instanceof THREE.Mesh)) return
    const materials = Array.isArray(child.material) ? child.material : [child.material]
    for (const material of materials) {
      if (!(material instanceof THREE.MeshStandardMaterial)) continue
      const name = material.name
      if (colors[name]) material.color.set(colors[name])
      if (name === '浅灰场地') {
        Object.assign(material, { roughness: 1, metalness: 0, envMapIntensity: 0 })
        fadePlateEdges(child, material, .075)
      } else if (name === '农田示意') {
        Object.assign(material, { roughness: 1, metalness: 0 })
        fadePlateEdges(child, material, .12)
      } else if (/光伏/.test(name)) Object.assign(material, { roughness: .38, metalness: .32, envMapIntensity: .58 })
      else if (/金属|边框|车身/.test(name)) Object.assign(material, { roughness: .49, metalness: .32, envMapIntensity: .4 })
      else if (/水道/.test(name)) Object.assign(material, { roughness: .36, metalness: .08, envMapIntensity: .45 })
      else if (/白墙|彩钢/.test(name)) Object.assign(material, { roughness: .86, metalness: .03 })
      else Object.assign(material, { roughness: .88, metalness: .03 })
    }
    const region = child.name.split('｜')[0]
    child.castShadow = !/^00 |^01 |^07 |^13 /.test(region)
    child.receiveShadow = !/^07 |^13 /.test(region)
  })
}

function dispose() {
  disposed = true
  cancelAnimationFrame(frame)
  resizeObserver?.disconnect()
  controls?.dispose()
  model?.traverse(object => {
    const mesh = object as THREE.Mesh
    mesh.geometry?.dispose()
    if (mesh.material) {
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
      for (const material of materials) {
        Object.values(material).forEach(value => {
          if (value instanceof THREE.Texture) value.dispose()
        })
        material.dispose()
      }
    }
  })
  environmentMap?.dispose()
  environmentGenerator?.dispose()
  sunlight?.shadow.dispose()
  groundLights?.removeFromParent()
  groundLights?.geometry.dispose()
  groundLights?.material.dispose()
  groundLights = null
  localLights.forEach(light => light.removeFromParent())
  localLights = []
  composer?.dispose()
  renderer?.dispose()
  renderer?.domElement.remove()
}

onMounted(() => {
  if (!host.value) return
  try {
    scene = new THREE.Scene()
    scene.background = null
    camera = new THREE.PerspectiveCamera(42, 1, .1, 2000)
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5))
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.AgXToneMapping
    renderer.toneMappingExposure = 1
    renderer.setClearColor(0x07182b, 0)
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFShadowMap
    renderer.shadowMap.autoUpdate = false
    host.value.appendChild(renderer.domElement)
    environmentGenerator = new THREE.PMREMGenerator(renderer)
    const room = new RoomEnvironment()
    environmentMap = environmentGenerator.fromScene(room).texture
    room.dispose()
    scene.environment = environmentMap
    scene.environmentIntensity = .075
    scene.add(new THREE.HemisphereLight(0x668fcb, 0x131b2e, .2))
    sunlight = new THREE.DirectionalLight(0x81acff, .72)
    sunlight.position.set(-90, 95, 105)
    sunlight.castShadow = true
    sunlight.shadow.mapSize.set(2048, 2048)
    sunlight.shadow.bias = -0.00015
    sunlight.shadow.normalBias = .025
    scene.add(sunlight)
    const fill = new THREE.DirectionalLight(0x5479af, .12)
    fill.position.set(90, 55, -85)
    scene.add(fill)
    composer = new EffectComposer(renderer)
    composer.addPass(new RenderPass(scene, camera))
    const contactShadows = new SSAOPass(scene, camera, 1, 1, 8)
    contactShadows.kernelRadius = 1.3
    contactShadows.minDistance = .002
    contactShadows.maxDistance = .045
    composer.addPass(contactShadows)
    composer.addPass(new UnrealBloomPass(new THREE.Vector2(1, 1), .17, .12, 1.5))
    composer.addPass(new OutputPass())
    localLights = Array.from({ length: 12 }, () => {
      const light = new THREE.PointLight(0xffc080, 0, 32, 2)
      scene!.add(light)
      return light
    })
    fetch(lightingUrl)
      .then(response => {
        if (!response.ok) throw new Error(`灯光配置返回 ${response.status}`)
        return response.json() as Promise<{ fixtures: Fixture[] }>
      })
      .then(data => { if (!disposed) { fixtures = data.fixtures; createGroundLights(fixtures); requestRender() } })
      .catch(error => console.error('园区夜景灯光加载失败', error))
    controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = false
    controls.enablePan = true
    controls.maxPolarAngle = Math.PI * .49
    controls.autoRotateSpeed = .6
    controls.addEventListener('start', () => { viewInteracted = true })
    controls.addEventListener('change', requestRender)
    resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(host.value)
    resize()

    new GLTFLoader().load(modelUrl, gltf => {
        if (disposed || !scene) return
        model = gltf.scene
        finishMaterials(model)
        scene.add(model)
        frameModel(model)
        loading.value = false
        emit('ready')
      }, event => {
        if (event.total) progress.value = Math.round(event.loaded / event.total * 100)
      }, () => {
        loading.value = false
        error.value = '园区模型加载失败，请检查 GLB 文件。'
      })
  } catch {
    loading.value = false
    error.value = '当前设备无法创建 WebGL 场景。'
  }
  document.addEventListener('visibilitychange', onVisibilityChange)
})

onBeforeUnmount(() => {
  document.removeEventListener('visibilitychange', onVisibilityChange)
  dispose()
})
</script>

<template>
  <main class="obj-preview" :class="{ compact }">
    <header v-if="!compact" class="obj-preview__header">
      <div><small>HUIJISHAN · MODEL V8</small><h1>会稽山园区 <span>/</span> 完整园区模型</h1></div>
      <a href="/#/">返回大屏</a>
    </header>
    <section class="obj-preview__stage">
      <div ref="host" class="obj-preview__canvas" aria-label="会稽山园区 v8 三维模型，可拖动旋转、滚轮缩放" />
      <div v-if="loading" class="obj-preview__message" role="status">正在加载园区模型{{ progress ? ` · ${progress}%` : '…' }}</div>
      <div v-if="error" class="obj-preview__message" role="alert">{{ error }}</div>
      <div class="obj-preview__controls">
        <button type="button" :disabled="loading || !!error" :aria-label="autoRotate ? '暂停旋转' : '自动旋转'" :title="autoRotate ? '暂停旋转' : '自动旋转'" @click="toggleRotation">{{ compact ? (autoRotate ? 'Ⅱ' : '↻') : (autoRotate ? '暂停旋转' : '自动旋转') }}</button>
        <button type="button" :disabled="loading || !!error" aria-label="复位视角" title="复位视角" @click="resetView">{{ compact ? '↶' : '复位视角' }}</button>
        <button type="button" :disabled="loading || !!error" aria-label="放大模型" title="放大模型" @click="zoom(.8)">{{ compact ? '+' : '放大 +' }}</button>
        <button type="button" :disabled="loading || !!error" aria-label="缩小模型" title="缩小模型" @click="zoom(1.25)">{{ compact ? '−' : '缩小 −' }}</button>
      </div>
      <p class="obj-preview__hint">拖动旋转 · 滚轮缩放 · 右键平移</p>
    </section>
  </main>
</template>

<style scoped>
.obj-preview{height:100dvh;display:flex;flex-direction:column;padding:0 24px 24px;background:#020b1b;color:#d5ebff}
.obj-preview__header{height:88px;flex:none;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #245477}
.obj-preview__header small{font:10px Arial,sans-serif;letter-spacing:3px;color:#62b8df}
.obj-preview__header h1{margin:7px 0 0;font-size:23px;font-weight:500;letter-spacing:2px}
.obj-preview__header h1 span{color:#4888ac;padding:0 8px}
.obj-preview__header a{color:#9cd8f5;text-decoration:none;border:1px solid #2a6384;padding:9px 15px;font-size:12px}
.obj-preview__header a:hover{background:#153c58}
.obj-preview__stage{position:relative;flex:1;min-height:0;margin-top:18px;border:1px solid #204d71;overflow:hidden;background:radial-gradient(ellipse at 42% 32%,#193b52 0,#0d263c 48%,#06182d 82%,#031020 100%)}
.obj-preview__stage::before{content:'';position:absolute;inset:0;pointer-events:none;background:radial-gradient(ellipse 46% 28% at 50% 68%,rgba(40,153,180,.15),transparent 80%)}
.obj-preview__canvas{position:absolute;inset:0}
.obj-preview__canvas :deep(canvas){display:block;width:100%;height:100%;touch-action:none;cursor:grab}
.obj-preview__canvas :deep(canvas:active){cursor:grabbing}
.obj-preview__message{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);padding:16px 22px;background:#082640e8;border:1px solid #3b91ba;font-size:14px}
.obj-preview__controls{position:absolute;right:18px;top:18px;display:flex;gap:8px}
.obj-preview__controls button{border:1px solid #39779b;background:#092b47d9;padding:8px 12px;cursor:pointer;font-size:12px}
.obj-preview__controls button:hover:not(:disabled){background:#185277}
.obj-preview__controls button:disabled{opacity:.45;cursor:default}
.obj-preview__hint{position:absolute;left:18px;bottom:12px;font-size:11px;color:#91b9d0;pointer-events:none}
.obj-preview.compact{position:absolute;inset:0;height:100%;padding:0;background:transparent}
.obj-preview.compact .obj-preview__stage{margin:0;border:0}
.obj-preview.compact .obj-preview__controls{left:14px;right:auto;top:auto;bottom:14px;z-index:2;gap:0;padding:2px;border:1px solid rgba(108,150,164,.34);background:rgba(7,25,35,.66);backdrop-filter:blur(8px);opacity:.72;transition:opacity .2s}
.obj-preview.compact .obj-preview__controls:hover,.obj-preview.compact .obj-preview__controls:focus-within{opacity:1}
.obj-preview.compact .obj-preview__controls button{width:32px;height:30px;padding:0;border:0;border-right:1px solid rgba(108,150,164,.22);background:transparent;color:#c9d9d8;font-size:18px;line-height:1}
.obj-preview.compact .obj-preview__controls button:last-child{border-right:0}
.obj-preview.compact .obj-preview__hint{display:none}
@media(max-width:700px){.obj-preview{padding:0 10px 10px}.obj-preview__header{height:72px}.obj-preview__header h1{font-size:15px;letter-spacing:0}.obj-preview__header small{font-size:8px;letter-spacing:1px}.obj-preview__header a{font-size:10px;padding:6px}.obj-preview__stage{margin-top:10px}.obj-preview__controls{left:10px;right:10px;top:10px;gap:4px}.obj-preview__controls button{flex:1;padding:7px 3px;font-size:10px}}
</style>
