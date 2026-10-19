<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch, nextTick } from 'vue'
import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import { steamerDevices, bottlingDevices, pressDevices, fermentationDevices } from '../data/processEquipment'
import { equipmentModelCatalog } from '../data/processRegions'
import { useEquipmentReadingsStore } from '../stores/equipmentReadings'
import { fitEquipmentCamera, enhanceEquipmentMaterials, createEquipmentContactShadow, type EquipmentFraming } from '../three/equipmentPresentation'
import { createCampusGridGround } from '../three/createCampusGridGround'
const readings = useEquipmentReadingsStore()
const props = defineProps<{ deviceCode: string; operationsMode?: boolean; assetUrl?: string; modelName?: string; showProcessMetrics?: boolean; selectedDeviceId?: string; focusRequest?: number }>()
const emit = defineEmits<{ ready: []; error: []; 'select-device': [id: string] }>()
const entry = computed(() => equipmentModelCatalog[props.deviceCode])
const url = computed(() => props.assetUrl ?? entry.value?.assetUrl)
const host = ref<HTMLDivElement | null>(null)
const state = ref('')
// Local presentation snapshot; replace with the device acquisition API when available.
const selectedInstanceId = ref(props.selectedDeviceId ?? '')
const isBottling = computed(() => props.deviceCode === 'LINE-BOTTLING-001' || props.deviceCode === 'GZ-01')
const isPress = computed(() => props.deviceCode === 'EQ-PRS-003')
const isFermentation = computed(() => ['FER-PRE-ARRAY', 'FER-POST-ARRAY', 'FJ-03'].includes(props.deviceCode))
const fermentationZone = computed(() => props.deviceCode === 'FER-POST-ARRAY' ? 'post' : 'pre')
const arrayDevices = computed(() => isFermentation.value ? fermentationDevices.filter(device => device.zone === fermentationZone.value) : isPress.value ? pressDevices : bottlingDevices)
const hasDeviceRegistry = computed(() => isBottling.value || isFermentation.value || isPress.value)
// Equipment cards are available from both process and maintenance views.
const metricsEnabled = computed(() => !props.operationsMode && (hasDeviceRegistry.value || props.deviceCode === 'EQ-RICE-004' || props.showProcessMetrics))
const detailDevice = computed(() => arrayDevices.value.find(device => device.id === selectedInstanceId.value) ?? arrayDevices.value[0]!)
const cardDevice = computed(() => hasDeviceRegistry.value ? detailDevice.value : activeDevice.value)
const activeDevice = computed(() => steamerDevices.find(device => device.id === selectedInstanceId.value) ?? steamerDevices[0]!)
const processMetrics = computed(() => (readings.profiles[cardDevice.value.id] ?? []).map(metric => {
  const samples = readings.history[cardDevice.value.id]![metric.id]!
  const current = samples[samples.length - 1]!
  return { ...metric, current, value: current.toFixed(metric.precision), targetLabel: `目标 ${metric.target} ${metric.unit}`, range: metric.context,
    position: metric.baseline ? 50 + (current / metric.baseline - 1) * 2500 : 50, bandStart: 37.5, bandWidth: 25 }
}))
const processScope = computed(() => isFermentation.value ? fermentationZone.value === 'pre' ? '前发酵区' : '后发酵区' : isPress.value ? '压榨工段' : isBottling.value ? '灌装入库' : '浸米蒸煮')
const updateTime = computed(() => new Date(readings.updatedAt).toLocaleTimeString('zh-CN', { hour12: false }))
const deviceLabels = ref<{ id: string; x: number; y: number }[]>([])
let deviceInstances: { id: string; root: THREE.Object3D; center: THREE.Vector3; size: THREE.Vector3 }[] = []
let focusLoadedDevice = (_id: string, _frameDevice = true) => {}
let flightFrame = 0
function cancelDeviceFlight() { cancelAnimationFrame(flightFrame) }
function selectDevice(id: string) {
  selectedInstanceId.value = id
  emit('select-device', id)
  focusLoadedDevice(id)
  if (metricsEnabled.value) void openCard()
}
const selectedMetricIndex = ref(0)
watch(selectedInstanceId, () => { selectedMetricIndex.value = 0 })
const trendWindow = ref<15 | 30>(30)
const trend = computed(() => {
  const metric = processMetrics.value[selectedMetricIndex.value] ?? processMetrics.value[0]!
  const samples = readings.history[cardDevice.value.id]![metric.id]!
  const maximum = Math.max(metric.baseline * 1.02, metric.target * 1.02, metric.baseline === 0 ? 1 : 0)
  const minimum = Math.min(metric.baseline * .98, metric.target * .98)
  const y = (value: number) => 88 - (value - minimum) / (maximum - minimum) * 76
  const end = readings.updatedAt, start = end - trendWindow.value * 60000
  const points = readings.sampleTimes.flatMap((time, index) => time >= start && time <= end ? [`${36 + (time - start) / (end - start) * 280},${y(samples[index]!)}`] : []).join(' ')
  return { label: metric.label, points, targetY: y(metric.target), bandY: y(metric.baseline * 1.005), bandHeight: y(metric.baseline * .995) - y(metric.baseline * 1.005), unit: metric.unit, current: metric.value,
    ticks: [maximum, (minimum + maximum) / 2, minimum].map(value => ({ y: y(value), label: value.toFixed(Math.min(metric.precision, 4)) })) }
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
    renderer.toneMapping = THREE.AgXToneMapping; renderer.toneMappingExposure = 1.08
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap
    const pmrem = new THREE.PMREMGenerator(renderer), room = new RoomEnvironment()
    environment = pmrem.fromScene(room, .07); world.environment = environment.texture
    world.environmentIntensity = .8; room.dispose(); pmrem.dispose()
    world.add(new THREE.HemisphereLight(0xdcecff, 0x23394e, .65))
    const light = new THREE.DirectionalLight(0xfff3df, 2.4)
    light.position.set(8, 14, 6); light.castShadow = true
    light.shadow.mapSize.set(2048, 2048)
    Object.assign(light.shadow.camera, { left: -16, right: 16, top: 16, bottom: -16, near: .1, far: 60 })
    light.shadow.normalBias = .012; light.shadow.bias = -.00015; light.shadow.radius = 3; world.add(light)
    const fill = new THREE.DirectionalLight(0xc3ddff, 1.1)
    const rim = new THREE.DirectionalLight(0xa6d9ff, 2.0)
    world.add(fill, fill.target, rim, rim.target)
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
    let refitCamera = () => {}
    observer = new ResizeObserver(() => {
      if (!host.value || !renderer) return
      camera.aspect = host.value.clientWidth / Math.max(1, host.value.clientHeight)
      camera.updateProjectionMatrix(); renderer.setSize(host.value.clientWidth, host.value.clientHeight, false); refitCamera(); request()
    })
    observer.observe(host.value)
    new GLTFLoader().load(url.value, gltf => {
      if (current !== version) { disposeObject(gltf.scene); return }
      const source = gltf.scene
      source.updateMatrixWorld(true)
      const originalBounds = new THREE.Box3().setFromObject(source), originalSize = originalBounds.getSize(new THREE.Vector3())
      const model = new THREE.Group(); world.add(model); loadedModel = model
      if (hasDeviceRegistry.value) {
        model.add(source)
        for (const device of arrayDevices.value) {
          const root = source.getObjectByName(device.nodeName)
          if (!root) { state.value = '设备层级不完整，请检查产线资产'; emit('error'); return }
          const box = new THREE.Box3().setFromObject(root)
          deviceInstances.push({ id: device.id, root, center: box.getCenter(new THREE.Vector3()), size: box.getSize(new THREE.Vector3()) })
        }
      } else {
        const instances = props.deviceCode === 'EQ-RICE-004' ? steamerDevices : [{ id: props.operationsMode ? props.selectedDeviceId || props.deviceCode : props.deviceCode }]
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
      enhanceEquipmentMaterials(model)
      const bounds = new THREE.Box3().setFromObject(model), center = bounds.getCenter(new THREE.Vector3()), size = bounds.getSize(new THREE.Vector3())
      // Keep the lighting and shadow coverage proportional to every equipment assembly.
      const span = Math.max(size.x, size.y, size.z, 4)
      light.position.copy(center).add(new THREE.Vector3(-span * .45, span * 1.1, span * .65))
      fill.position.copy(center).add(new THREE.Vector3(span * .9, span * .4, span * .4))
      rim.position.copy(center).add(new THREE.Vector3(span * .35, span * .8, -span * .8))
      for (const lamp of [light, fill, rim]) lamp.target.position.copy(center)
      world.add(light.target)
      Object.assign(light.shadow.camera, { left: -span * .75, right: span * .75, top: span * .75, bottom: -span * .75, near: .1, far: span * 4 })
      light.shadow.camera.updateProjectionMatrix()
      const selection = new THREE.Box3Helper(new THREE.Box3(), new THREE.Color('#72d7ff'))
      selection.visible = false; world.add(selection)
      const overviewMode: EquipmentFraming = isBottling.value ? 'line' : deviceInstances.length > 1 ? 'group' : 'single'
      const applyCamera = (target: THREE.Vector3, dimensions: THREE.Vector3, animated: boolean, mode: EquipmentFraming = 'single') => {
        if (!host.value || !controls) return
        cancelDeviceFlight()
        camera.aspect = host.value.clientWidth / Math.max(1, host.value.clientHeight)
        const { direction, distance, targetOffset } = fitEquipmentCamera(dimensions, camera.aspect, mode, camera.fov)
        camera.near = Math.max(.01, distance / 1000)
        camera.far = Math.max(1000, distance * 5)
        camera.updateProjectionMatrix()
        controls.minDistance = Math.max(.25, dimensions.length() * .12)
        controls.maxDistance = Math.max(70, distance * 3)
        refitCamera = () => applyCamera(target, dimensions, false, mode)
        const framedTarget = target.clone().add(targetOffset)
        const destination = framedTarget.clone().addScaledVector(direction, distance)
        const from = camera.position.clone(), fromTarget = controls.target.clone(), start = performance.now()
        const duration = animated && !matchMedia('(prefers-reduced-motion: reduce)').matches ? 500 : 0
        const step = (now: number) => {
          if (current !== version || !controls) return
          const t = duration ? Math.min(1, (now - start) / duration) : 1, ease = t * t * (3 - 2 * t)
          camera.position.lerpVectors(from, destination, ease); controls.target.lerpVectors(fromTarget, framedTarget, ease)
          camera.updateProjectionMatrix(); controls.update(); request()
          if (t < 1) flightFrame = requestAnimationFrame(step)
        }
        step(performance.now())
      }
      focusLoadedDevice = (id, frameDevice = true) => {
        const device = deviceInstances.find(item => item.id === id)
        if (!device) return
        selectedInstanceId.value = id
        selection.box.setFromObject(device.root); selection.visible = true
        modelAnchor = device.center.clone().add(new THREE.Vector3(0, device.size.y * .4, 0))
        if (frameDevice) applyCamera(device.center, device.size, true)
        request()
      }
      const slabMaterial = new THREE.MeshStandardMaterial({ color: '#173447', roughness: .95, metalness: .05 })
      slabMaterial.name = '浅灰场地'
      const slab = new THREE.Mesh(new THREE.BoxGeometry(size.x + 1.5, .22, size.z + 1.5), slabMaterial)
      slab.position.set(center.x, bounds.min.y - .115, center.z); slab.receiveShadow = true
      const base = new THREE.Group(); base.add(slab); world.add(base)
      for (const device of deviceInstances) {
        const shadow = createEquipmentContactShadow(device.size.x, device.size.z)
        shadow.position.set(device.center.x, bounds.min.y - .004, device.center.z)
        world.add(shadow)
      }
      const grid = createCampusGridGround(base); grid.material.uniforms.spacing!.value = 1; world.add(grid)
      resetCamera = () => { cardOpen.value = false; applyCamera(center, size, false, overviewMode) }
      resetCamera(); state.value = ''; if (props.selectedDeviceId) { focusLoadedDevice(props.selectedDeviceId, false); if (metricsEnabled.value) void openCard() } render(); emit('ready')
    }, undefined, () => { if (current === version) { state.value = '设备模型暂不可用'; emit('error') } })
  } catch { state.value = '设备模型暂不可用'; emit('error') }
}
onMounted(() => { readings.start(); load() })
watch(() => [props.deviceCode, url.value], load, { flush: 'post' })
watch(metricsEnabled, () => { cardOpen.value = false; requestRender() })
watch(() => props.selectedDeviceId, id => {
  if (!id || !props.operationsMode) return
  if (!hasDeviceRegistry.value && props.deviceCode !== 'EQ-RICE-004') deviceInstances.forEach(device => { device.id = id })
  focusLoadedDevice(id)
})
watch(() => props.focusRequest, () => { if (props.selectedDeviceId) { focusLoadedDevice(props.selectedDeviceId); if (metricsEnabled.value) void openCard() } })
onBeforeUnmount(() => { readings.stop(); clear() })
</script>
<template>
  <div class="equipment-model-stage" @keydown.esc="closeCard">
    <div ref="host" class="equipment-model-canvas" />
    <div v-if="!state" class="device-labels"><button v-for="device in deviceLabels" :key="device.id" :class="{ selected: selectedInstanceId === device.id }" :style="{ left: `${device.x}px`, top: `${device.y}px` }" :aria-pressed="selectedInstanceId === device.id" @click="selectDevice(device.id)"><i />{{ device.id }}<small v-if="selectedInstanceId === device.id">当前设备</small></button></div>
    <div v-if="!url" class="equipment-model-placeholder"><small>HUIJISHAN · EQUIPMENT TWIN</small><h2>{{ modelName ?? entry?.name ?? deviceCode }}</h2><p>独立设备模型准备中</p></div>
    <p v-else-if="state" class="equipment-model-message" role="status">{{ state }}</p>
    <div v-if="metricsEnabled && !state && cardOpen && projectedCard" class="equipment-process-metrics">
      <svg class="metric-leaders" :viewBox="`0 0 ${stageSize.width} ${stageSize.height}`" aria-hidden="true">
        <path :d="`M ${projectedCard.cardX} ${projectedCard.cardY + 196} L ${projectedCard.x} ${projectedCard.y}`" /><circle :cx="projectedCard.x" :cy="projectedCard.y" r="4" />
      </svg>
      <section class="equipment-process-card" role="region" :aria-label="`${cardDevice.name}工艺参数`" :style="{ left: `${projectedCard.cardX}px`, top: `${projectedCard.cardY}px` }" @pointerdown.stop @click.stop @wheel.stop>
        <header class="process-card-title"><span>{{ cardDevice.name }} · {{ cardDevice.id }}</span><button ref="closeButton" type="button" aria-label="关闭工艺参数卡片" @click="closeCard">×</button></header>
        <div class="process-task"><div><small>当前任务</small><strong>{{ hasDeviceRegistry ? detailDevice.task : '蒸煮工序' }}</strong></div><p>设备编号 <b>{{ cardDevice.id }}</b></p></div>
        <div class="process-card-values">
          <div v-for="metric in processMetrics" :key="metric.id" class="parameter-row">
            <div class="parameter-main"><span>{{ metric.label }}</span><strong>{{ metric.value }}<small>{{ metric.unit }}</small></strong></div>
            <div class="parameter-context"><span>{{ metric.targetLabel }}</span><span>{{ metric.range }}</span></div>
            <div class="parameter-rail" aria-hidden="true"><span :style="{ left: `${metric.bandStart}%`, width: `${metric.bandWidth}%` }" /><i :style="{ left: `${metric.position}%` }" /></div>
          </div>
        </div>
        <div class="process-trend">
          <div class="trend-toolbar"><div class="parameter-tabs" role="group" aria-label="趋势参数"><button v-for="(metric, index) in processMetrics.slice(0, 2)" :key="metric.id" :aria-pressed="selectedMetricIndex === index" :class="{ active: selectedMetricIndex === index }" @click="selectedMetricIndex = index">{{ metric.label }}</button></div><div class="window-tabs" role="group" aria-label="趋势时间范围"><button v-for="minutes in ([15, 30] as const)" :key="minutes" :aria-pressed="trendWindow === minutes" :class="{ active: trendWindow === minutes }" @click="trendWindow = minutes">{{ minutes }} 分钟</button></div></div>
          <div class="trend-legend"><span><i />参数读数</span><span><i class="target" />目标值</span><span><i class="band" />基准波动区间</span></div>
          <svg viewBox="0 0 332 111" role="img" :aria-label="`最近 ${trendWindow} 分钟${trend.label}趋势，当前 ${trend.current} ${trend.unit}`">
            <rect x="36" :y="trend.bandY" width="280" :height="trend.bandHeight" fill="#2c927a" opacity=".13" />
            <g v-for="tick in trend.ticks" :key="tick.y"><path :d="`M36 ${tick.y}H316`" stroke="#28506f" stroke-dasharray="3 4" /><text x="29" :y="tick.y + 3" text-anchor="end">{{ tick.label }}</text></g>
            <path :d="`M36 ${trend.targetY}H316`" stroke="#d7b77b" stroke-dasharray="5 4" opacity=".8" />
            <polyline :points="trend.points" fill="none" stroke="#66d1ff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
            <text x="36" y="106">−{{ trendWindow }} min</text><text x="316" y="106" text-anchor="end">当前 / {{ trend.unit }}</text>
          </svg>
        </div>
        <div class="process-event"><span>最近记录</span><p><time>{{ updateTime }}</time><i />{{ processMetrics[0]?.label }} {{ processMetrics[0]?.value }} {{ processMetrics[0]?.unit }} · 参数更新</p></div>
        <footer class="process-card-foot"><i /> 设备 {{ cardDevice.id }} · {{ processScope }}</footer>
      </section>
    </div>
    <button v-if="metricsEnabled && !state && modelAnchor" ref="parameterButton" type="button" class="equipment-parameters" :aria-expanded="cardOpen" @click="openCard">点击设备查看工艺参数</button>
    <button v-if="url && !state" class="equipment-reset" @click="resetCamera()">复位视角</button>
  </div>
</template>
<style scoped>
.process-event p{line-height:1.6}

.equipment-model-stage{position:absolute;inset:0;background:radial-gradient(ellipse at 42% 32%,#193b52 0,#0d263c 48%,#06182d 82%,#031020 100%)}
.equipment-model-canvas{position:absolute;inset:0}.equipment-model-canvas :deep(canvas){width:100%;height:100%;display:block;touch-action:none}.equipment-reset{position:absolute;bottom:16px;left:16px;padding:7px 12px;border:1px solid #39779b;background:#092b47d9;color:#bde7ff;cursor:pointer;font-size:12px}
.equipment-process-metrics{position:absolute;inset:0;pointer-events:none;z-index:2}.metric-leaders{position:absolute;inset:0;width:100%;height:100%;overflow:hidden}.metric-leaders path{stroke:#74c9eb;stroke-width:1;fill:none;opacity:.75}.metric-leaders circle{fill:#9be7ff;stroke:#25546c;stroke-width:2}
.equipment-process-card{position:absolute;width:366px;max-height:calc(100% - 54px);overflow:auto;overscroll-behavior:contain;scrollbar-width:thin;scrollbar-color:#285c7f #071b30;pointer-events:auto;border:1px solid #3884af;background:linear-gradient(135deg,rgba(8,35,64,.98),rgba(3,18,37,.98));box-shadow:0 8px 32px #00122599,inset 0 0 30px #0e4d791c}
.process-card-title{height:41px;padding:0 9px 0 14px;display:flex;align-items:center;justify-content:space-between;font-size:15px;font-weight:500;color:#b9ddfa;background:linear-gradient(90deg,#144a838c,transparent);border-bottom:1px solid #2a7abe59;position:sticky;top:0;z-index:1;backdrop-filter:blur(10px)}.process-card-title>span:before{content:'';display:inline-block;width:6px;height:6px;margin-right:9px;background:#34b5ff;transform:rotate(45deg)}.process-card-title button{width:32px;height:32px;border:0;background:transparent;color:#97bfd8;font-size:24px;cursor:pointer}.process-card-title button:hover{background:#1c5177;color:#e0f4ff}.process-card-title button:focus-visible,.equipment-parameters:focus-visible,.process-trend button:focus-visible{outline:2px solid #72d7ff;outline-offset:-2px}
.process-task{padding:11px 15px 10px;border-bottom:1px solid #22517870;display:flex;align-items:center;flex-wrap:wrap;justify-content:space-between;background:#0b2b4566}.process-task>div{display:flex;align-items:center;gap:10px}.process-task small{font-size:10px;color:#87a9c1}.process-task strong{font-size:14px;font-weight:500;color:#d1e7f7}.process-task p{width:100%;margin:8px 0 0;font-size:10px;color:#7895b4}.process-task b{font-weight:400;color:#a7c6dd;margin-left:8px;letter-spacing:.6px}
.process-card-values{padding:0 15px}.parameter-row{padding:7px 0;border-bottom:1px solid #22517855}.parameter-row:last-child{border-bottom:0}.parameter-main,.parameter-context{display:flex;align-items:baseline;justify-content:space-between}.parameter-main>span{font-size:13px;color:#b6d2e6}.parameter-main strong{font-size:24px;line-height:1.15;font-weight:500;color:#76d5ff;font-variant-numeric:tabular-nums}.parameter-main small{display:inline-block;min-width:28px;margin-left:6px;font-size:11px;color:#9bbdd3;font-weight:400}.parameter-context{margin-top:4px;font-size:10px;color:#87a5bc}.parameter-context>span:last-child{color:#77b6b9}.parameter-rail{position:relative;margin-top:6px;height:3px;background:#1b364d}.parameter-rail>span{position:absolute;top:0;height:3px;background:#2d7a7299}.parameter-rail>i{position:absolute;top:-3px;height:9px;width:3px;background:#81d6ff;box-shadow:0 0 5px #5acbff66}
.process-trend{margin:3px 15px 0;padding-top:9px;border-top:1px solid #22517870}.trend-toolbar{display:flex;justify-content:space-between;align-items:center}.parameter-tabs,.window-tabs{display:flex;gap:3px}.process-trend button{border:1px solid transparent;background:transparent;color:#7895b4;font-size:11px;padding:4px 8px;cursor:pointer}.process-trend button.active{color:#a6e5ff;border-color:#28698e;background:#12436a88}.window-tabs button{font-size:10px;padding:4px 6px}.trend-legend{display:flex;gap:14px;margin:8px 0 2px;font-size:9px;color:#87a5bc}.trend-legend span{display:flex;align-items:center;gap:4px}.trend-legend i{display:inline-block;width:10px;height:2px;background:#66d1ff}.trend-legend i.target{background:#d7b77b}.trend-legend i.band{height:6px;background:#2c927a66}.process-trend svg{display:block;width:100%;height:88px;overflow:visible}.process-trend svg text{fill:#87a5bc;font-size:9px}
.process-event{padding:9px 15px;border-top:1px solid #22517870}.process-event>span{font-size:11px;color:#a8c8dd}.process-event small{font-size:9px;color:#7895b4;margin-left:5px}.process-event p{display:flex;align-items:center;gap:7px;margin:7px 0 0;font-size:10px;color:#93b1c7}.process-event time{font-size:9px;color:#7895b4}.process-event p i{width:4px;height:4px;border-radius:50%;background:#6ec3e8;flex-shrink:0}.process-card-foot{padding:8px 15px;border-top:1px solid #22517870;color:#7895b4;font-size:10px}.process-card-foot i{display:inline-block;width:5px;height:5px;margin-right:5px;border-radius:50%;background:#d2b074}
.equipment-parameters{position:absolute;bottom:16px;left:105px;border:1px solid #285c7f;background:#092b47d9;color:#9dc9e4;padding:7px 12px;font-size:12px;cursor:pointer}.equipment-parameters:hover{background:#12466a}
.device-labels{position:absolute;inset:0;pointer-events:none;z-index:1}.device-labels button{white-space:nowrap;position:absolute;transform:translate(-50%,-100%);pointer-events:auto;border:1px solid #39779b;background:#061b30e8;color:#a8cee5;padding:6px 10px;cursor:pointer;font-size:12px}.device-labels button.selected{border-color:#79d8e3;color:#d2f5ff;background:#0d3a54e8}.device-labels button i{display:inline-block;width:5px;height:5px;background:#70cfe7;border-radius:50%;margin-right:6px}.device-labels small{display:block;font-size:9px;color:#83a8bf;margin-top:3px}.process-card-title>span{font-size:13px}
</style>
