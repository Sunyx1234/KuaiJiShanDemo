<script setup lang="ts">
import { computed } from 'vue'
import HudPanel from './HudPanel.vue'
import BaseChart from './BaseChart.vue'
import { visitorAreas } from '../data/mock'
import { useDashboardStore } from '../stores/dashboard'

const store = useDashboardStore()
const visitorStatusOption = computed(() => ({
  tooltip: { trigger: 'item' },
  series: [{
    type: 'pie', radius: [44, 59], center: ['50%', '50%'], label: { show: false },
    data: [
      { value: 78, name: '正常活动', itemStyle: { color: '#7567ff' } },
      { value: 3, name: '即将超时', itemStyle: { color: '#f2ae42' } },
      { value: 3, name: '超时滞留', itemStyle: { color: '#f48648' } },
      { value: 2, name: '定位失联', itemStyle: { color: '#718092' } },
    ],
  }],
  graphic: [
    { type: 'text', left: 'center', top: '36%', style: { text: '86', fill: '#c7ebff', fontSize: 25, fontWeight: 700 } },
    { type: 'text', left: 'center', top: '55%', style: { text: '当前在厂', fill: '#7594b1', fontSize: 10 } },
  ],
}))

const visitTypes = [
  { name: '商务访问', count: 28, width: 100 },
  { name: '施工检修', count: 21, width: 75 },
  { name: '物流配送', count: 16, width: 57 },
  { name: '项目交流', count: 13, width: 46 },
  { name: '参观访问', count: 8, width: 29 },
]
const durations = [
  { label: '1小时以内', value: 19, tone: 'normal' },
  { label: '1～2小时', value: 27, tone: 'info' },
  { label: '2～4小时', value: 31, tone: 'info' },
  { label: '4小时以上', value: 6, tone: 'attention' },
  { label: '超过计划', value: 3, tone: 'critical' },
]
</script>

<template>
  <aside class="side-column left-column visitor-left">
    <HudPanel title="访客实时状态">
      <div class="visitor-status-overview">
        <BaseChart :option="visitorStatusOption" />
        <div class="visitor-status-legend">
          <span><i class="normal" />正常活动<b>78</b></span>
          <span><i class="attention" />即将超时<b>3</b></span>
          <span><i class="warning" />超时滞留<b>3</b></span>
          <span><i class="offline" />定位失联<b>2</b></span>
          <span><i class="departed" />今日离厂<b>56</b></span>
        </div>
      </div>
    </HudPanel>
    <HudPanel title="访客区域分布">
      <div class="visitor-area-list">
        <button v-for="area in visitorAreas" :key="area.id" :class="{ active: store.visitorAreaFilter === area.id, alarming: area.abnormal > 0 }"
          @click="store.visitorAreaFilter = store.visitorAreaFilter === area.id ? '全部区域' : area.id; store.expandedVisitorArea = area.id">
          <span><b>{{ area.name }}</b><small>{{ area.density }}密度</small></span>
          <strong>{{ area.total }}<small>人</small></strong>
          <em v-if="area.abnormal">异常 {{ area.abnormal }}</em>
        </button>
      </div>
    </HudPanel>
    <HudPanel title="来访类型统计">
      <div class="visitor-type-bars">
        <div v-for="item in visitTypes" :key="item.name">
          <span>{{ item.name }}</span><i><em :style="{ width: `${item.width}%` }" /></i><b>{{ item.count }}</b>
        </div>
      </div>
    </HudPanel>
    <HudPanel title="当前停留时长">
      <div class="visitor-duration-grid">
        <span v-for="item in durations" :key="item.label" :class="`tone-${item.tone}`">
          {{ item.label }}<b>{{ item.value }}<small>人</small></b>
        </span>
      </div>
    </HudPanel>
  </aside>
</template>
