<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import ScreenFrame from '../components/ScreenFrame.vue'
import modelUrl from '../../experiments/equipment-04-rice-steamer/model/rice-steamer.glb?url'

const host = ref<HTMLDivElement>()
const mode = ref<'process' | 'equipment'>('process')
const lighting = ref<'studio' | 'cool'>('cool')
const fault = ref(false)
const selected = ref('temperature')
const status = ref('正在载入蒸饭机模型…')
const showLabels = ref(true)
const ready = ref(false)
const view = ref('overview')
const points = ref<{ id: string; x: number; y: number; visible: boolean }[]>([])
const processMetrics = [
  { id: 'temperature', label: '蒸制温度', value: '98.2', unit: '°C', range: '参考区间 96–100 °C', detail: '观察温度是否持续处于工艺窗口内。测点位置为界面示意，待实际传感器位置确认。', series: [97.4,97.8,98.0,97.9,98.1,98.3,98.0,98.2,98.1,98.2,98.3,98.2] },
  { id: 'infeed', label: '进料流量', value: '2.40', unit: 't/h', range: '参考区间 2.2–2.6 t/h', detail: '查看进料连续性与波动。定位到模型预留的进料接口，数值与参考区间均为模拟。', series: [2.32,2.36,2.4,2.38,2.41,2.39,2.42,2.4,2.38,2.4,2.41,2.4] },
  { id: 'outfeed', label: '处理时间', value: '32.0', unit: 'min', range: '参考区间 30–35 min', detail: '结合进出料记录观察处理时间。出料接口仅作为此指标的展示锚点，不代表计时传感器。', series: [31.5,31.6,31.8,31.9,32,32.1,32,32.2,32.1,32,32,32] },
]
const equipmentMetrics = computed(() => [
  { id: 'drive', label: '驱动电流', value: fault.value ? '18.6' : '12.4', unit: 'A', range: '演示阈值 ≤ 16 A', detail: fault.value ? '模拟驱动电流超过演示阈值。已标记外部驱动总成；实际故障原因需结合现场检查确认。' : '外部驱动总成的模拟电流。点击模型或测点可以定位，当前未连接设备采集系统。', series: fault.value ? [12.1,12.5,12.2,12.4,12.6,13.2,14,15.5,16.8,18.2,18.5,18.6] : [12.1,12.3,12.2,12.4,12.6,12.3,12.4,12.5,12.2,12.4,12.3,12.4] },
  { id: 'temperature', label: '运行时长', value: '6.8', unit: 'h', range: '本班次累计 · 模拟', detail: '展示当前班次的累计运行时间。此指标属于整台设备，不对应局部传感器。', series: [5.7,5.8,5.9,6,6.1,6.2,6.3,6.4,6.5,6.6,6.7,6.8] },
  { id: 'speed', label: '驱动转速', value: '24', unit: 'rpm', range: '演示设定 24 rpm', detail: '展示驱动转速的模拟读数。机构保持静态，模型尚未核实真实传动关系与运行节拍。', series: [24,24,24,24,24,24,24,24,24,24,24,24] },
])
const metrics = computed(() => mode.value === 'process' ? processMetrics : equipmentMetrics.value)
const active = computed(() => metrics.value.find(m => m.id === selected.value) ?? metrics.value[0]!)
const isAlert = computed(() => mode.value === 'equipment' && fault.value && active.value.id === 'drive')
const chart = computed(() => {
  const values = active.value.series
  const min = Math.min(...values), max = Math.max(...values), spread = Math.max(max - min, .2)
  return values.map((n, i) => `${12 + i * 24},${87 - (n - min) / spread * 52}`).join(' ')
})
let renderer: THREE.WebGLRenderer | undefined
let scene: THREE.Scene | undefined
let camera: THREE.PerspectiveCamera | undefined
let controls: OrbitControls | undefined
let model: THREE.Group | undefined
let environment: THREE.WebGLRenderTarget | undefined
let observer: ResizeObserver | undefined
let frame = 0
let disposed = false
let sceneCenter = new THREE.Vector3()
let modelSize = new THREE.Vector3()
const anchors = new Map<string, THREE.Vector3>()
const driveMeshes: THREE.Mesh[] = []
const raycaster = new THREE.Raycaster()
const pointer = new THREE.Vector2()
let down = { x: 0, y: 0 }

function render() {
  frame = 0
  if (!renderer || !scene || !camera || !host.value) return
  renderer.render(scene, camera)
  const w = host.value.clientWidth, h = host.value.clientHeight
  points.value = metrics.value.filter(m => m.id !== 'speed').map(m => {
    const p = (anchors.get(m.id) ?? sceneCenter).clone().project(camera!)
    return { id: m.id, x: (p.x * .5 + .5) * w, y: (-p.y * .5 + .5) * h, visible: p.z > -1 && p.z < 1 && Math.abs(p.x) < .95 && Math.abs(p.y) < .85 }
  })
}
function requestRender() { if (!frame && !disposed) frame = requestAnimationFrame(render) }
function setView(preset: string) {
  if (!camera || !controls || !model) return
  view.value = preset
  const target = sceneCenter.clone()
  let offset = new THREE.Vector3(1.15, .82, 1.05)
  if (host.value) { camera.aspect = host.value.clientWidth / Math.max(1, host.value.clientHeight); camera.updateProjectionMatrix() }
  const aspect = Math.max(camera.aspect, .3)
  const halfFov = Math.atan(Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * Math.min(aspect, 1))
  const distance = modelSize.length() * .50 / Math.sin(halfFov)
  controls.maxDistance = Math.max(60, distance * 2)
  let scale = distance
  if (preset === 'side') offset.set(1, .38, .05)
  if (preset === 'top') offset.set(.01, 1, .01)
  if (preset === 'drive') { target.copy(anchors.get('drive') ?? sceneCenter); offset.set(1, .6, -.8); scale = 5.6 }
  camera.position.copy(target).add(offset.normalize().multiplyScalar(scale))
  controls.target.copy(target)
  controls.update()
  requestRender()
}
function choose(id: string, focus = false) {
  selected.value = id
  if (focus && id === 'drive') setView('drive')
  requestRender()
}
function updateFault() {
  for (const mesh of driveMeshes) {
    for (const mat of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
      if (mat instanceof THREE.MeshStandardMaterial) {
        mat.emissive.set(fault.value && mode.value === 'equipment' ? '#fb6c42' : '#000000')
        mat.emissiveIntensity = .32
      }
    }
  }
  requestRender()
}
function toggleFault() {
  fault.value = !fault.value
  if (fault.value) { selected.value = 'drive'; setView('drive') }
  else setView('overview')
}
function applyLighting() {
  if (!scene || !renderer) return
  scene.environmentIntensity = lighting.value === 'studio' ? .7 : .32
  renderer.toneMappingExposure = lighting.value === 'studio' ? 1 : .95
  scene.background = null
  scene.fog = new THREE.Fog('#06172e', 26, 85)
  requestRender()
}
function pointerDown(event: PointerEvent) { down = { x: event.clientX, y: event.clientY } }
function pointerUp(event: PointerEvent) {
  if (!renderer || !camera || !model || Math.hypot(event.clientX - down.x, event.clientY - down.y) > 5) return
  const rect = renderer.domElement.getBoundingClientRect()
  pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1)
  raycaster.setFromCamera(pointer, camera)
  const hit = raycaster.intersectObject(model, true)[0]
  if (!hit) return
  if (mode.value === 'equipment') { if (driveMeshes.includes(hit.object as THREE.Mesh)) choose('drive', true); else choose('temperature'); return }
  const nearest = [...anchors.entries()].filter(([key]) => metrics.value.some(m => m.id === key)).sort((a,b) => a[1].distanceTo(hit.point) - b[1].distanceTo(hit.point))[0]
  if (nearest) choose(nearest[0])
}
function disposeObject(root: THREE.Object3D) {
  root.traverse(obj => {
    if (!(obj instanceof THREE.Mesh)) return
    obj.geometry.dispose()
    for (const mat of Array.isArray(obj.material) ? obj.material : [obj.material]) {
      Object.values(mat).forEach(v => { if (v instanceof THREE.Texture) v.dispose() })
      mat.dispose()
    }
  })
}
onMounted(() => {
  if (!host.value) return
  try {
    scene = new THREE.Scene()
    camera = new THREE.PerspectiveCamera(38, 1, .05, 200)
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75))
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.toneMapping = THREE.AgXToneMapping
    renderer.setClearColor(0x06172e, 0)
    host.value.appendChild(renderer.domElement)
    const pmrem = new THREE.PMREMGenerator(renderer)
    const room = new RoomEnvironment()
    environment = pmrem.fromScene(room, .04)
    scene.environment = environment.texture
    room.dispose(); pmrem.dispose()
    const key = new THREE.DirectionalLight('#b5d4ff', 1.4)
    key.position.set(7, 12, 5); key.castShadow = true
    key.shadow.mapSize.set(2048, 2048)
    Object.assign(key.shadow.camera, { left: -13, right: 13, top: 13, bottom: -13, near: .1, far: 60 })
    key.shadow.normalBias = .025; key.shadow.bias = -.00015
    scene.add(key)
    const fill = new THREE.DirectionalLight('#a4c9e5', .9)
    fill.position.set(-7, 5, -6); scene.add(fill)
    const grid = new THREE.GridHelper(100, 100, '#286fa6', '#183d64')
    grid.position.y = -.42
    const gridMat = grid.material as THREE.Material
    gridMat.transparent = true; gridMat.opacity = .48
    scene.add(grid)
    controls = new OrbitControls(camera, renderer.domElement)
    controls.minDistance = 2; controls.maxDistance = 42; controls.maxPolarAngle = Math.PI / 2 - .035
    controls.addEventListener('change', requestRender)
    renderer.domElement.addEventListener('pointerdown', pointerDown)
    renderer.domElement.addEventListener('pointerup', pointerUp)
    observer = new ResizeObserver(() => {
      if (!host.value || !renderer || !camera) return
      const { clientWidth: w, clientHeight: h } = host.value
      renderer.setSize(w, h); camera.aspect = w / Math.max(1,h); camera.updateProjectionMatrix(); if (ready.value) setView(view.value); requestRender()
    })
    observer.observe(host.value)
    applyLighting()
    new GLTFLoader().load(modelUrl, gltf => {
      if (disposed) { disposeObject(gltf.scene); return }
      model = gltf.scene
      scene!.add(model)
      model.traverse(obj => { if (obj instanceof THREE.Mesh) { obj.castShadow = true; obj.receiveShadow = true } })
      const bounds = new THREE.Box3().setFromObject(model)
      bounds.getCenter(sceneCenter); bounds.getSize(modelSize)
      // A bounded site slab, like the campus model, sits above the surrounding digital grid.
      const slab = new THREE.Mesh(
        new THREE.BoxGeometry(modelSize.x + 2.2, .34, modelSize.z + 2.2),
        new THREE.MeshStandardMaterial({ color: '#11283e', roughness: .82, metalness: .18 }),
      )
      slab.position.set(sceneCenter.x, bounds.min.y - .19, sceneCenter.z)
      slab.receiveShadow = true; scene!.add(slab)
      const edge = new THREE.LineSegments(new THREE.EdgesGeometry(slab.geometry), new THREE.LineBasicMaterial({ color: '#397aa7', transparent: true, opacity: .65 }))
      edge.position.copy(slab.position); scene!.add(edge)

      const anchor = (name: string, fallback: THREE.Vector3) => model!.getObjectByName(name)?.getWorldPosition(new THREE.Vector3()) ?? fallback
      anchors.set('infeed', anchor('PORT_CONVEYOR_IN', sceneCenter.clone()))
      anchors.set('outfeed', anchor('PORT_CONVEYOR_OUT', sceneCenter.clone()))
      anchors.set('temperature', sceneCenter.clone().add(new THREE.Vector3(0, modelSize.y * .35, 0)))
      const drive = model.getObjectByName('06_DriveFixed') ?? model.getObjectByName('Motor_casing')
      if (drive) {
        anchors.set('drive', new THREE.Box3().setFromObject(drive).getCenter(new THREE.Vector3()))
        drive.traverse(obj => {
          if (obj instanceof THREE.Mesh) {
            obj.material = Array.isArray(obj.material) ? obj.material.map(m => m.clone()) : obj.material.clone()
            driveMeshes.push(obj)
          }
        })
      } else anchors.set('drive', sceneCenter.clone())
      status.value = ''; ready.value = true; setView('overview'); updateFault()
    }, undefined, () => { status.value = '模型加载失败，请刷新页面重试。' })
  } catch { status.value = '当前浏览器无法启动 3D 渲染，请使用支持 WebGL 的浏览器。' }
})
watch(mode, () => { selected.value = mode.value === 'process' ? 'temperature' : 'drive'; updateFault(); setView('overview') })
watch(lighting, applyLighting)
watch(fault, updateFault)
onBeforeUnmount(() => {
  disposed = true; cancelAnimationFrame(frame); observer?.disconnect(); controls?.dispose()
  renderer?.domElement.removeEventListener('pointerdown', pointerDown)
  renderer?.domElement.removeEventListener('pointerup', pointerUp)
  if (scene) { disposeObject(scene); scene.traverse(obj => { if (obj instanceof THREE.LineSegments) { obj.geometry.dispose(); (obj.material as THREE.Material).dispose() } }); }
  environment?.dispose(); renderer?.dispose()
})
</script>

<template>
  <ScreenFrame>
  <main class="steamer-lab">
    <header class="lab-header">
      <a href="#/" class="lab-brand"><span>会稽山绍兴酒<small>HUIJISHAN · SHAOXING WINE</small></span></a>
      <div class="lab-title"><h1>会稽山园区数字孪生运营中心</h1><span class="eyebrow">HUIJISHAN · DIGITAL TWIN OPERATIONS CENTER</span></div>
      <span class="demo-badge">模拟数据 · 未接入现场</span>
    </header>
    <nav class="lab-nav" aria-label="实验主题"><div class="mode-switch"><button :class="{ active: mode === 'process' }" :aria-pressed="mode === 'process'" @click="mode = 'process'">工艺参数</button><button :class="{ active: mode === 'equipment' }" :aria-pressed="mode === 'equipment'" @click="mode = 'equipment'">设备运行</button></div><span>酿造车间 <b>/</b> 浸米蒸煮 <b>/</b> 蒸饭机 01</span><a href="#/park/huijishan">返回园区 ↗</a></nav>
    <section class="lab-workspace">
      <aside class="lab-left">
        <div class="section-heading"><span class="eyebrow">{{ mode === 'process' ? 'PROCESS CONTEXT' : 'ASSET OVERVIEW' }}</span><h2>{{ mode === 'process' ? '当前工段' : '设备档案' }}</h2></div>
        <div class="asset-card"><span class="asset-icon">▤</span><span class="pill" :class="{ warn: fault }">{{ fault ? '模拟异常' : '模拟运行' }}</span><h3>连续式蒸饭机</h3><p>EQ-RICE-004</p><div class="asset-divider"></div><dl><div><dt>所属工段</dt><dd>浸米蒸煮</dd></div><div><dt>{{ mode === 'process' ? '演示批次' : '模型版本' }}</dt><dd>{{ mode === 'process' ? 'DEMO-1016-A' : 'v0.1.1 · 静态' }}</dd></div><div><dt>{{ mode === 'process' ? '批次状态' : '数据连接' }}</dt><dd>{{ mode === 'process' ? '加工中（模拟）' : '未连接' }}</dd></div></dl></div>
        <div class="left-note"><span class="eyebrow">{{ mode === 'process' ? 'MATERIAL FLOW' : 'INSPECTION' }}</span><h3>{{ mode === 'process' ? '物料处理路径' : '运行观察' }}</h3><ol v-if="mode === 'process'" class="flow-list"><li><i>01</i><div>进料接入<small>进料口 · 模型接口</small></div></li><li class="current"><i>02</i><div>蒸制处理<small>箱体测点 · 位置示意</small></div></li><li><i>03</i><div>出料交接<small>出料口 · 模型接口</small></div></li></ol><div v-else class="inspection-list"><p><span>驱动总成</span><b :class="{ amber: fault }">{{ fault ? '模拟过流' : '模拟正常' }}</b></p><p><span>机构动画</span><b>静态展示</b></p><p><span>现场核验</span><b>待确认</b></p></div></div>
        <div class="lab-note"><span>实验说明</span><p>验证模型观感与信息组织。参数、阈值、趋势及事件均为模拟；尺寸与测点需现场标定。</p></div>
      </aside>
      <section class="stage-shell" aria-label="蒸饭机交互模型">
        <div ref="host" class="model-host"></div>
        <div class="stage-vignette"></div>
        <div class="stage-kpis"><div><span>当前工段</span><strong>浸米蒸煮</strong></div><div><span>关联设备</span><strong>01 <small>台</small></strong></div><div><span>蒸制温度 · 模拟</span><strong>98.2 <small>°C</small></strong></div><div><span>进料流量 · 模拟</span><strong>2.40 <small>t/h</small></strong></div></div>
        <div class="stage-heading"><span class="eyebrow">{{ mode === 'process' ? 'PROCESS TWIN' : 'EQUIPMENT TWIN' }}</span><h2>{{ mode === 'process' ? '生产工艺 · 蒸饭工段' : '设备运维 · 蒸饭机' }}</h2><p>{{ mode === 'process' ? '选择测点，查看工艺窗口与变化趋势' : '选择驱动总成，查看模拟运行与异常信息' }}</p></div>
        <div class="lighting-picker"><span>灯光</span><button :class="{ active: lighting === 'studio' }" :aria-pressed="lighting === 'studio'" @click="lighting = 'studio'">柔光棚拍</button><button :class="{ active: lighting === 'cool' }" :aria-pressed="lighting === 'cool'" @click="lighting = 'cool'">大屏夜景</button></div>
        <div v-if="status" class="loading-state" role="status">{{ status }}</div>
        <div v-if="ready && showLabels" class="anchor-layer"><template v-for="point in points" :key="point.id"><button v-if="point.visible" class="model-anchor" :class="{ selected: selected === point.id, alert: fault && mode === 'equipment' && point.id === 'drive' }" :style="{ left: `${point.x}px`, top: `${point.y}px` }" :aria-pressed="selected === point.id" @click="choose(point.id, point.id === 'drive')"><i></i><span><small>{{ metrics.find(m => m.id === point.id)?.label }}</small><b>{{ metrics.find(m => m.id === point.id)?.value }} <em>{{ metrics.find(m => m.id === point.id)?.unit }}</em></b></span></button></template></div>
        <div class="stage-bottom"><span>拖动旋转 · 滚轮缩放<br><small>接口定位 / 参数示意</small></span><div class="camera-tools" aria-label="相机视角"><button :disabled="!ready" :class="{ active: view === 'overview' }" @click="setView('overview')">全景</button><button :disabled="!ready" :class="{ active: view === 'side' }" @click="setView('side')">侧视</button><button :disabled="!ready" :class="{ active: view === 'top' }" @click="setView('top')">俯视</button><button :aria-pressed="showLabels" @click="showLabels = !showLabels">{{ showLabels ? '隐藏标注' : '显示标注' }}</button></div></div>
      </section>
      <aside class="lab-right">
        <div class="section-heading"><span class="eyebrow">{{ mode === 'process' ? 'KEY PARAMETERS' : 'OPERATING CONDITION' }}</span><h2>{{ mode === 'process' ? '关键工艺参数' : '设备运行情况' }}<span>模拟快照</span></h2></div>
        <div class="metric-list"><button v-for="metric in metrics" :key="metric.id" class="metric-card" :class="{ active: selected === metric.id, warning: fault && mode === 'equipment' && metric.id === 'drive' }" :aria-pressed="selected === metric.id" @click="choose(metric.id, metric.id === 'drive')"><span class="metric-title">{{ metric.label }}<span>↗</span></span><strong>{{ metric.value }}<small>{{ metric.unit }}</small></strong><span class="metric-range">{{ metric.range }}</span></button></div>
        <div class="trend-panel"><div class="trend-title"><h3>{{ active.label }}趋势</h3><span>模拟 30 分钟</span></div><svg viewBox="0 0 288 115" role="img" :aria-label="`${active.label}模拟趋势，当前 ${active.value} ${active.unit}，曲线按数据范围自适应`"><path d="M12 25H276 M12 55H276 M12 85H276" stroke="#2c414b" stroke-dasharray="3 5" fill="none"/><polygon :points="`12,100 ${chart} 276,100`" :fill="isAlert ? '#f2a35c12' : '#43baff12'"/><polyline :points="chart" fill="none" :stroke="isAlert ? '#f2a35c' : '#62c9ff'" stroke-width="2.5"/><text x="12" y="113">-30 min</text><text x="245" y="113">当前</text></svg><div class="trend-caption">{{ Math.min(...active.series).toFixed(1) }}–{{ Math.max(...active.series).toFixed(1) }} {{ active.unit }} · 自适应纵轴</div><p>{{ active.detail }}</p></div>
        <div v-if="mode === 'equipment'" class="fault-panel"><button class="fault-toggle" :aria-pressed="fault" :disabled="!ready" @click="toggleFault">{{ fault ? '清除模拟故障' : '演示驱动过流故障' }}<span>→</span></button><p role="status">{{ fault ? '演示事件 E-001 · 驱动电流超限，已定位驱动总成。' : '开启后查看部件高亮、告警数值与趋势变化。' }}</p></div>
      </aside>
    </section>
    <footer class="lab-footer"><div><span class="eyebrow">{{ mode === 'process' ? 'PROCESS SEQUENCE' : 'DEMO EVENT LOG' }}</span><strong>{{ mode === 'process' ? '工段上下文' : '设备事件' }}</strong></div><div v-if="mode === 'process'" class="sequence"><span>01 原料准备</span><i>→</i><b>02 浸米蒸煮 <small>当前实验</small></b><i>→</i><span>03 糖化发酵</span><i>→</i><span>04 压榨过滤</span></div><div v-else class="event-line"><i :class="{ warn: fault }"></i><span>{{ fault ? '模拟故障已触发 · 驱动电流 18.6 A / 演示阈值 16 A' : '当前模拟快照 · 无活动故障' }}</span><button :disabled="!ready" @click="choose('drive', true)">定位驱动总成 ↗</button></div><span class="footer-note">单机实验 · 非完整产线</span></footer>
  </main>
  </ScreenFrame>
</template>

<style scoped>
.steamer-lab{--ink:#e7eeeF;--muted:#94aab5;--line:#293e49;--mint:#94d5c8;height:100dvh;overflow:auto;display:flex;flex-direction:column;background:#101d26;color:var(--ink);font-family:Inter,"PingFang SC","Microsoft YaHei",sans-serif;font-size:13px;padding:0 26px;box-sizing:border-box}.steamer-lab *{box-sizing:border-box}.steamer-lab button,.steamer-lab a{font:inherit;color:inherit}.steamer-lab button{cursor:pointer;transition:background .18s,border-color .18s;background:none}.steamer-lab button:hover{background:#29414d}.steamer-lab button:focus-visible,.steamer-lab a:focus-visible{outline:2px solid #c9e9dc;outline-offset:3px}.steamer-lab button:disabled{opacity:.4;cursor:wait}.steamer-lab a{text-decoration:none}.steamer-lab h1,.steamer-lab h2,.steamer-lab h3,.steamer-lab p{margin:0}.lab-header{height:90px;flex-shrink:0;display:flex;align-items:center;border-bottom:1px solid var(--line);gap:42px}.lab-brand{display:flex;align-items:center;gap:12px;min-width:240px;font-size:23px;letter-spacing:4px;color:#e0cda5!important}.brand-seal{display:grid;place-items:center;width:38px;height:44px;border:1px solid #bda77f;font:25px serif}.lab-brand small{display:block;font-size:8px;letter-spacing:1.5px;margin-top:6px}.eyebrow{font-size:10px;letter-spacing:2px;color:var(--muted);font-weight:500}.lab-title h1{font-size:21px;font-weight:500;letter-spacing:1px;margin-top:7px}.demo-badge{margin-left:auto;border:1px solid #62533c;color:#ddc39b;border-radius:4px;padding:7px 10px;font-size:11px;white-space:nowrap}.lab-nav{height:70px;display:flex;align-items:center;gap:28px;flex-shrink:0}.mode-switch{padding:4px;display:flex;background:#0b161e;border:1px solid var(--line);border-radius:6px}.mode-switch button{border:0;padding:10px 24px;border-radius:3px;color:var(--muted)}.mode-switch button.active{background:#29423f;color:#c8eadc}.lab-nav>span{color:var(--muted);font-size:12px}.lab-nav b{margin:0 12px;color:#536a77;font-weight:400}.lab-nav>a{margin-left:auto;color:var(--muted);font-size:12px}.lab-workspace{display:grid;grid-template-rows:minmax(0,1fr);grid-template-columns:218px minmax(0,1fr) 294px;flex:1;min-height:590px;border:1px solid var(--line);border-radius:8px;overflow:hidden}.lab-left,.lab-right{min-height:0;overflow:auto;background:#14232c;padding:22px 18px}.lab-left{border-right:1px solid var(--line);display:flex;flex-direction:column}.lab-right{border-left:1px solid var(--line);padding:22px 18px 15px}.section-heading{margin-bottom:22px}.section-heading h2{font-size:16px;font-weight:500;margin-top:8px;display:flex;justify-content:space-between;align-items:center}.section-heading h2>span{font-size:10px;color:var(--muted)}.asset-card{padding:16px 14px;border:1px solid #344953;border-radius:5px;background:linear-gradient(145deg,#21343e,#182a33)}.asset-icon{font-size:25px;color:#c9d8d7}.pill{float:right;font-size:10px;padding:4px 6px;border:1px solid #3f6a61;color:var(--mint);border-radius:3px}.pill.warn{color:#efb575;border-color:#8c6440}.asset-card h3{font-size:16px;margin-top:15px;font-weight:500}.asset-card>p{font-size:11px;color:var(--muted);letter-spacing:1px;margin-top:7px}.asset-divider{height:1px;background:var(--line);margin:20px 0 14px}.asset-card dl{margin:0}.asset-card dl>div{display:flex;justify-content:space-between;margin:12px 0;font-size:11px}.asset-card dt{color:var(--muted)}.asset-card dd{margin:0}.left-note{margin-top:30px}.left-note h3{font-size:13px;font-weight:500;margin-top:9px}.flow-list{padding:0;margin:20px 0;list-style:none}.flow-list li{display:flex;align-items:center;gap:12px;position:relative;padding-bottom:25px;color:#a7bac3}.flow-list li:not(:last-child):after{content:'';position:absolute;left:13px;top:29px;bottom:2px;width:1px;background:#3b5059}.flow-list i{font-style:normal;font-size:10px;border:1px solid #47616b;border-radius:50%;width:27px;height:27px;display:grid;place-items:center}.flow-list .current{color:#c4e8dc}.flow-list .current i{background:#305a52;border-color:#82b8a9}.flow-list small{display:block;color:var(--muted);font-size:10px;margin-top:5px}.lab-note{margin-top:auto;padding-top:20px;border-top:1px solid var(--line)}.lab-note>span{color:#c9b48d;font-size:11px}.lab-note p{font-size:11px;line-height:1.9;color:var(--muted);margin-top:8px}.stage-shell{position:relative;overflow:hidden;background:#172630;min-height:0}.model-host{position:absolute;inset:0}.model-host :deep(canvas){display:block;width:100%;height:100%;touch-action:none}.stage-heading{position:absolute;z-index:1;text-shadow:0 1px 8px #0008;padding:10px 12px;background:#12232bbf;border-radius:4px;top:25px;left:25px;pointer-events:none}.stage-heading h2{font-size:19px;font-weight:400;margin:10px 0}.stage-heading p{font-size:11px;color:var(--muted)}.lighting-picker{position:absolute;right:18px;top:122px;display:flex;align-items:center;gap:4px;font-size:10px;padding:4px;background:#101f29d9;border:1px solid #3a4c56;border-radius:4px}.lighting-picker>span{margin:0 6px;color:var(--muted)}.lighting-picker button{border:0;padding:6px 8px;border-radius:2px;color:#adbdc4}.lighting-picker button.active{background:#3b5059;color:#edf4f3}.loading-state{position:absolute;top:50%;left:0;right:0;text-align:center;color:#bfd4d7}.anchor-layer{position:absolute;inset:0;pointer-events:none}.model-anchor{position:absolute;transform:translate(-9px,-50%);display:flex;align-items:center;gap:8px;pointer-events:auto;border:0;padding:0!important;background:transparent!important;text-align:left;white-space:nowrap}.model-anchor>i{width:14px;height:14px;border:3px solid #b3e2d4;background:#30534d;border-radius:50%;box-shadow:0 0 0 5px #9be0cb20;flex-shrink:0}.model-anchor>span{padding:8px 11px;background:#0e202be8;border:1px solid #50666d;border-radius:4px;box-shadow:0 4px 18px #0004}.model-anchor.selected>span{border-color:#a2d5c6;background:#203a3aeF}.model-anchor small{display:block;color:#b8cbd1;font-size:10px;margin-bottom:3px}.model-anchor b{font-size:16px;font-weight:500;font-variant-numeric:tabular-nums}.model-anchor em{font-size:10px;font-style:normal;color:#b8cbd1}.model-anchor.alert>span{border-color:#edab70}.model-anchor.alert>i{border-color:#edab70;background:#7e4829}.stage-bottom{position:absolute;bottom:19px;left:22px;right:22px;display:flex;justify-content:space-between;align-items:end;pointer-events:none}.stage-bottom>span{font-size:10px;color:#becbd0;line-height:1.9}.stage-bottom small{color:#93aab5}.camera-tools{display:flex;padding:4px;background:#10212be8;border:1px solid #3c525e;border-radius:5px;pointer-events:auto}.camera-tools button{font-size:11px;border:0;padding:9px 10px;border-radius:3px;color:#b5c8d0}.camera-tools button.active{background:#354d56;color:white}.metric-list{display:grid;gap:8px}.metric-card{display:block;min-height:0;height:auto;box-shadow:none;border:1px solid var(--line);border-radius:5px;padding:9px 14px;text-align:left;width:100%;background:#192b35!important}.metric-card.active{border-color:#74a79c;background:#203a3b!important}.metric-title{display:flex;justify-content:space-between;font-size:11px;color:#c9d7dc}.metric-title>span{color:#90b9b1}.metric-card strong{display:block;color:var(--ink);font-size:29px;font-weight:500;letter-spacing:.5px;line-height:1.3;margin:3px 0;font-variant-numeric:tabular-nums}.metric-card strong small{font-size:12px;margin-left:7px;font-weight:400;color:var(--muted)}.metric-range{font-size:10px;color:#a7bbbF}.metric-card.warning{border-color:#ac7747;background:#3b3028!important}.metric-card.warning strong{color:#f4ba7f}.trend-panel{margin-top:17px}.trend-title{display:flex;justify-content:space-between;align-items:center}.trend-title h3{font-size:12px;font-weight:500}.trend-title>span{font-size:10px;color:var(--muted)}.trend-panel svg{width:100%;margin-top:10px;overflow:visible}.trend-panel svg text{font-size:9px;fill:#9ab1bc}.trend-panel p{font-size:11px;line-height:1.8;color:var(--muted);margin-top:10px}.trend-caption{font-size:9px;color:#9ab1bc;margin-top:5px}.fault-panel{margin-top:14px}.fault-toggle{width:100%;padding:11px 12px;border:1px solid #976d46;border-radius:4px;color:#f2c28b!important;text-align:left;font-size:12px!important}.fault-toggle span{float:right}.fault-panel p{font-size:10px;line-height:1.7;color:var(--muted);margin-top:9px}.inspection-list{margin-top:20px}.inspection-list p{display:flex;justify-content:space-between;font-size:11px;padding:14px 0;border-bottom:1px solid var(--line)}.inspection-list span{color:var(--muted)}.inspection-list b{font-weight:400;color:#a8c8bf}.inspection-list b.amber{color:#efb575}.lab-footer{min-height:95px;display:flex;align-items:center;gap:30px;flex-shrink:0}.lab-footer>div:first-child{min-width:190px}.lab-footer strong{display:block;font-size:12px;font-weight:500;margin-top:8px}.sequence{display:flex;align-items:center;gap:22px;font-size:12px;color:#8fa5af}.sequence i{font-style:normal;color:#5a717d}.sequence b{font-weight:500;color:#c1e0d6;padding:12px 15px;border:1px solid #44645c;border-radius:4px;background:#213631}.sequence small{font-size:9px;color:#95b6ab;margin-left:8px}.footer-note{font-size:10px;color:#8b9fa9;margin-left:auto;white-space:nowrap}.event-line{display:flex;align-items:center;gap:12px;font-size:12px}.event-line i{width:6px;height:6px;border-radius:50%;background:#93c5b3}.event-line i.warn{background:#efb575}.event-line button{border:0;color:#b1d2c8;padding:10px;font-size:11px}
/* Match the existing 1920 × 1080 operations screen. */
.steamer-lab{--ink:#d5ebff;--muted:#7895b4;--line:#1765a5;--mint:#72d7ff;width:100%;height:100%;padding:0 16px 16px;overflow:hidden;background:radial-gradient(circle at 50% 42%,rgba(12,62,116,.34),transparent 42%),linear-gradient(rgba(8,31,58,.13) 1px,transparent 1px),linear-gradient(90deg,rgba(8,31,58,.13) 1px,transparent 1px),#020a18;background-size:auto,34px 34px,34px 34px,auto;font-size:16px}
.lab-header{height:105px;position:relative;justify-content:space-between;padding:0 26px;border-bottom:1px solid #1766a9;background:linear-gradient(180deg,rgba(2,10,25,.98),rgba(3,21,45,.55))}.lab-header:after{content:'';position:absolute;left:27%;right:27%;bottom:-5px;height:7px;background:linear-gradient(90deg,transparent,#35a8ff,#b9e9ff,#35a8ff,transparent);clip-path:polygon(0 0,10% 0,13% 65%,87% 65%,90% 0,100% 0,96% 100%,4% 100%)}
.steamer-lab .lab-brand{min-width:320px;font-size:30px;font-weight:700;letter-spacing:2px;color:#f4e7ca!important;text-shadow:0 0 16px #bf8f443d}.lab-brand small{font-size:10px;font-weight:400;letter-spacing:3px}.lab-title{position:absolute;left:50%;transform:translateX(-50%);text-align:center;white-space:nowrap}.lab-title h1{font-size:33px;color:#f2e8d4;letter-spacing:5px;font-weight:700;text-shadow:0 0 15px #c69b5952;margin:0 0 12px}.lab-title .eyebrow{font-size:10px;letter-spacing:4px;color:#ac9c78}.demo-badge{border:0;border-left:2px solid #b99659;background:#2f291d50;color:#cfbd96;border-radius:0;font-size:12px;padding:10px 14px}
.lab-nav{height:62px;gap:36px}.mode-switch{background:transparent;border:0;padding:0;gap:12px;border-radius:0}.mode-switch button{width:180px;height:38px;padding:0;clip-path:polygon(10% 0,90% 0,100% 100%,0 100%);border-radius:0;background:linear-gradient(90deg,transparent,#071c38db,transparent);color:#8caccc;font-size:16px}.mode-switch button.active{background:linear-gradient(90deg,#0a36634d,#0b3d70d9,#0a36634d);border-bottom:2px solid #c0a66b;color:#d7efff;text-shadow:0 0 8px #45adff}.lab-nav>span,.lab-nav>a{font-size:14px}
.lab-workspace{grid-template-columns:330px minmax(0,1fr) 330px;gap:10px;min-height:0;border:0;border-radius:0;overflow:visible}.lab-left,.lab-right{position:relative;background:linear-gradient(135deg,rgba(7,34,70,.82),rgba(2,15,33,.84));border:1px solid var(--line);padding:0 18px 18px;box-shadow:inset 0 0 24px #15558c17;clip-path:polygon(0 0,100% 0,100% calc(100% - 10px),calc(100% - 10px) 100%,0 100%)}.lab-left:before,.lab-right:before{content:'';position:absolute;top:0;right:0;width:24px;height:2px;background:#32a9ff;box-shadow:0 0 6px #249cff}.section-heading{margin:0 -18px 18px;padding:0 14px;height:42px;background:linear-gradient(90deg,#144a838c,transparent);border-bottom:1px solid #2a7abe59;display:flex;align-items:center}.section-heading>.eyebrow{display:none}.section-heading h2{font-size:17px;letter-spacing:1px;color:#b9ddfa;margin:0;width:100%;justify-content:flex-start;gap:9px}.section-heading h2:before{content:'';width:7px;height:7px;transform:rotate(45deg);background:#1a8eea;box-shadow:0 0 8px #32a8ff}.section-heading h2>span{margin-left:auto;font-size:10px}
.asset-card{background:linear-gradient(135deg,#0a2b4b,#05182f);border-color:#28547c;border-radius:0;padding:18px}.asset-card h3{font-size:20px}.asset-card>p{font-size:13px}.asset-card dl>div{font-size:14px;margin:17px 0}.asset-icon{color:#72bff2}.pill{font-size:12px;border-color:#2e797d;background:#12434a55;color:#81d7d0;border-radius:0}.left-note{margin-top:26px}.left-note h3{font-size:17px;color:#b9ddfa}.eyebrow{font-size:11px;letter-spacing:2px}.flow-list li{font-size:16px;gap:16px;padding-bottom:28px}.flow-list i{width:32px;height:32px;font-size:12px;border-color:#316ca0;color:#7fc9f6}.flow-list li:not(:last-child):after{left:16px;top:34px;background:#22517d}.flow-list .current{color:#bce7ff}.flow-list .current i{background:#125283;border-color:#37aaff}.flow-list small{font-size:12px;color:#7895b4}.lab-note p{font-size:12px}.lab-note>span{font-size:13px}.inspection-list p{font-size:14px;padding:17px 0}
.stage-shell{min-height:0;border:1px solid #204d71;background:radial-gradient(ellipse at 42% 32%,#193b52 0,#0d263c 48%,#06182d 82%,#031020 100%)}.stage-vignette{position:absolute;inset:0;pointer-events:none;box-shadow:inset 0 0 50px 12px #020b1b88}.stage-kpis{position:absolute;top:0;left:0;right:0;height:86px;display:grid;grid-template-columns:repeat(4,1fr);background:#041732d9;border-bottom:1px solid #1765a5}.stage-kpis>div{padding:14px 20px;border-right:1px solid #225f9661}.stage-kpis span{font-size:12px;color:#9bb6cf;display:block;margin-bottom:7px}.stage-kpis strong{font-size:25px;color:#6ac7ff;font-weight:500;letter-spacing:1px}.stage-kpis small{font-size:12px;color:#7d9bb8}.stage-heading{top:110px;left:26px;padding:0;background:none;border-radius:0}.stage-heading h2{font-size:22px;color:#c7e9ee;margin:8px 0;font-weight:500}.stage-heading p{font-size:12px;color:#87aeba}.stage-heading .eyebrow{font-size:10px;color:#77b0c0}.lighting-picker{top:105px;right:18px;border-color:#357ca5;border-radius:0;background:#03182deb;padding:0}.lighting-picker button{font-size:12px;padding:8px 10px;border-left:1px solid #265779;border-radius:0}.lighting-picker button.active{background:#165577;color:#e2f7ff}.stage-bottom{bottom:18px;left:20px;right:20px}.stage-bottom>span{font-size:12px}.camera-tools{border-color:#256b9f;background:#03152de6;border-radius:0}.camera-tools button{font-size:13px;padding:10px 14px;border-radius:0}.camera-tools button.active{background:#155577;color:#aeeaff}
.model-anchor>i{background:#8cdfeb;border-color:#25546c;box-shadow:0 0 0 5px #74d6eb22}.model-anchor>span{background:#071c2deF;border-color:#5393a799;border-radius:2px;padding:9px 13px}.model-anchor.selected>span{border-color:#79d8e3;background:#09233beF}.model-anchor.selected>i{box-shadow:0 0 0 7px #74d6eb33,0 0 20px #61c9e3}.model-anchor small{font-size:12px;color:#91b6c5}.model-anchor b{font-size:19px;color:#c7e9ee}.model-anchor em{font-size:12px}
.metric-list{gap:10px}.metric-card{border-color:#1d456d;border-radius:0;background:#061d38!important;padding:13px 16px}.metric-card:hover{transform:none;background:#0b3155!important}.metric-card.active{border-color:#388fc1;background:linear-gradient(90deg,#0c3e60,#071d36)!important;box-shadow:inset 3px 0 #35b7f2}.metric-title{font-size:14px;color:#a7c8e4}.metric-title>span{color:#65c5f8}.metric-card strong{font-size:30px;color:#6ac7ff;margin:5px 0}.metric-card strong small{font-size:13px}.metric-range{font-size:12px;color:#7895b4}.trend-title h3{font-size:15px;color:#b9ddfa}.trend-title>span{font-size:11px}.trend-panel svg{margin-top:8px;max-height:118px}.trend-panel p{font-size:12px;line-height:1.7}.trend-caption{font-size:10px}.fault-toggle{border-radius:0;font-size:13px!important}.fault-panel p{font-size:11px}
.lab-footer{margin-top:10px;min-height:112px;border:1px solid #1765a5;background:linear-gradient(135deg,#072246d1,#020f21d6);padding:15px 24px;gap:40px;position:relative}.lab-footer:after{content:'';position:absolute;bottom:-5px;height:3px;width:34%;left:33%;background:linear-gradient(90deg,transparent,#45aaff,transparent)}.lab-footer>div:first-child{min-width:264px}.lab-footer strong{font-size:17px;color:#b9ddfa}.sequence{gap:32px;font-size:15px}.sequence b{border-radius:0;border-color:#316d97;background:#0b3554;color:#c3edff;padding:15px 22px}.sequence small{font-size:11px;color:#79bdd8}.event-line{font-size:15px}.event-line button{font-size:14px;color:#72d7ff}.footer-note{font-size:12px}.steamer-lab button:focus-visible,.steamer-lab a:focus-visible{outline-color:#72d7ff}
@media(prefers-reduced-motion:reduce){.steamer-lab button{transition:none}}
</style>
