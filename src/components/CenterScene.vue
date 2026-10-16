<script setup lang="ts">
import { computed, defineAsyncComponent, ref, watch, onBeforeUnmount } from 'vue'
import { useRoute } from 'vue-router'
import { useFactoryStore } from '../stores/factory'
import { useEnterpriseOverviewStore } from '../stores/enterpriseOverview'
import EnterpriseSceneOverlay from './EnterpriseSceneOverlay.vue'
import { processEquipmentModels, type CampusRegion } from '../data/processRegions'
import FactorySceneOverlay from './FactorySceneOverlay.vue'

const EquipmentModelViewer = defineAsyncComponent(() => import('./EquipmentModelViewer.vue'))
const HuijishanCampusScene = defineAsyncComponent(() => import('./HuijishanCampusScene.vue'))
const route = useRoute()
const factory = useFactoryStore()
const overview = useEnterpriseOverviewStore()
const highlightRegion = computed(() => factory.theme === 'overview' ? overview.selectedRegion : factory.theme === 'production' || phase.value !== 'campus' ? factory.processRegion : null)
const equipmentView = ref(false)
const phase = ref<'campus' | 'loading' | 'focusing' | 'blend' | 'device'>('campus')
const activeProcess = ref<number | null>(null)
const processModel = computed(() => activeProcess.value === null ? null : processEquipmentModels[activeProcess.value])
const notice = ref('')
let equipmentPrepared = false
function campusReady() { modelReady.value = true; if (equipmentPrepared) void revealDevice() }
function equipmentReady() { equipmentPrepared = true; void revealDevice() }
let transitionId = 0
let transitionTimer = 0
let loadTimer = 0
const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches
function returnCampus() {
  transitionId++; clearTimeout(transitionTimer); clearTimeout(loadTimer)
  objSceneRef.value?.cancelFlight(); objSceneRef.value?.resetView()
  equipmentPrepared = false
  phase.value = 'campus'; activeProcess.value = null; equipmentView.value = false; notice.value = ''
}
async function revealDevice() {
  if (phase.value !== 'loading' || (isModelMode.value && !modelReady.value)) return
  clearTimeout(loadTimer)
  const token = transitionId
  phase.value = 'focusing'
  const blend = () => {
    if (token !== transitionId) return
    phase.value = 'blend'
    transitionTimer = window.setTimeout(() => { if (token === transitionId) phase.value = 'device' }, reducedMotion() ? 0 : 300)
  }
  if (isModelMode.value && modelReady.value) await objSceneRef.value?.focusRegion(factory.processRegion, 650, true, blend)
  if (token !== transitionId) return
  if (phase.value === 'focusing') blend()
}
function deviceError() {
  returnCampus(); notice.value = '设备模型加载失败，请重新点击工艺节点重试。'
}
watch(() => factory.modelRequest, () => {
  returnCampus()
  const index = factory.selectedProcessIndex
  if (!processEquipmentModels[index]) {
    notice.value = '该工段暂未接入设备模型，当前展示园区位置。'
    void objSceneRef.value?.focusRegion(factory.processRegion)
    return
  }
  activeProcess.value = index; phase.value = 'loading'
  loadTimer = window.setTimeout(deviceError, 20000)
})
watch(() => factory.theme, returnCampus)
watch(() => factory.selectedIndex, returnCampus)
watch(() => factory.selectedProcessIndex, () => { if (phase.value !== 'campus') returnCampus() }, { flush: 'sync' })
onBeforeUnmount(() => { transitionId++; clearTimeout(transitionTimer); clearTimeout(loadTimer); objSceneRef.value?.cancelFlight() })
const showObjModel = ref(true)
const supportsObjModel = computed(() => route.name === 'park-dashboard' && route.params.parkId === 'huijishan')
const isModelMode = computed(() => supportsObjModel.value && showObjModel.value)
const modelReady = ref(false)
const projectionVersion = ref(0)
const objSceneRef = ref<{ projectPoint: (x: number, y: number) => { x: number; y: number } | null; focusRegion: (region: CampusRegion, duration?: number, enterBuilding?: boolean, onEnter?: () => void) => Promise<boolean>; resetView: () => void; cancelFlight: () => void } | null>(null)
function scenePointStyle(x: number, y: number) {
  void projectionVersion.value
  const point = isModelMode.value && modelReady.value ? objSceneRef.value?.projectPoint(x, y) ?? { x, y } : { x, y }
  return { left: `${point.x}%`, top: `${point.y}%` }
}
function switchSceneMode(useModel: boolean) {
  returnCampus()
  if (showObjModel.value === useModel) return
  if (useModel) modelReady.value = false
  showObjModel.value = useModel
}
</script>

<template>
  <section class="scene" :class="{ 'scene-model-mode': isModelMode, 'drill-active': phase !== 'campus', 'drill-device': phase === 'blend' || phase === 'device' }">
    <div class="scene__vignette" />
    <HuijishanCampusScene v-if="isModelMode" v-show="!(factory.theme === 'equipment' && equipmentView)" ref="objSceneRef" :class="{ 'campus-faded': phase === 'blend' || phase === 'device' }" compact :highlight-region="highlightRegion"
      @ready="campusReady" @view-change="projectionVersion++" />
    <img v-else src="/assets/huijishan-campus-aerial.jpg" alt="会稽山园区航拍参考图" class="scene__image" />
    <div v-if="supportsObjModel && phase === 'campus'" class="scene-mode-switch" role="group" aria-label="中央场景切换">
      <button type="button" :class="{ active: showObjModel }" :aria-pressed="showObjModel" @click="switchSceneMode(true)">园区三维</button>
      <button type="button" :class="{ active: !showObjModel }" :aria-pressed="!showObjModel" @click="switchSceneMode(false)">园区航拍</button>
    </div>
    <EquipmentModelViewer v-if="factory.theme === 'equipment' && equipmentView" :device-code="factory.selected.device" />
    <div v-if="factory.theme === 'equipment' && phase === 'campus'" class="equipment-view-switch"><button :class="{ active: !equipmentView }" @click="equipmentView = false">园区定位</button><button :class="{ active: equipmentView }" @click="equipmentView = true">设备视图</button></div>
    <EnterpriseSceneOverlay v-if="factory.theme === 'overview'" :point-style="scenePointStyle" />
    <FactorySceneOverlay v-else-if="phase === 'campus' && !(factory.theme === 'equipment' && equipmentView)" :point-style="scenePointStyle" />
    <div v-if="processModel" class="process-device-layer" :class="{ visible: phase === 'blend' || phase === 'device' }" :inert="phase !== 'device'">
      <EquipmentModelViewer :key="activeProcess!" :device-code="processModel.deviceCode" :asset-url="processModel.assetUrl" :model-name="processModel.name" @ready="equipmentReady" @error="deviceError" />
      <div class="factory-scene-heading"><small>HUIJISHAN · EQUIPMENT TWIN</small><h2>{{ processModel.name }}</h2><p>{{ factory.processRegion.label }} / {{ processModel.deviceCode }} · 工段设备示意</p></div>
      <div class="process-device-caption">两侧保留当前{{ factory.theme === 'equipment' ? '设备档案' : '批次' }}信息 · 本模型为工段示意，尚未绑定实时测点</div>
    </div>
    <button v-if="phase !== 'campus'" class="drill-back" @click="returnCampus">← 返回园区</button>
    <div v-if="phase === 'loading' || phase === 'focusing'" class="drill-status" role="status">{{ phase === 'loading' ? '正在准备设备模型…' : `正在进入${factory.processRegion.area}…` }}<small>工艺与楼宇位置为示意映射</small></div>
    <div v-if="notice" class="drill-notice" role="status">{{ notice }}</div>
  </section>
</template>

<style scoped>
.scene :deep(.obj-preview){transition:opacity .3s ease,filter .3s ease}.scene :deep(.obj-preview.campus-faded){opacity:0;filter:blur(5px);pointer-events:none}.process-device-layer{position:absolute;inset:0;z-index:3;opacity:0;transform:scale(.93);transition:opacity .3s ease,transform .45s cubic-bezier(.2,.7,.2,1);pointer-events:none}.process-device-layer.visible{opacity:1;transform:scale(1);pointer-events:auto}.process-device-layer .factory-scene-heading{z-index:2;pointer-events:none}.drill-back{position:absolute;z-index:15;right:16px;top:16px;padding:8px 14px;border:1px solid #357ca5;background:#03182deb;color:#b9e4fc;cursor:pointer;font-size:13px}.drill-status,.drill-notice{position:absolute;z-index:14;left:50%;bottom:25px;transform:translateX(-50%);padding:12px 18px;border:1px solid #39779b;background:#061b30eb;color:#bce4f3;font-size:13px;white-space:nowrap}.drill-status small{display:block;color:#7895b4;font-size:10px;margin-top:7px}.process-device-caption{position:absolute;bottom:20px;right:18px;max-width:75%;padding:8px 12px;background:#061b30c9;color:#87aeba;font-size:11px;pointer-events:none}.drill-active :deep(.obj-preview__controls){visibility:hidden}
@media(prefers-reduced-motion:reduce){.scene :deep(.obj-preview),.process-device-layer{transition:none}}
</style>
