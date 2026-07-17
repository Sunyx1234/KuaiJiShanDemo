<script setup lang="ts">
import { computed } from 'vue'
import { MostlyCloudy, Odometer, Sunny, Pouring, WindPower, Lightning } from '@element-plus/icons-vue'
import HudPanel from './HudPanel.vue'
import BaseChart from './BaseChart.vue'
import { energySeries } from '../data/mock'
import { useDashboardStore } from '../stores/dashboard'

const store = useDashboardStore()
const gaugeOption = computed(() => ({
  series: [{ type: 'gauge', startAngle: 210, endAngle: -30, min: 0, max: 100, radius: '92%', center: ['35%', '52%'],
    progress: { show: true, width: 10, itemStyle: { color: '#28a9ff' } }, axisLine: { lineStyle: { width: 10, color: [[1, '#12304c']] } },
    pointer: { show: false }, axisTick: { show: false }, splitLine: { show: false }, axisLabel: { show: false },
    detail: { valueAnimation: true, formatter: '{value}', color: '#bde8ff', fontSize: 27, offsetCenter: [0, '-4%'] },
    title: { show: true, offsetCenter: [0, '28%'], color: '#41de97', fontSize: 13 }, data: [{ value: 86.7, name: '良好' }] }]
}))
const deviceOption = computed(() => ({
  series: [
    { type: 'pie', radius: ['55%', '67%'], center: ['50%', '50%'], label: { show: false }, data: [
      { value: 2114, name: '运行', itemStyle: { color: '#2b88ff' } }, { value: 187, name: '停机', itemStyle: { color: '#305275' } },
      { value: 58, name: '维护', itemStyle: { color: '#f0a93a' } }, { value: 52, name: '告警', itemStyle: { color: '#ef5260' } },
    ]},
    { type: 'pie', radius: ['76%', '78%'], center: ['50%', '50%'], silent: true, label: { show: false }, data: [{ value: 1, itemStyle: { color: '#1b659f' } }, { value: 1, itemStyle: { color: '#0a1930' } }] },
  ],
  graphic: [{ type: 'text', left: 'center', top: '38%', style: { text: '设备总数', fill: '#8eabc9', fontSize: 12 } }, { type: 'text', left: 'center', top: '52%', style: { text: '2,411', fill: '#bde8ff', fontSize: 24, fontWeight: 700 } }]
}))
const energyOption = computed(() => {
  const data = energySeries[store.timeDimension]
  return {
    tooltip: { trigger: 'axis' }, legend: { right: 4, top: 0, textStyle: { color: '#8faaca', fontSize: 10 }, itemWidth: 12 },
    grid: { left: 35, right: 8, top: 28, bottom: 20 },
    xAxis: { type: 'category', data: data.labels, boundaryGap: false, axisLabel: { color: '#7490ad', fontSize: 9 }, axisLine: { lineStyle: { color: '#14375a' } } },
    yAxis: { type: 'value', axisLabel: { color: '#7490ad', fontSize: 9 }, splitLine: { lineStyle: { color: 'rgba(38,91,139,.25)' } } },
    series: [
      { name: '今日', type: 'line', smooth: true, data: data.today, showSymbol: false, lineStyle: { color: '#2bbcff', width: 2 }, areaStyle: { color: 'rgba(31,167,255,.12)' } },
      { name: '昨日', type: 'line', smooth: true, data: data.yesterday, showSymbol: false, lineStyle: { color: '#527bd8', width: 1.5 } },
    ],
  }
})
const env = [
  { label: '温度', value: '28.6', unit: '°C', icon: Odometer },
  { label: '湿度', value: '54.7', unit: '%RH', icon: Pouring },
  { label: 'PM2.5', value: '18', unit: 'μg/m³', icon: MostlyCloudy },
  { label: 'VOC', value: '0.32', unit: 'ppm', icon: WindPower },
  { label: '噪声', value: '62', unit: 'dB', icon: Lightning },
  { label: '光照', value: '320', unit: 'lux', icon: Sunny },
]
</script>

<template>
  <aside class="side-column left-column">
    <HudPanel title="厂区运营概览">
      <div class="overview-grid">
        <BaseChart :option="gaugeOption" />
        <ul class="index-list">
          <li><span>设备运行</span><b>84.1</b></li><li><span>能源利用</span><b>91.6</b></li>
          <li><span>环境安全</span><b>82.3</b></li><li><span>管理效率</span><b>91.7</b></li>
        </ul>
      </div>
    </HudPanel>
    <HudPanel title="设备运行状态">
      <div class="device-status">
        <BaseChart :option="deviceOption" />
        <div class="device-legend">
          <span><i class="dot blue" />运行 <b>2,114</b></span><span><i class="dot slate" />停机 <b>187</b></span>
          <span><i class="dot yellow" />维护 <b>58</b></span><span><i class="dot red" />告警 <b>52</b></span>
        </div>
      </div>
    </HudPanel>
    <HudPanel title="环境监测">
      <div class="env-grid">
        <article v-for="item in env" :key="item.label">
          <el-icon><component :is="item.icon" /></el-icon><div><span>{{ item.label }}</span><strong>{{ item.value }}<small>{{ item.unit }}</small></strong><em>正常</em></div>
        </article>
      </div>
    </HudPanel>
    <HudPanel title="能耗监控" class="energy-panel">
      <template #actions>
        <div class="mini-tabs">
          <button v-for="t in ['电','水','气'] as const" :key="t" :class="{ active: store.energyType === t }" @click="store.energyType = t">{{ t }}</button>
        </div>
      </template>
      <div class="energy-summary"><span>今日综合能耗 <b>785</b> MWh</span><span>较昨日 <em>-8.2%</em></span></div>
      <div class="time-tabs">
        <button v-for="d in [{k:'day',n:'日'},{k:'month',n:'月'},{k:'year',n:'年'}] as const" :key="d.k" :class="{ active: store.timeDimension === d.k }" @click="store.timeDimension = d.k">{{ d.n }}</button>
      </div>
      <BaseChart :option="energyOption" />
    </HudPanel>
  </aside>
</template>
