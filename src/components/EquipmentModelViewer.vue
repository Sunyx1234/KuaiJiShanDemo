<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { equipmentModelCatalog } from '../data/processRegions'
const props = defineProps<{ deviceCode: string }>()
const entry = computed(() => equipmentModelCatalog[props.deviceCode])
const host = ref<HTMLDivElement | null>(null)
const state = ref('')
let renderer: THREE.WebGLRenderer | null = null
let controls: OrbitControls | null = null
let observer: ResizeObserver | null = null
let model: THREE.Group | null = null
let frame = 0
let version = 0
function clear() {
  version++
  cancelAnimationFrame(frame)
  observer?.disconnect()
  controls?.dispose()
  model?.traverse(object => {
    if (!(object instanceof THREE.Mesh)) return
    object.geometry.dispose()
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
      Object.values(material).forEach(value => { if (value instanceof THREE.Texture) value.dispose() })
      material.dispose()
    }
  })
  model = null
  renderer?.dispose()
  renderer?.domElement.remove()
  renderer = null
}
function load() {
  clear()
  const url = entry.value?.assetUrl
  if (!url || !host.value) return
  state.value = '设备模型加载中'
  const current = version
  const scene = new THREE.Scene()
  scene.add(new THREE.HemisphereLight(0xc5edff, 0x183047, 3))
  const light = new THREE.DirectionalLight(0xffffff, 3)
  light.position.set(10, 20, 10)
  scene.add(light)
  const camera = new THREE.PerspectiveCamera(40, 1, .01, 10000)
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5))
    host.value.appendChild(renderer.domElement)
    controls = new OrbitControls(camera, renderer.domElement)
    const render = () => { frame = 0; if (renderer) renderer.render(scene, camera) }
    const request = () => { if (!frame) frame = requestAnimationFrame(render) }
    controls.addEventListener('change', request)
    observer = new ResizeObserver(() => {
      if (!host.value || !renderer) return
      camera.aspect = host.value.clientWidth / Math.max(1, host.value.clientHeight)
      camera.updateProjectionMatrix()
      renderer.setSize(host.value.clientWidth, host.value.clientHeight, false)
      request()
    })
    observer.observe(host.value)
    new GLTFLoader().load(url, gltf => {
      if (current !== version) { gltf.scene.traverse(object => { if (object instanceof THREE.Mesh) { object.geometry.dispose(); (Array.isArray(object.material) ? object.material : [object.material]).forEach(m => m.dispose()) } }); return }
      model = gltf.scene
      scene.add(model)
      const bounds = new THREE.Box3().setFromObject(model)
      const center = bounds.getCenter(new THREE.Vector3())
      const distance = bounds.getSize(new THREE.Vector3()).length() * 1.3
      camera.position.copy(center).add(new THREE.Vector3(1, .7, 1).normalize().multiplyScalar(distance))
      camera.near = Math.max(.01, distance / 1000)
      camera.far = Math.max(100, distance * 10)
      camera.updateProjectionMatrix()
      controls!.target.copy(center)
      controls!.update()
      state.value = ''
      request()
    }, undefined, () => { if (current === version) state.value = '设备模型暂不可用' })
  } catch { state.value = '设备模型暂不可用' }
}
onMounted(load)
watch(() => [props.deviceCode, entry.value?.assetUrl], load, { flush: 'post' })
onBeforeUnmount(clear)
</script>
<template>
  <div class="equipment-model-stage">
    <div ref="host" class="equipment-model-canvas" />
    <div v-if="!entry?.assetUrl" class="equipment-model-placeholder"><span class="equipment-model-symbol">◇</span><small>HUIJISHAN · EQUIPMENT TWIN</small><h2>{{ entry?.name ?? deviceCode }}</h2><p>独立设备模型准备中</p><span>{{ deviceCode }} · {{ entry ? '设备档案已关联' : '待建立设备档案' }}</span></div>
    <p v-else-if="state" class="equipment-model-message">{{ state }}</p>
  </div>
</template>
