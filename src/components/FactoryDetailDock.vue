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
    <template #actions><span class="factory-dock-id">{{ `${factory.selected.batch} · ${factory.selected.device}` }}</span></template>
    <div class="factory-step-chain"><button v-for="(step, index) in processRegions.map(region => region.label)" :key="step" class="factory-step" :class="{ complete: index < factory.selected.progress, current: index === factory.selected.progress, inspected: index === factory.selectedProcessIndex, attention: factory.selected.attention && index === factory.selected.progress }"  :aria-pressed="index === factory.selectedProcessIndex" @click="factory.inspectProcess(index)"><i>{{ String(index + 1).padStart(2, '0') }}</i><b>{{ step }}</b><small>{{ factory.theme === 'equipment' ? (index === 1 ? '查看蒸饭机' : index === 5 ? '查看灌装线' : '园区定位') : index < factory.selected.progress ? '已记录' : index === factory.selected.progress ? factory.selected.status : '后续节点' }}</small></button></div>
    <div class="factory-dock-foot"><span>{{ `当前查看：${factory.processRegion.label} / ${factory.processRegion.area}` }} · 点击浸米蒸煮或灌装入库进入设备模型</span></div>
  </HudPanel>
</template>
