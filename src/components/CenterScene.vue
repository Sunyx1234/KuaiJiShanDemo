<script setup lang="ts">
import * as Icons from '@element-plus/icons-vue'
import { computed } from 'vue'
import { layerItems } from '../data/mock'
import { useDashboardStore } from '../stores/dashboard'
import BaseChart from './BaseChart.vue'

const store = useDashboardStore()
const iconMap = Icons as Record<string, any>
const detailTrend = computed(() => ({
  grid: { left: 25, right: 8, top: 8, bottom: 18 },
  xAxis: { type: 'category', data: ['02','04','06','08','10','12','14','16','18','20','22','24'], axisLabel: { color: '#66849f', fontSize: 9 }, axisLine: { lineStyle: { color: '#23466a' } } },
  yAxis: { type: 'value', axisLabel: { show: false }, splitLine: { lineStyle: { color: 'rgba(44,96,139,.25)' } } },
  tooltip: { trigger: 'axis' },
  series: [{ type: 'line', data: store.selectedMarker?.device?.trend ?? [], smooth: true, showSymbol: false, lineStyle: { color: '#22c4ff', width: 2 }, areaStyle: { color: 'rgba(22,166,238,.18)' } }],
}))
</script>

<template>
  <section class="scene">
    <div class="scene__vignette" />
    <img src="/assets/factory-main.png" alt="正泰集团厂区数字孪生主场景" class="scene__image" />
    <button v-for="marker in store.visibleMarkers" :key="marker.id" class="scene-marker" :class="[`tone-${marker.tone}`, { selected: store.selectedMarker?.id === marker.id }]" :style="{ left: `${marker.x}%`, top: `${marker.y}%` }" :aria-label="`${marker.name}：${marker.sub}`" @click="store.selectedMarker = marker">
      <span class="marker-pulse" /><span class="marker-label"><strong>{{ marker.name }}</strong><small>{{ marker.sub }}</small></span>
    </button>
    <div class="compass"><b>N</b><i>▲</i><span>3D</span></div>
    <nav class="layer-bar">
      <button v-for="item in layerItems" :key="item.key" :class="{ active: store.activeLayer === item.key }" @click="store.activeLayer = item.key; store.riskFilter = '全部'">
        <el-icon><component :is="iconMap[item.icon]" /></el-icon><span>{{ item.label }}</span>
      </button>
    </nav>
    <transition name="slide">
      <aside v-if="store.selectedMarker?.device" class="device-detail">
        <button class="detail-close" @click="store.selectedMarker = null">×</button>
        <div class="detail-title"><span class="live-dot" /><div><small>设备实时档案</small><h3>{{ store.selectedMarker.device.name }}</h3></div></div>
        <div class="detail-meta">
          <span>设备编号<b>{{ store.selectedMarker.device.code }}</b></span><span>所属区域<b>{{ store.selectedMarker.device.area }}</b></span>
          <span>设备类型<b>{{ store.selectedMarker.device.type }}</b></span><span>当前状态<b class="ok">{{ store.selectedMarker.device.status }}</b></span>
        </div>
        <div class="detail-kpis">
          <span>额定容量<b>{{ store.selectedMarker.device.rated }}</b></span><span>实时功率<b>{{ store.selectedMarker.device.running }}</b></span>
          <span>{{ store.selectedMarker.device.businessLabel }}<b>{{ store.selectedMarker.device.businessValue }}</b></span><span>累计运行<b>{{ store.selectedMarker.device.hours }}</b></span>
        </div>
        <h4>近24小时运行趋势 <em>更新于 {{ store.selectedMarker.device.updated }}</em></h4>
        <BaseChart :option="detailTrend" />
        <h4>最近告警记录</h4>
        <p v-for="alarm in store.selectedMarker.device.alarms" :key="alarm" class="detail-alarm">{{ alarm }}</p>
      </aside>
    </transition>
  </section>
</template>
