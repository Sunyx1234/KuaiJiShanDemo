<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import { equipmentModelCatalog } from '../data/processRegions'
import { createCampusGridGround } from '../three/createCampusGridGround'
const props = defineProps<{ deviceCode: string; assetUrl?: string; modelName?: string }>()
const emit = defineEmits<{ ready: []; error: [] }>()
const entry = computed(() => equipmentModelCatalog[props.deviceCode])
const url = computed(() => props.assetUrl ?? entry.value?.assetUrl)
const host = ref<HTMLDivElement | null>(null)
const state = ref('')
let renderer: THREE.WebGLRenderer | null = null
let controls: OrbitControls | null = null
let observer: ResizeObserver | null = null
let scene: THREE.Scene | null = null
let environment: THREE.WebGLRenderTarget | null = null
let frame = 0, version = 0
let resetCamera = () => {}
function disposeObject(root: THREE.Object3D) {
  root.traverse(object => {
    if (!(object instanceof THREE.Mesh)) return
    object.geometry.dispose()
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
      Object.values(material).forEach(value => { if (value instanceof THREE.Texture) value.dispose() })
      material.dispose()
    }
  })
}
function clear() {
  version++; cancelAnimationFrame(frame); frame = 0
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
    const render = () => { frame = 0; renderer?.render(world, camera) }
    const request = () => { if (!frame) frame = requestAnimationFrame(render) }
    controls.addEventListener('change', request)
    observer = new ResizeObserver(() => {
      if (!host.value || !renderer) return
      camera.aspect = host.value.clientWidth / Math.max(1, host.value.clientHeight)
      camera.updateProjectionMatrix(); renderer.setSize(host.value.clientWidth, host.value.clientHeight, false); request()
    })
    observer.observe(host.value)
    new GLTFLoader().load(url.value, gltf => {
      if (current !== version) { disposeObject(gltf.scene); return }
      const model = gltf.scene; world.add(model)
      model.traverse(object => { if (object instanceof THREE.Mesh) { object.castShadow = true; object.receiveShadow = true } })
      const bounds = new THREE.Box3().setFromObject(model), center = bounds.getCenter(new THREE.Vector3()), size = bounds.getSize(new THREE.Vector3())
      const slabMaterial = new THREE.MeshStandardMaterial({ color: '#173447', roughness: .95, metalness: .05 })
      slabMaterial.name = '浅灰场地'
      const slab = new THREE.Mesh(new THREE.BoxGeometry(size.x + 1.5, .22, size.z + 1.5), slabMaterial)
      slab.position.set(center.x, bounds.min.y - .13, center.z); slab.receiveShadow = true
      const base = new THREE.Group(); base.add(slab); world.add(base)
      const grid = createCampusGridGround(base); grid.material.uniforms.spacing!.value = 1; world.add(grid)
      resetCamera = () => {
        if (!host.value || !controls) return
        camera.aspect = host.value.clientWidth / Math.max(1, host.value.clientHeight)
        const halfFov = Math.atan(Math.tan(THREE.MathUtils.degToRad(20)) * Math.min(1, camera.aspect))
        const distance = size.length() * .40 / Math.sin(halfFov)
        camera.position.copy(center).addScaledVector(new THREE.Vector3(1.1, .8, 1).normalize(), distance)
        camera.updateProjectionMatrix(); controls.target.copy(center); controls.update(); request()
      }
      resetCamera(); state.value = ''; render(); emit('ready')
    }, undefined, () => { if (current === version) { state.value = '设备模型暂不可用'; emit('error') } })
  } catch { state.value = '设备模型暂不可用'; emit('error') }
}
onMounted(load)
watch(() => [props.deviceCode, url.value], load, { flush: 'post' })
onBeforeUnmount(clear)
</script>
<template>
  <div class="equipment-model-stage">
    <div ref="host" class="equipment-model-canvas" />
    <div v-if="!url" class="equipment-model-placeholder"><small>HUIJISHAN · EQUIPMENT TWIN</small><h2>{{ modelName ?? entry?.name ?? deviceCode }}</h2><p>独立设备模型准备中</p></div>
    <p v-else-if="state" class="equipment-model-message" role="status">{{ state }}</p>
    <button v-else class="equipment-reset" @click="resetCamera()">复位视角</button>
  </div>
</template>
<style scoped>
.equipment-model-stage{position:absolute;inset:0;background:radial-gradient(ellipse at 42% 32%,#193b52 0,#0d263c 48%,#06182d 82%,#031020 100%)}
.equipment-model-canvas{position:absolute;inset:0}.equipment-model-canvas :deep(canvas){width:100%;height:100%;display:block;touch-action:none}.equipment-reset{position:absolute;bottom:16px;left:16px;padding:7px 12px;border:1px solid #39779b;background:#092b47d9;color:#bde7ff;cursor:pointer;font-size:12px}
</style>
