<script setup lang="ts">
import { computed } from 'vue'
import HudPanel from './HudPanel.vue'
import BaseChart from './BaseChart.vue'
import { useDashboardStore } from '../stores/dashboard'

const store = useDashboardStore()
const alertDialogVisible = computed({
  get: () => Boolean(store.selectedAlert),
  set: (value: boolean) => { if (!value) store.selectedAlert = null },
})
const riskOption = computed(() => ({
  tooltip: { trigger: 'item' },
  series: [{ type: 'pie', radius: ['57%', '75%'], center: ['34%', '52%'], label: { show: false }, data: [
    { value: 18, name: '高风险', itemStyle: { color: '#e44f56' } }, { value: 54, name: '中风险', itemStyle: { color: '#f2ad41' } }, { value: 86, name: '低风险', itemStyle: { color: '#2c85f7' } },
  ]}],
  graphic: [{ type: 'text', left: '27%', top: '40%', style: { text: '158', fill: '#c4eaff', fontSize: 25, fontWeight: 700 } }, { type: 'text', left: '24%', top: '57%', style: { text: '风险点总数', fill: '#7593af', fontSize: 10 } }]
}))
const hiddenOption = computed(() => ({
  tooltip: { trigger: 'item' },
  series: [{ type: 'pie', radius: ['58%', '75%'], center: ['32%', '50%'], label: { show: false }, data: [
    { value: 251, name: '已整改', itemStyle: { color: '#49bf88' } }, { value: 72, name: '整改中', itemStyle: { color: '#f4ad42' } }, { value: 116, name: '待整改', itemStyle: { color: '#eb5d62' } },
  ]}],
  graphic: [{ type: 'text', left: '25%', top: '38%', style: { text: '72', fill: '#69baff', fontSize: 24, fontWeight: 700 } }, { type: 'text', left: '22%', top: '55%', style: { text: '整改中', fill: '#7694b1', fontSize: 10 } }]
}))
const peopleOption = computed(() => ({
  tooltip: { trigger: 'axis' }, grid: { left: 30, right: 10, top: 10, bottom: 18 },
  xAxis: { type: 'category', data: ['00','03','06','09','12','15','18','21','24'], boundaryGap: false, axisLabel: { color: '#6e8ba8', fontSize: 9 }, axisLine: { lineStyle: { color: '#183c5e' } } },
  yAxis: { type: 'value', min: 2100, max: 2600, axisLabel: { color: '#6e8ba8', fontSize: 9 }, splitLine: { lineStyle: { color: 'rgba(34,83,125,.25)' } } },
  series: [{ type: 'line', data: [2310,2350,2480,2521,2505,2540,2521,2380,2320], smooth: true, showSymbol: true, symbolSize: 4, lineStyle: { color: '#2bbcff' }, areaStyle: { color: 'rgba(38,176,255,.15)' } }],
}))
const categories = ['全部', '设备', '人员', '环境', '其他']
</script>

<template>
  <aside class="side-column right-column">
    <HudPanel title="安全风险分布">
      <div class="risk-grid">
        <BaseChart :option="riskOption" />
        <div class="risk-legend">
          <button @click="store.riskFilter = '高风险'"><i class="dot red" />高风险 <b>18</b><small>11.4%</small></button>
          <button @click="store.riskFilter = '中风险'"><i class="dot yellow" />中风险 <b>54</b><small>34.2%</small></button>
          <button @click="store.riskFilter = '低风险'"><i class="dot blue" />低风险 <b>86</b><small>54.4%</small></button>
        </div>
      </div>
    </HudPanel>
    <HudPanel title="实时告警列表" class="alert-panel">
      <div class="filter-tabs">
        <button v-for="cat in categories" :key="cat" :class="{ active: store.alertCategory === cat }" @click="store.alertCategory = cat">{{ cat }}</button>
      </div>
      <div class="alert-list">
        <button v-for="alert in store.filteredAlerts" :key="alert.id" :class="`tone-${alert.level}`" @click="store.locateAlert(alert)">
          <i>!</i><span><b>{{ alert.content }}</b><small>{{ alert.area }} · {{ alert.status }}</small></span><time>{{ alert.time }}</time>
        </button>
      </div>
    </HudPanel>
    <HudPanel title="隐患整改闭环">
      <div class="risk-grid compact-ring">
        <BaseChart :option="hiddenOption" />
        <div class="risk-legend">
          <span><i class="dot green" />已整改 <b>251</b></span><span><i class="dot yellow" />整改中 <b>72</b></span><span><i class="dot red" />待整改 <b>116</b></span>
        </div>
      </div>
    </HudPanel>
    <HudPanel title="人员在岗分析" class="people-panel">
      <div class="people-kpis"><span>总人数<b>2,587</b></span><span>在岗人数<b>2,521</b></span><span>离岗人数<b class="danger">66</b></span></div>
      <BaseChart :option="peopleOption" />
    </HudPanel>
    <el-dialog v-model="alertDialogVisible" width="460" title="告警事件详情" class="alarm-dialog">
      <div v-if="store.selectedAlert" class="alert-detail">
        <span>告警内容<b>{{ store.selectedAlert.content }}</b></span><span>所属区域<b>{{ store.selectedAlert.area }}</b></span>
        <span>发生时间<b>{{ store.selectedAlert.time }}</b></span><span>处置状态<b>{{ store.selectedAlert.status }}</b></span>
        <p>事件已同步至厂区应急协同平台，值班人员已接收，现场处置过程持续跟踪中。</p>
      </div>
    </el-dialog>
  </aside>
</template>
