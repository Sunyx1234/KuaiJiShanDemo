<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import HudPanel from './HudPanel.vue'
import { useDashboardStore } from '../stores/dashboard'

const store = useDashboardStore()
const now = ref(formatTime(new Date()))
let timer = 0
function formatTime(date: Date) {
  return new Intl.DateTimeFormat('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(date)
}
onMounted(() => { timer = window.setInterval(() => { now.value = formatTime(new Date()) }, 1000) })
onBeforeUnmount(() => clearInterval(timer))

const visitorMetrics = [
  { label: '当前在厂访客', value: '86', unit: '人', tone: 'normal', note: '已完成定位授权' },
  { label: '今日实际入厂', value: '142', unit: '人', tone: 'info', note: '预约到访 156 人' },
  { label: '超时滞留', value: '3', unit: '人', tone: 'warning', note: '最长超时 42 分钟' },
  { label: '限制区告警', value: '1', unit: '起', tone: 'critical', note: '已通知区域负责人' },
  { label: '定位标签失联', value: '2', unit: '个', tone: 'warning', note: '正在重新建立连接' },
]

const visitorActivities = [
  { name: '王　磊', company: '浙江华电科技', destination: '能源中心', status: '入厂', time: '16:42:18' },
  { name: '李　敏', company: '苏州智造装备', destination: '1#生产车间', status: '在访', time: '16:31:06' },
  { name: '周建国', company: '上海电气服务', destination: '中央控制室', status: '在访', time: '16:18:42' },
]

const visitorExceptions = [
  { code: 'V20260717-036', content: '访客进入危化品仓库限制区域', person: '陈凯', tone: 'critical', time: '16:39:25' },
  { code: 'V20260717-028', content: '访客超出预约离厂时间', person: '张森', tone: 'warning', time: '16:27:14' },
  { code: 'V20260717-019', content: '访客定位标签信号中断', person: '刘杰', tone: 'warning', time: '16:08:53' },
]
</script>

<template>
  <section class="bottom-dock visitor-control-dock" role="button" tabindex="0" aria-label="进入访客定位管理"
    @click="store.enterVisitorManagement" @keydown.enter="store.enterVisitorManagement">
    <HudPanel title="访客实时管控" class="visitor-control-panel">
      <template #actions>
        <span class="visitor-live"><i />实时更新 {{ now }}</span>
      </template>
      <div class="visitor-kpi-row">
        <article v-for="item in visitorMetrics" :key="item.label" :class="`tone-${item.tone}`">
          <span>{{ item.label }}</span>
          <strong>{{ item.value }}<small>{{ item.unit }}</small></strong>
          <em>{{ item.note }}</em>
        </article>
      </div>
      <div class="visitor-detail-grid">
        <section class="visitor-activity">
          <header><b>最新访客动态</b><span>人员 / 来访单位 / 到访区域</span></header>
          <div v-for="item in visitorActivities" :key="`${item.name}-${item.time}`">
            <strong>{{ item.name }}</strong><span>{{ item.company }}</span><span>{{ item.destination }}</span>
            <em>{{ item.status }}</em><time>{{ item.time }}</time>
          </div>
        </section>
        <section class="visitor-exceptions">
          <header><b>访客异常事件</b><span>实时监测</span></header>
          <div v-for="item in visitorExceptions" :key="item.code" :class="`tone-${item.tone}`">
            <i>!</i>
            <span class="exception-content"><b>{{ item.content }}</b></span>
            <span class="exception-visitor"><b>{{ item.code }}</b><small>{{ item.person }}</small></span>
            <time>{{ item.time }}</time>
          </div>
        </section>
      </div>
    </HudPanel>
  </section>
</template>
