<script setup lang="ts">
import { computed } from 'vue'
import { processRegions } from '../data/processRegions'
import HudPanel from './HudPanel.vue'
import { useFactoryStore } from '../stores/factory'
const factory = useFactoryStore()
const title = computed(() => '黄酒生产工艺链')
</script>
<template>
  <HudPanel :title="title" class="factory-dock">
    <template #actions><span class="factory-dock-id">{{ factory.theme === 'equipment' ? (factory.activeDevice ? `${factory.activeDevice.name} · ${factory.activeDevice.id}` : '园区设备运维概览') : `${factory.selected.batch} · ${factory.selected.device}` }}</span></template>
    <div class="factory-step-chain"><button v-for="(step, index) in processRegions.map(region => region.label)" :key="step" class="factory-step" :class="{ complete: factory.theme !== 'equipment' && index < factory.selected.progress, current: factory.theme !== 'equipment' && index === factory.selected.progress, inspected: (factory.theme !== 'equipment' || factory.equipmentScope === 'device') && index === factory.selectedProcessIndex, attention: factory.selected.attention && factory.theme !== 'equipment' && index === factory.selected.progress }"  :aria-pressed="(factory.theme !== 'equipment' || factory.equipmentScope === 'device') && index === factory.selectedProcessIndex" @click="factory.inspectProcess(index)"><i>{{ String(index + 1).padStart(2, '0') }}</i><b>{{ step }}</b><small>{{ factory.theme === 'equipment' ? `${factory.processSummary[index]?.total} 台设备 · ${factory.processSummary[index]?.abnormal} 台异常` : index < factory.selected.progress ? '已记录' : index === factory.selected.progress ? factory.selected.status : '后续节点' }}</small></button></div>
    <div v-if="factory.theme !== 'equipment'" class="factory-dock-foot"><span>{{ `当前查看：${factory.processRegion.label} / ${factory.processRegion.area}` }}</span></div>
  </HudPanel>
</template>
