<script setup lang="ts">
import { computed } from 'vue'
import HudPanel from './HudPanel.vue'
import { productionRecords, equipmentRecords, factoryMetrics } from '../data/factory'
import { useFactoryStore } from '../stores/factory'
const factory = useFactoryStore()
const brewing = productionRecords.filter(record => record.progress === 2)
const plan = Number(factoryMetrics.production[2]!.value.replaceAll(',', ''))
const actual = Number(factoryMetrics.production[3]!.value.replaceAll(',', ''))
const percent = computed(() => plan ? Math.min(100, actual / plan * 100) : 0)
</script>
<template>
  <aside class="enterprise-production"><HudPanel title="生产概况"><template #actions><span class="enterprise-panel-meta">酿造 · 储存 · 灌装</span></template>
    <section class="enterprise-brewing"><header><h3>当前酿造批次</h3><button @click="factory.openTheme('production')">查看工艺 ↗</button></header><div class="enterprise-brew-count"><strong>{{ brewing.length }}</strong><span>批次在制</span><i>糖化发酵</i></div><button v-for="record in brewing" :key="record.id" class="enterprise-batch-line" @click="factory.openTheme('production'); factory.select(productionRecords.indexOf(record))"><span>{{ record.batch }}</span><b>{{ record.status }}</b></button></section>
    <section class="enterprise-storage"><header><h3>原酒储量</h3><span class="enterprise-pending">待接入</span></header><strong>—<small>kL</small></strong><p>原酒库存台账接入后展示</p></section>
    <section class="enterprise-bottling"><header><h3>灌装产量</h3><button @click="factory.openTheme('production'); factory.select(2)">查看批次 ↗</button></header><strong>{{ actual.toLocaleString() }}<small>瓶</small></strong><div class="enterprise-production-progress"><i :style="{ width: `${percent}%` }" /></div><p>当前批次计划 {{ plan.toLocaleString() }} 瓶 <b>{{ percent.toFixed(0) }}%</b></p></section>
    <section class="enterprise-equipment"><header><h3>主要设备状态</h3><button @click="factory.openTheme('equipment')">设备运维 ↗</button></header><button v-for="(device, index) in equipmentRecords" :key="device.id" @click="factory.openTheme('equipment'); factory.select(index)"><i :class="{ attention: device.attention }"/><span>{{ device.name }}</span><b :class="{ attention: device.attention }">{{ device.status }}</b></button></section>
  </HudPanel></aside>
</template>
