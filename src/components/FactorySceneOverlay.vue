<script setup lang="ts">
import { useFactoryStore } from '../stores/factory'
import { useOrdersStore } from '../stores/orders'
import { processRegions } from '../data/processRegions'
defineProps<{ pointStyle: (x: number, y: number) => { left: string; top: string } }>()
const factory = useFactoryStore()
const orders = useOrdersStore()
</script>
<template>
  <div class="factory-scene-heading"><small>HUIJISHAN · FUTURE FACTORY</small><h2>{{ factory.config.title }}</h2><p>{{ factory.theme === 'production' ? `${factory.processRegion.label} / ${factory.processRegion.area}` : factory.config.subtitle }}</p></div>
  <template v-if="factory.theme === 'production'">
    <button v-for="(region, index) in processRegions" :key="region.id" class="factory-scene-marker process-region-marker" :class="{ selected: factory.selectedProcessIndex === index }" :style="{ ...pointStyle(region.x, region.y), '--region-color': region.color }" :aria-label="`定位工艺：${region.label}`" :aria-pressed="factory.selectedProcessIndex === index" @click.stop="factory.selectProcess(index)"><i /><span><b>{{ String(index + 1).padStart(2, '0') }} {{ region.label }}</b><small>{{ region.area }}</small></span></button>
  </template>
  <template v-else-if="!['overview', 'fulfillment'].includes(factory.theme)">
    <button v-for="(record, index) in factory.config.records" :key="record.id" class="factory-scene-marker" :class="{ selected: factory.selectedIndex === index, attention: record.attention }" :style="pointStyle(record.x, record.y)" @click.stop="factory.select(index)"><i /><span><b>{{ record.area }}</b><small>{{ factory.theme === 'equipment' ? record.name : record.batch }} · {{ record.status }}</small></span></button>
  </template>
  <button v-else @click="orders.open(factory.selected.id)" class="factory-scene-marker selected" :style="pointStyle(61, 60)"><i /><span><b>成品出库区</b><small>{{ factory.selected.id }} · {{ factory.selected.status }}</small></span></button>
  <div class="factory-scene-summary"><i /> {{ factory.theme === 'production' ? factory.processRegion.detail : factory.selected.name }} <span>{{ factory.theme === 'production' ? `批次进度：${processRegions[factory.selected.progress]?.label}` : factory.selected.status }}</span></div>
</template>
