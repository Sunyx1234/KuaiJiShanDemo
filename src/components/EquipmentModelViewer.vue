<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch, nextTick } from 'vue'
import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import { steamerDevices, bottlingDevices } from '../data/processEquipment'
import { equipmentModelCatalog } from '../data/processRegions'
import { createCampusGridGround } from '../three/createCampusGridGround'
const props = defineProps<{ deviceCode: string; assetUrl?: string; modelName?: string; showProcessMetrics?: boolean; selectedDeviceId?: string; focusRequest?: number }>()
const emit = defineEmits<{ ready: []; error: []; 'select-device': [id: string] }>()
const entry = computed(() => equipmentModelCatalog[props.deviceCode])
const url = computed(() => props.assetUrl ?? entry.value?.assetUrl)
const host = ref<HTMLDivElement | null>(null)
const state = ref('')
// Local presentation snapshot; replace with the device acquisition API when available.
const selectedInstanceId = ref(props.selectedDeviceId ?? '')
const isBottling = computed(() => props.deviceCode === 'LINE-BOTTLING-001' || props.deviceCode === 'GZ-01')
// Bottling equipment cards are available from both process and maintenance views.
const metricsEnabled = computed(() => isBottling.value || props.showProcessMetrics)
const bottlingDevice = computed(() => bottlingDevices.find(device => device.id === selectedInstanceId.value) ?? bottlingDevices[0]!)
const cardDevice = computed(() => isBottling.value ? bottlingDevice.value : activeDevice.value)
const activeDevice = computed(() => steamerDevices.find(device => device.id === selectedInstanceId.value) ?? steamerDevices[0]!)
const processMetrics = computed(() => isBottling.value ? bottlingDevice.value.metrics.map(metric => ({ ...metric, value: '—', position: 0, bandStart: 0, bandWidth: 0 })) : [
  { id: 'temperature', label: '蒸煮温度', value: activeDevice.value.temperature, unit: '°C', target: '目标 98.0 °C', range: '蒸饭箱体', position: 52.5, bandStart: 25, bandWidth: 50 },
  { id: 'pressure', label: '蒸汽压力', value: activeDevice.value.pressure, unit: 'MPa', target: '供汽压力', range: '参考 0.10–0.25 MPa', position: (Number(activeDevice.value.pressure) - .08) / .2 * 100, bandStart: 10, bandWidth: 75 },
  { id: 'duration', label: '蒸煮时间', value: activeDevice.value.duration, unit: 'min', target: '物料停留时间', range: '按当前设备工况', position: 60, bandStart: 50, bandWidth: 25 },
])
const deviceLabels = ref<{ id: string; x: number; y: number }[]>([])
let deviceInstances: { id: string; root: THREE.Object3D; center: THREE.Vector3; size: THREE.Vector3 }[] = []
let focusLoadedDevice = (_id: string) => {}
let flightFrame = 0
function cancelDeviceFlight() { cancelAnimationFrame(flightFrame) }
function selectDevice(id: string) {
  selectedInstanceId.value = id
  emit('select-device', id)
  focusLoadedDevice(id)
  void openCard()
}
const bottlingTrendMetric = ref(0)
const bottlingTrend = computed(() => bottlingDevice.value.metrics[bottlingTrendMetric.value] ?? bottlingDevice.value.metrics[0]!)
watch(selectedInstanceId, () => { bottlingTrendMetric.value = 0 })
const trendMetric = ref<'temperature' | 'pressure'>('temperature')
const trendWindow = ref<15 | 30>(30)
const trend = computed(() => {
  const temperature = trendMetric.value === 'temperature'
  const all = temperature
    ? [96.8, 97.1, 97.5, 97.8, 98.0, 98.3, 98.1, 98.2, 98.4, 98.2, 98.1, 98.2, 98.2]
    : [.10, .105, .11, .115, .12, .125, .12, .12, .125, .12, .12, .115, .12]
  const offset = Number(temperature ? activeDevice.value.temperature : activeDevice.value.pressure) - (temperature ? 98.2 : .12)
  const shifted = all.map(value => value + offset)
  const values = trendWindow.value === 15 ? shifted.slice(6) : shifted
  const min = temperature ? 94 : .08, max = temperature ? 102 : .28
  const y = (value: number) => 88 - (value - min) / (max - min) * 76
  const points = values.map((v, i) => `${36 + i / (values.length - 1) * 280},${y(v)}`).join(' ')
  const low = temperature ? 96 : .10, high = temperature ? 100 : .25
  const target = temperature ? 98 : .12
  return { points, targetY: y(target), bandY: y(high), bandHeight: y(low) - y(high), unit: temperature ? '°C' : 'MPa', current: temperature ? activeDevice.value.temperature : activeDevice.value.pressure, ticks: [max, (min + max) / 2, min].map(v => ({ y: y(v), label: temperature ? v.toFixed(0) : v.toFixed(2) })) }
})
const cardOpen = ref(false)
const closeButton = ref<HTMLButtonElement | null>(null)
const parameterButton = ref<HTMLButtonElement | null>(null)
const projectedCard = ref<{ x: number; y: number; cardX: number; cardY: number } | null>(null)
const stageSize = ref({ width: 1, height: 1 })
let modelAnchor: THREE.Vector3 | null = null
let requestRender = () => {}
let pointerEvents: AbortController | null = null
async function openCard() {
  if (!metricsEnabled.value || state.value || !modelAnchor) return
  cardOpen.value = true; requestRender()
  await nextTick(); closeButton.value?.focus({ preventScroll: true })
}
function closeCard() {
  cardOpen.value = false
  parameterButton.value?.focus({ preventScroll: true })
}

let renderer: THREE.WebGLRenderer | null = null
let controls: OrbitControls | null = null
let observer: ResizeObserver | null = null
let scene: THREE.Scene | null = null
let environment: THREE.WebGLRenderTarget | null = null
let frame = 0, version = 0
let resetCamera = () => {}
function disposeObject(root: THREE.Object3D) {
  const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>(), textures = new Set<THREE.Texture>()
  root.traverse(object => {
    if (object instanceof THREE.DirectionalLight) object.shadow.dispose()
    if (!(object instanceof THREE.Mesh || object instanceof THREE.Line)) return
    if (!geometries.has(object.geometry)) { object.geometry.dispose(); geometries.add(object.geometry) }
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
      if (materials.has(material)) continue
      Object.values(material).forEach(value => { if (value instanceof THREE.Texture && !textures.has(value)) { value.dispose(); textures.add(value) } })
      material.dispose(); materials.add(material)
    }
  })
}
function clear() {
  version++; cancelAnimationFrame(frame); frame = 0
  cancelDeviceFlight(); deviceInstances = []; deviceLabels.value = []; focusLoadedDevice = () => {}
  modelAnchor = null; projectedCard.value = null; cardOpen.value = false; requestRender = () => {}
  pointerEvents?.abort(); pointerEvents = null
  observer?.disconnect(); controls?.dispose()
  if (scene) disposeObject(scene)
  scene = null; environment?.dispose(); environment = null
  renderer?.dispose(); renderer?.domElement.remove(); renderer = null
}
function load() {
  clear()
  if (!url.value || !host.value) return
  state.value = '设备模型加载中'
  const current = version
  const world = new THREE.Scene(); scene = world
  const camera = new THREE.PerspectiveCamera(40, 1, .01, 1000)
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5))
    renderer.toneMapping = THREE.AgXToneMapping; renderer.toneMappingExposure = 1
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap
    const pmrem = new THREE.PMREMGenerator(renderer), room = new RoomEnvironment()
    environment = pmrem.fromScene(room, .04); world.environment = environment.texture
    world.environmentIntensity = .36; room.dispose(); pmrem.dispose()
    world.add(new THREE.HemisphereLight(0xbfe9ff, 0x092547, .4))
    const light = new THREE.DirectionalLight(0xb5d4ff, 1.4)
    light.position.set(8, 14, 6); light.castShadow = true
    light.shadow.mapSize.set(2048, 2048)
    Object.assign(light.shadow.camera, { left: -16, right: 16, top: 16, bottom: -16, near: .1, far: 60 })
    light.shadow.normalBias = .03; world.add(light)
    host.value.appendChild(renderer.domElement)
    controls = new OrbitControls(camera, renderer.domElement)
    controls.maxPolarAngle = Math.PI / 2 - .035; controls.minDistance = 2; controls.maxDistance = 70
    const render = () => {
      frame = 0; renderer?.render(world, camera)
      if (host.value) {
        deviceLabels.value = deviceInstances.flatMap(device => {
          const p = device.center.clone().add(new THREE.Vector3(0, device.size.y * .65, 0)).project(camera)
          return p.z > -1 && p.z < 1 && Math.abs(p.x) < .94 && Math.abs(p.y) < .85 ? [{ id: device.id, x: (p.x + 1) * host.value!.clientWidth / 2, y: (1 - p.y) * host.value!.clientHeight / 2 }] : []
        })
        const selected = deviceInstances.find(device => device.id === selectedInstanceId.value)
        if (selected) modelAnchor = selected.center.clone().add(new THREE.Vector3(0, selected.size.y * .4, 0))
      }
      if (!host.value || !metricsEnabled.value || !modelAnchor) { projectedCard.value = null; return }
      const width = host.value.clientWidth, height = host.value.clientHeight
      stageSize.value = { width, height }
      const p = modelAnchor.clone().project(camera)
      if (p.z < -1 || p.z > 1) { projectedCard.value = null; return }
      const x = (p.x + 1) * width / 2, y = (1 - p.y) * height / 2
      projectedCard.value = {
        x, y,
        cardX: THREE.MathUtils.clamp(x + 45, 16, Math.max(16, width - 382)),
        cardY: THREE.MathUtils.clamp(y - 260, 38, Math.max(38, height - 565)),
      }
    }
    const request = () => { if (!frame) frame = requestAnimationFrame(render) }
    requestRender = request
    controls.addEventListener('change', request)
    controls.addEventListener('start', cancelDeviceFlight)
    let loadedModel: THREE.Group | null = null
    let press: { x: number; y: number; id: number; moved: boolean } | null = null
    pointerEvents = new AbortController()
    const signal = pointerEvents.signal
    const canvas = renderer.domElement
    canvas.addEventListener('pointerdown', event => {
      if (event.button === 0 && event.isPrimary) press = { x: event.clientX, y: event.clientY, id: event.pointerId, moved: false }
    }, { signal })
    canvas.addEventListener('pointermove', event => {
      if (press && Math.hypot(event.clientX - press.x, event.clientY - press.y) > 5) press.moved = true
    }, { signal })
    canvas.addEventListener('pointercancel', () => { press = null }, { signal })
    canvas.addEventListener('pointerup', event => {
      const click = press; press = null
      if (!click || click.id !== event.pointerId || click.moved || !loadedModel) return
      const rect = canvas.getBoundingClientRect()
      const pointer = new THREE.Vector2((event.clientX - rect.left) / rect.width * 2 - 1, 1 - (event.clientY - rect.top) / rect.height * 2)
      const ray = new THREE.Raycaster(); ray.setFromCamera(pointer, camera)
      const hit = ray.intersectObject(loadedModel, true)[0]
      if (hit) {
        const instance = deviceInstances.find(device => { let object: THREE.Object3D | null = hit.object; while (object) { if (object === device.root) return true; object = object.parent } return false })
        if (instance) selectDevice(instance.id)
      }
    }, { signal })
    observer = new ResizeObserver(() => {
      if (!host.value || !renderer) return
      camera.aspect = host.value.clientWidth / Math.max(1, host.value.clientHeight)
      camera.updateProjectionMatrix(); renderer.setSize(host.value.clientWidth, host.value.clientHeight, false); request()
    })
    observer.observe(host.value)
    new GLTFLoader().load(url.value, gltf => {
      if (current !== version) { disposeObject(gltf.scene); return }
      const source = gltf.scene
      source.updateMatrixWorld(true)
      const originalBounds = new THREE.Box3().setFromObject(source), originalSize = originalBounds.getSize(new THREE.Vector3())
      const model = new THREE.Group(); world.add(model); loadedModel = model
      if (isBottling.value) {
        model.add(source)
        for (const device of bottlingDevices) {
          const root = source.getObjectByName(device.nodeName)
          if (!root) { state.value = '设备层级不完整，请检查产线资产'; emit('error'); return }
          const box = new THREE.Box3().setFromObject(root)
          deviceInstances.push({ id: device.id, root, center: box.getCenter(new THREE.Vector3()), size: box.getSize(new THREE.Vector3()) })
        }
      } else {
        const instances = props.deviceCode === 'EQ-RICE-004' ? steamerDevices : [{ id: props.deviceCode }]
        const originX = source.position.x
        const deviceClearance = 2.5 // Metres between the complete equipment bounds, including walkways and pipework.
        instances.forEach((device, index) => {
          const root = index === 0 ? source : source.clone(true)
          // Clones inherit the first instance transform; assign from the original origin instead of accumulating offsets.
          root.position.x = originX + (index - (instances.length - 1) / 2) * (originalSize.x + deviceClearance)
          model.add(root); root.updateMatrixWorld(true)
          const box = new THREE.Box3().setFromObject(root)
          deviceInstances.push({ id: device.id, root, center: box.getCenter(new THREE.Vector3()), size: box.getSize(new THREE.Vector3()) })
        })
      }
      model.traverse(object => { if (object instanceof THREE.Mesh) { object.castShadow = true; object.receiveShadow = true } })
      const bounds = new THREE.Box3().setFromObject(model), center = bounds.getCenter(new THREE.Vector3()), size = bounds.getSize(new THREE.Vector3())
      // Fit the shadow frustum to the assembled line without changing equipment transforms.
      if (isBottling.value) {
        const span = Math.max(size.x, size.z, 16)
        light.position.copy(center).add(new THREE.Vector3(span * .35, span * .65, span * .4))
        light.target.position.copy(center); world.add(light.target)
        Object.assign(light.shadow.camera, { left: -span * .65, right: span * .65, top: span * .65, bottom: -span * .65, far: span * 3 })
        light.shadow.camera.updateProjectionMatrix()
      }
      const selection = new THREE.Box3Helper(new THREE.Box3(), new THREE.Color('#72d7ff'))
      selection.visible = false; world.add(selection)
      const applyCamera = (target: THREE.Vector3, dimensions: THREE.Vector3, animated: boolean) => {
        if (!host.value || !controls) return
        cancelDeviceFlight()
        camera.aspect = host.value.clientWidth / Math.max(1, host.value.clientHeight)
        const halfFov = Math.atan(Math.tan(THREE.MathUtils.degToRad(20)) * Math.min(1, camera.aspect))
        const direction = (isBottling.value ? new THREE.Vector3(.38, .65, 1.2) : new THREE.Vector3(1.1, .8, 1)).normalize()
        let distance = dimensions.length() * (animated ? .48 : .46) / Math.sin(halfFov)
        if (isBottling.value) {
          // Fit all eight equipment bounds corners in camera space, including wide viewports.
          const right = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), direction).normalize()
          const up = new THREE.Vector3().crossVectors(direction, right).normalize()
          const tanV = Math.tan(THREE.MathUtils.degToRad(20)), tanH = tanV * camera.aspect
          distance = 0
          for (const x of [-.5, .5]) for (const y of [-.5, .5]) for (const z of [-.5, .5]) {
            const corner = new THREE.Vector3(x * dimensions.x, y * dimensions.y, z * dimensions.z)
            distance = Math.max(distance, corner.dot(direction) + Math.max(Math.abs(corner.dot(right)) / tanH, Math.abs(corner.dot(up)) / tanV) * (animated ? 1.6 : 1.06))
          }
        }
        controls.maxDistance = Math.max(70, distance * 2)
        const destination = target.clone().addScaledVector(direction, distance)
        const from = camera.position.clone(), fromTarget = controls.target.clone(), start = performance.now()
        const duration = animated && !matchMedia('(prefers-reduced-motion: reduce)').matches ? 500 : 0
        const step = (now: number) => {
          if (current !== version || !controls) return
          const t = duration ? Math.min(1, (now - start) / duration) : 1, ease = t * t * (3 - 2 * t)
          camera.position.lerpVectors(from, destination, ease); controls.target.lerpVectors(fromTarget, target, ease)
          camera.updateProjectionMatrix(); controls.update(); request()
          if (t < 1) flightFrame = requestAnimationFrame(step)
        }
        step(performance.now())
      }
      focusLoadedDevice = id => {
        const device = deviceInstances.find(item => item.id === id)
        if (!device) return
        selectedInstanceId.value = id
        selection.box.setFromObject(device.root); selection.visible = true
        modelAnchor = device.center.clone().add(new THREE.Vector3(0, device.size.y * .4, 0))
        applyCamera(device.center, device.size, true)
        request()
      }
      const slabMaterial = new THREE.MeshStandardMaterial({ color: '#173447', roughness: .95, metalness: .05 })
      slabMaterial.name = '浅灰场地'
      const slab = new THREE.Mesh(new THREE.BoxGeometry(size.x + 1.5, .22, size.z + 1.5), slabMaterial)
      slab.position.set(center.x, bounds.min.y - .13, center.z); slab.receiveShadow = true
      const base = new THREE.Group(); base.add(slab); world.add(base)
      const grid = createCampusGridGround(base); grid.material.uniforms.spacing!.value = 1; world.add(grid)
      resetCamera = () => { cardOpen.value = false; applyCamera(center, size, false) }
      resetCamera(); state.value = ''; if (props.selectedDeviceId) { focusLoadedDevice(props.selectedDeviceId); if (metricsEnabled.value) void openCard() } render(); emit('ready')
    }, undefined, () => { if (current === version) { state.value = '设备模型暂不可用'; emit('error') } })
  } catch { state.value = '设备模型暂不可用'; emit('error') }
}
onMounted(load)
watch(() => [props.deviceCode, url.value], load, { flush: 'post' })
watch(metricsEnabled, () => { cardOpen.value = false; requestRender() })
watch(() => props.focusRequest, () => { if (props.selectedDeviceId) { focusLoadedDevice(props.selectedDeviceId); void openCard() } })
onBeforeUnmount(clear)
</script>
<template>
  <div class="equipment-model-stage" @keydown.esc="closeCard">
    <div ref="host" class="equipment-model-canvas" />
    <div v-if="!state" class="device-labels"><button v-for="device in deviceLabels" :key="device.id" :class="{ selected: selectedInstanceId === device.id }" :style="{ left: `${device.x}px`, top: `${device.y}px` }" :aria-pressed="selectedInstanceId === device.id" @click="selectDevice(device.id)"><i />{{ device.id }}<small>{{ selectedInstanceId === device.id ? '当前设备' : '定位设备' }}</small></button></div>
    <div v-if="!url" class="equipment-model-placeholder"><small>HUIJISHAN · EQUIPMENT TWIN</small><h2>{{ modelName ?? entry?.name ?? deviceCode }}</h2><p>独立设备模型准备中</p></div>
    <p v-else-if="state" class="equipment-model-message" role="status">{{ state }}</p>
    <div v-if="metricsEnabled && !state && cardOpen && projectedCard" class="equipment-process-metrics">
      <svg class="metric-leaders" :viewBox="`0 0 ${stageSize.width} ${stageSize.height}`" aria-hidden="true">
        <path :d="`M ${projectedCard.cardX} ${projectedCard.cardY + 196} L ${projectedCard.x} ${projectedCard.y}`" /><circle :cx="projectedCard.x" :cy="projectedCard.y" r="4" />
      </svg>
      <section class="equipment-process-card" role="region" :aria-label="`${cardDevice.name}工艺参数`" :style="{ left: `${projectedCard.cardX}px`, top: `${projectedCard.cardY}px` }" @pointerdown.stop @click.stop @wheel.stop>
        <header class="process-card-title"><span>{{ cardDevice.name }} · {{ cardDevice.id }}</span><button ref="closeButton" type="button" aria-label="关闭工艺参数卡片" @click="closeCard">×</button></header>
        <div class="process-task"><div><small>当前任务</small><strong>{{ isBottling ? bottlingDevice.task : '蒸煮工序' }}</strong></div><span class="process-status"><i />{{ isBottling ? '待接入' : '加工中' }}</span><p>设备编号 <b>{{ cardDevice.id }}</b></p></div>
        <div class="process-card-values">
          <div v-for="metric in processMetrics" :key="metric.id" class="parameter-row">
            <div class="parameter-main"><span>{{ metric.label }}</span><strong>{{ metric.value }}<small>{{ metric.unit }}</small></strong></div>
            <div class="parameter-context"><span>{{ metric.target }}</span><span>{{ metric.range }}</span></div>
            <div v-if="!isBottling" class="parameter-rail" aria-hidden="true"><span :style="{ left: `${metric.bandStart}%`, width: `${metric.bandWidth}%` }" /><i :style="{ left: `${metric.position}%` }" /></div>
          </div>
        </div>
        <div class="process-trend">
          <div class="trend-toolbar"><div v-if="isBottling" class="parameter-tabs" role="group" aria-label="趋势参数"><button v-for="(metric, index) in bottlingDevice.metrics.slice(0, 2)" :key="metric.id" :aria-pressed="bottlingTrendMetric === index" :class="{ active: bottlingTrendMetric === index }" @click="bottlingTrendMetric = index">{{ metric.label }}</button></div><div v-else class="parameter-tabs" role="group" aria-label="趋势参数"><button :aria-pressed="trendMetric === 'temperature'" :class="{ active: trendMetric === 'temperature' }" @click="trendMetric = 'temperature'">温度</button><button :aria-pressed="trendMetric === 'pressure'" :class="{ active: trendMetric === 'pressure' }" @click="trendMetric = 'pressure'">压力</button></div><div class="window-tabs" role="group" aria-label="趋势时间范围"><button v-for="minutes in ([15, 30] as const)" :key="minutes" :aria-pressed="trendWindow === minutes" :class="{ active: trendWindow === minutes }" @click="trendWindow = minutes">{{ minutes }} 分钟</button></div></div>
          <div v-if="!isBottling" class="trend-legend"><span><i />参数读数</span><span><i class="target" />目标值</span><span><i class="band" />参考区间</span></div>
          <div v-if="isBottling" class="trend-empty" role="status"><strong>{{ bottlingTrend.label }} / {{ bottlingTrend.unit }}</strong><span>最近 {{ trendWindow }} 分钟 · 暂无设备读数</span><small>采集接口待接入，目标按对应工艺或验收规范确认</small></div>
          <svg v-else viewBox="0 0 332 111" role="img" :aria-label="`最近 ${trendWindow} 分钟${trendMetric === 'temperature' ? '温度' : '压力'}趋势，当前 ${trend.current} ${trend.unit}`">
            <rect x="36" :y="trend.bandY" width="280" :height="trend.bandHeight" fill="#2c927a" opacity=".13" />
            <g v-for="tick in trend.ticks" :key="tick.label"><path :d="`M36 ${tick.y}H316`" stroke="#28506f" stroke-dasharray="3 4" /><text x="29" :y="tick.y + 3" text-anchor="end">{{ tick.label }}</text></g>
            <path :d="`M36 ${trend.targetY}H316`" stroke="#d7b77b" stroke-dasharray="5 4" opacity=".8" />
            <polyline :points="trend.points" fill="none" stroke="#66d1ff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
            <text x="36" y="106">−{{ trendWindow }} min</text><text x="316" y="106" text-anchor="end">当前 / {{ trend.unit }}</text>
          </svg>
        </div>
        <div class="process-event"><span>最近记录</span><p v-if="isBottling"><time>资产登记</time><i />{{ bottlingDevice.record }}</p><p v-else><time>T−02 min</time><i />温度记录 {{ activeDevice.temperature }} °C，已更新工序快照</p></div>
        <footer class="process-card-foot"><i /> 设备 {{ cardDevice.id }} · {{ isBottling ? '灌装入库 · 运行数据待接入' : '浸米蒸煮' }}</footer>
      </section>
    </div>
    <button v-if="metricsEnabled && !state && modelAnchor" ref="parameterButton" type="button" class="equipment-parameters" :aria-expanded="cardOpen" @click="openCard">点击设备查看工艺参数</button>
    <button v-if="url && !state" class="equipment-reset" @click="resetCamera()">复位视角</button>
  </div>
</template>
<style scoped>
.trend-empty{height:103px;display:flex;flex-direction:column;justify-content:center;gap:9px;border:1px dashed #28506f;margin:8px 0;color:#87a5bc;font-size:11px;padding:12px;background:repeating-linear-gradient(0deg,transparent,transparent 24px,#28506f33 25px)}.trend-empty strong{font-size:12px;color:#a8cee5;font-weight:500}.trend-empty small{font-size:10px;line-height:1.5}.process-event p{line-height:1.6}

.equipment-model-stage{position:absolute;inset:0;background:radial-gradient(ellipse at 42% 32%,#193b52 0,#0d263c 48%,#06182d 82%,#031020 100%)}
.equipment-model-canvas{position:absolute;inset:0}.equipment-model-canvas :deep(canvas){width:100%;height:100%;display:block;touch-action:none}.equipment-reset{position:absolute;bottom:16px;left:16px;padding:7px 12px;border:1px solid #39779b;background:#092b47d9;color:#bde7ff;cursor:pointer;font-size:12px}
.equipment-process-metrics{position:absolute;inset:0;pointer-events:none;z-index:2}.metric-leaders{position:absolute;inset:0;width:100%;height:100%;overflow:hidden}.metric-leaders path{stroke:#74c9eb;stroke-width:1;fill:none;opacity:.75}.metric-leaders circle{fill:#9be7ff;stroke:#25546c;stroke-width:2}
.equipment-process-card{position:absolute;width:366px;max-height:calc(100% - 54px);overflow:auto;overscroll-behavior:contain;scrollbar-width:thin;scrollbar-color:#285c7f #071b30;pointer-events:auto;border:1px solid #3884af;background:linear-gradient(135deg,rgba(8,35,64,.98),rgba(3,18,37,.98));box-shadow:0 8px 32px #00122599,inset 0 0 30px #0e4d791c}
.process-card-title{height:41px;padding:0 9px 0 14px;display:flex;align-items:center;justify-content:space-between;font-size:15px;font-weight:500;color:#b9ddfa;background:linear-gradient(90deg,#144a838c,transparent);border-bottom:1px solid #2a7abe59;position:sticky;top:0;z-index:1;backdrop-filter:blur(10px)}.process-card-title>span:before{content:'';display:inline-block;width:6px;height:6px;margin-right:9px;background:#34b5ff;transform:rotate(45deg)}.process-card-title button{width:32px;height:32px;border:0;background:transparent;color:#97bfd8;font-size:24px;cursor:pointer}.process-card-title button:hover{background:#1c5177;color:#e0f4ff}.process-card-title button:focus-visible,.equipment-parameters:focus-visible,.process-trend button:focus-visible{outline:2px solid #72d7ff;outline-offset:-2px}
.process-task{padding:11px 15px 10px;border-bottom:1px solid #22517870;display:flex;align-items:center;flex-wrap:wrap;justify-content:space-between;background:#0b2b4566}.process-task>div{display:flex;align-items:center;gap:10px}.process-task small{font-size:10px;color:#87a9c1}.process-task strong{font-size:14px;font-weight:500;color:#d1e7f7}.process-status{font-size:11px;color:#82d8ba;border:1px solid #2e7569;padding:3px 7px;background:#154e4733}.process-status i{display:inline-block;width:5px;height:5px;border-radius:50%;background:#82d8ba;margin-right:5px}.process-task p{width:100%;margin:8px 0 0;font-size:10px;color:#7895b4}.process-task b{font-weight:400;color:#a7c6dd;margin-left:8px;letter-spacing:.6px}
.process-card-values{padding:0 15px}.parameter-row{padding:7px 0;border-bottom:1px solid #22517855}.parameter-row:last-child{border-bottom:0}.parameter-main,.parameter-context{display:flex;align-items:baseline;justify-content:space-between}.parameter-main>span{font-size:13px;color:#b6d2e6}.parameter-main strong{font-size:24px;line-height:1.15;font-weight:500;color:#76d5ff;font-variant-numeric:tabular-nums}.parameter-main small{display:inline-block;min-width:28px;margin-left:6px;font-size:11px;color:#9bbdd3;font-weight:400}.parameter-context{margin-top:4px;font-size:10px;color:#87a5bc}.parameter-context>span:last-child{color:#77b6b9}.parameter-rail{position:relative;margin-top:6px;height:3px;background:#1b364d}.parameter-rail>span{position:absolute;top:0;height:3px;background:#2d7a7299}.parameter-rail>i{position:absolute;top:-3px;height:9px;width:3px;background:#81d6ff;box-shadow:0 0 5px #5acbff66}
.process-trend{margin:3px 15px 0;padding-top:9px;border-top:1px solid #22517870}.trend-toolbar{display:flex;justify-content:space-between;align-items:center}.parameter-tabs,.window-tabs{display:flex;gap:3px}.process-trend button{border:1px solid transparent;background:transparent;color:#7895b4;font-size:11px;padding:4px 8px;cursor:pointer}.process-trend button.active{color:#a6e5ff;border-color:#28698e;background:#12436a88}.window-tabs button{font-size:10px;padding:4px 6px}.trend-legend{display:flex;gap:14px;margin:8px 0 2px;font-size:9px;color:#87a5bc}.trend-legend span{display:flex;align-items:center;gap:4px}.trend-legend i{display:inline-block;width:10px;height:2px;background:#66d1ff}.trend-legend i.target{background:#d7b77b}.trend-legend i.band{height:6px;background:#2c927a66}.process-trend svg{display:block;width:100%;height:88px;overflow:visible}.process-trend svg text{fill:#87a5bc;font-size:9px}
.process-event{padding:9px 15px;border-top:1px solid #22517870}.process-event>span{font-size:11px;color:#a8c8dd}.process-event small{font-size:9px;color:#7895b4;margin-left:5px}.process-event p{display:flex;align-items:center;gap:7px;margin:7px 0 0;font-size:10px;color:#93b1c7}.process-event time{font-size:9px;color:#7895b4}.process-event p i{width:4px;height:4px;border-radius:50%;background:#6ec3e8;flex-shrink:0}.process-card-foot{padding:8px 15px;border-top:1px solid #22517870;color:#7895b4;font-size:10px}.process-card-foot i{display:inline-block;width:5px;height:5px;margin-right:5px;border-radius:50%;background:#d2b074}
.equipment-parameters{position:absolute;bottom:16px;left:105px;border:1px solid #285c7f;background:#092b47d9;color:#9dc9e4;padding:7px 12px;font-size:12px;cursor:pointer}.equipment-parameters:hover{background:#12466a}
.device-labels{position:absolute;inset:0;pointer-events:none;z-index:1}.device-labels button{white-space:nowrap;position:absolute;transform:translate(-50%,-100%);pointer-events:auto;border:1px solid #39779b;background:#061b30e8;color:#a8cee5;padding:6px 10px;cursor:pointer;font-size:12px}.device-labels button.selected{border-color:#79d8e3;color:#d2f5ff;background:#0d3a54e8}.device-labels button i{display:inline-block;width:5px;height:5px;background:#70cfe7;border-radius:50%;margin-right:6px}.device-labels small{display:block;font-size:9px;color:#83a8bf;margin-top:3px}.process-card-title>span{font-size:13px}
</style>
