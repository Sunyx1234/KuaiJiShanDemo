<script setup lang="ts">
import { computed } from 'vue'
import HudPanel from './HudPanel.vue'
import { securityCameras } from '../data/mock'
import { useDashboardStore } from '../stores/dashboard'
import type { AiAlertStatus } from '../data/types'

const store = useDashboardStore()
const statuses: ('全部告警' | AiAlertStatus)[] = ['全部告警', '待确认', '处理中', '已处理']
const statusCount = computed(() => ({
  全部告警: store.aiAlertItems.length,
  待确认: store.aiAlertItems.filter(item => item.status === '待确认').length,
  处理中: store.aiAlertItems.filter(item => item.status === '处理中').length,
  已处理: store.aiAlertItems.filter(item => item.status === '已处理').length,
}))
const levelClass = (level: string) => level === '严重' ? 'critical' : level === '关注' ? 'attention' : 'normal'
</script>

<template>
  <aside class="side-column right-column security-right">
    <HudPanel title="实时AI识别告警" class="security-alert-panel">
      <div class="security-alert-tabs">
        <button v-for="status in statuses" :key="status" :class="{ active: store.aiAlertStatus === status }"
          @click="store.aiAlertStatus = status">
          {{ status }}<b>{{ statusCount[status] }}</b>
        </button>
      </div>
      <div class="security-alert-list">
        <button v-for="alert in store.filteredAiAlerts" :key="alert.id" :class="{ selected: store.selectedAiAlert?.id === alert.id }"
          @click="store.locateAiAlert(alert)">
          <span class="ai-snapshot" :style="{ backgroundPosition: alert.snapshotPosition }">
            <i :class="`level-${levelClass(alert.level)}`">{{ alert.level }}</i>
            <em>AI</em>
          </span>
          <span class="ai-alert-copy">
            <span><b>{{ alert.algorithm }}</b><em :class="`status-${alert.status}`">{{ alert.status }}</em></span>
            <strong>{{ alert.content }}</strong>
            <small>{{ alert.area }} · {{ securityCameras.find(item => item.id === alert.cameraId)?.name }}</small>
            <time>{{ alert.time }}</time>
          </span>
        </button>
      </div>
      <div class="security-alert-footer">
        <span><i class="red" />严重 {{ store.aiAlertItems.filter(item => item.level === '严重').length }}</span>
        <span><i class="yellow" />关注 {{ store.aiAlertItems.filter(item => item.level === '关注').length }}</span>
        <span><i class="blue" />一般 {{ store.aiAlertItems.filter(item => item.level === '一般').length }}</span>
      </div>
    </HudPanel>
  </aside>
</template>
