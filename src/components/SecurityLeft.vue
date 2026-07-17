<script setup lang="ts">
import { computed } from 'vue'
import HudPanel from './HudPanel.vue'
import BaseChart from './BaseChart.vue'
import { aiCategoryStats, alarmHotspots, securityCameras } from '../data/mock'
import { useDashboardStore } from '../stores/dashboard'

const store = useDashboardStore()
const totalEvents = aiCategoryStats.reduce((sum, item) => sum + item.value, 0)
const categoryOption = computed(() => ({
  tooltip: { trigger: 'item', formatter: '{b}<br/>{c} 条 · {d}%' },
  series: [{
    type: 'pie',
    radius: [44, 59],
    center: ['50%', '50%'],
    label: { show: false },
    data: aiCategoryStats.map(item => ({ value: item.value, name: item.name, itemStyle: { color: item.color } })),
  }],
  graphic: [
    { type: 'text', left: 'center', top: '36%', style: { text: String(totalEvents), fill: '#c7ebff', fontSize: 25, fontWeight: 700 } },
    { type: 'text', left: 'center', top: '55%', style: { text: '今日识别事件', fill: '#7594b1', fontSize: 10 } },
  ],
}))
const rankedHotspots = computed(() =>
  [...alarmHotspots].sort((a, b) => b.counts[store.hotspotRange] - a.counts[store.hotspotRange]),
)
</script>

<template>
  <aside class="side-column left-column security-left">
    <HudPanel title="监控设备状态总览">
      <div class="security-device-overview">
        <div class="camera-online-ring">
          <strong>97.9<small>%</small></strong>
          <span>摄像头在线率</span>
        </div>
        <div class="security-status-grid">
          <span>摄像头总数<b>326</b></span>
          <span>在线数量<b class="ok">319</b></span>
          <span>离线数量<b class="danger">4</b></span>
          <span>视频流异常<b class="warn">3</b></span>
          <span>AI任务正常<b class="ok">298</b></span>
          <span>AI任务异常<b class="danger">10</b></span>
        </div>
      </div>
    </HudPanel>

    <HudPanel title="AI识别事件类别统计" class="security-category-panel">
      <div class="security-category">
        <BaseChart :option="categoryOption" />
        <div class="security-category-legend">
          <span v-for="item in aiCategoryStats" :key="item.name">
            <i :style="{ background: item.color }" />{{ item.name }}
            <b>{{ item.value }}</b><small>{{ Math.round(item.value / totalEvents * 100) }}%</small>
          </span>
        </div>
      </div>
    </HudPanel>

    <HudPanel title="AI告警高发点位 TOP5" class="security-hotspot-panel">
      <template #actions>
        <div class="security-range-tabs">
          <button v-for="item in [{ key: 'today', label: '今日' }, { key: '7d', label: '近7日' }, { key: '30d', label: '近30日' }] as const"
            :key="item.key" :class="{ active: store.hotspotRange === item.key }" @click="store.hotspotRange = item.key">
            {{ item.label }}
          </button>
        </div>
      </template>
      <div class="security-ranking">
        <button v-for="(item, index) in rankedHotspots" :key="item.cameraId"
          @click="store.openCamera(securityCameras.find(camera => camera.id === item.cameraId)!)">
          <i :class="{ top: index < 3 }">{{ index + 1 }}</i>
          <span><b>{{ item.name }}</b><small>{{ item.area }} · {{ item.category }}</small></span>
          <strong>{{ item.counts[store.hotspotRange] }}<small>次</small></strong>
        </button>
      </div>
    </HudPanel>
  </aside>
</template>
