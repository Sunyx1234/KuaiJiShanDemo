<script setup lang="ts">
import { computed, defineAsyncComponent, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useFactoryStore } from '../stores/factory'
import { useEnterpriseOverviewStore } from '../stores/enterpriseOverview'
import EnterpriseSceneOverlay from './EnterpriseSceneOverlay.vue'
import FactorySceneOverlay from './FactorySceneOverlay.vue'

const EquipmentModelViewer = defineAsyncComponent(() => import('./EquipmentModelViewer.vue'))
const HuijishanCampusScene = defineAsyncComponent(() => import('./HuijishanCampusScene.vue'))
const route = useRoute()
const factory = useFactoryStore()
const overview = useEnterpriseOverviewStore()
const highlightRegion = computed(() => factory.theme === 'overview' ? overview.selectedRegion : factory.theme === 'production' ? factory.processRegion : null)
const equipmentView = ref(false)
const showObjModel = ref(true)
const supportsObjModel = computed(() => route.name === 'park-dashboard' && route.params.parkId === 'huijishan')
const isModelMode = computed(() => supportsObjModel.value && showObjModel.value)
const modelReady = ref(false)
const projectionVersion = ref(0)
const objSceneRef = ref<{ projectPoint: (x: number, y: number) => { x: number; y: number } | null } | null>(null)
function scenePointStyle(x: number, y: number) {
  void projectionVersion.value
  const point = isModelMode.value && modelReady.value ? objSceneRef.value?.projectPoint(x, y) ?? { x, y } : { x, y }
  return { left: `${point.x}%`, top: `${point.y}%` }
}
function switchSceneMode(useModel: boolean) {
  if (showObjModel.value === useModel) return
  if (useModel) modelReady.value = false
  showObjModel.value = useModel
}
</script>

<template>
  <section class="scene" :class="{ 'scene-model-mode': isModelMode }">
    <div class="scene__vignette" />
    <HuijishanCampusScene v-if="isModelMode" v-show="!(factory.theme === 'equipment' && equipmentView)" ref="objSceneRef" compact :highlight-region="highlightRegion"
      @ready="modelReady = true" @view-change="projectionVersion++" />
    <img v-else src="/assets/huijishan-campus-aerial.jpg" alt="会稽山园区航拍参考图" class="scene__image" />
    <div v-if="supportsObjModel" class="scene-mode-switch" role="group" aria-label="中央场景切换">
      <button type="button" :class="{ active: showObjModel }" :aria-pressed="showObjModel" @click="switchSceneMode(true)">园区三维</button>
      <button type="button" :class="{ active: !showObjModel }" :aria-pressed="!showObjModel" @click="switchSceneMode(false)">园区航拍</button>
    </div>
    <EquipmentModelViewer v-if="factory.theme === 'equipment' && equipmentView" :device-code="factory.selected.device" />
    <div v-if="factory.theme === 'equipment'" class="equipment-view-switch"><button :class="{ active: !equipmentView }" @click="equipmentView = false">园区定位</button><button :class="{ active: equipmentView }" @click="equipmentView = true">设备视图</button></div>
    <EnterpriseSceneOverlay v-if="factory.theme === 'overview'" :point-style="scenePointStyle" />
    <FactorySceneOverlay v-else-if="!(factory.theme === 'equipment' && equipmentView)" :point-style="scenePointStyle" />
  </section>
</template>
