<script setup lang="ts">
import { useFactoryStore } from '../stores/factory'
import { processRegions } from '../data/processRegions'
defineProps<{ pointStyle: (x: number, y: number) => { left: string; top: string } }>()
const factory = useFactoryStore()
</script>
<template>
  <div class="factory-scene-heading"><small>HUIJISHAN · FUTURE FACTORY</small><h2>{{ factory.config.title }}</h2><p>{{ factory.theme === 'production' ? `${factory.processRegion.label} / ${factory.processRegion.area}` : factory.config.subtitle }}</p></div>
  <template v-if="factory.theme === 'production'">
    <button v-for="(region, index) in processRegions" :key="region.id" class="factory-scene-marker process-region-marker" :class="{ selected: factory.selectedProcessIndex === index }" :style="{ ...pointStyle(region.x, region.y), '--region-color': region.color }" :aria-label="`定位工艺：${region.label}`" :aria-pressed="factory.selectedProcessIndex === index" @click.stop="factory.selectProcess(index)"><i /><span><b>{{ String(index + 1).padStart(2, '0') }} {{ region.label }}</b><small>{{ region.area }}</small></span></button>
  </template>
  <template v-else-if="factory.theme !== 'equipment'">
    <button v-for="(record, index) in factory.config.records" :key="record.id" class="factory-scene-marker" :class="{ selected: factory.selectedIndex === index, attention: record.attention }" :style="pointStyle(record.x, record.y)" @click.stop="factory.select(index)"><i /><span><b>{{ record.area }}</b><small>{{ record.batch }} · {{ record.status }}</small></span></button>
  </template>
  <div class="factory-scene-summary"><i /> {{ factory.theme === 'equipment' ? '园区设备运维总览' : factory.theme === 'production' ? factory.processRegion.detail : factory.selected.name }} <span>{{ factory.theme === 'equipment' ? '选择工艺或设备查看三维与运维信息' : factory.theme === 'production' ? `批次进度：${processRegions[factory.selected.progress]?.label}` : factory.selected.status }}</span></div>
</template>
