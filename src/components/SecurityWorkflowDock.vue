<script setup lang="ts">
import { computed } from 'vue'
import HudPanel from './HudPanel.vue'
import { useDashboardStore } from '../stores/dashboard'
import { securityCameras } from '../data/mock'

const store = useDashboardStore()
const pendingCount = computed(() => store.aiAlertItems.filter(item => ['待确认', '待派单'].includes(item.status)).length)
const processingCount = computed(() => store.aiAlertItems.filter(item => item.status === '处理中').length)
const reviewCount = computed(() => store.aiAlertItems.filter(item => item.status === '待复核').length)
const resolvedCount = computed(() => store.aiAlertItems.filter(item => ['已归档', '已排除'].includes(item.status)).length)
const closureRate = computed(() => store.aiAlertItems.length
  ? Math.round(resolvedCount.value / store.aiAlertItems.length * 100)
  : 0)
const scrollingOrders = computed(() => [...store.aiAlertItems, ...store.aiAlertItems])
const statusClass = (status: string) => ['已归档', '已排除'].includes(status) ? 'resolved' : ['处理中', '待复核'].includes(status) ? 'processing' : 'pending'
const assigneeName = (assignee: string | null | undefined) => assignee?.trim() || '待分派'
const progressText = (alertId: string, status: string) => {
  const order = store.workOrders.find(item => item.alertId === alertId)
  return order?.progress || status
}
</script>

<template>
  <section class="security-workflow-dock">
    <HudPanel title="AI告警工单实时台账" class="workflow-ledger-panel">
      <template #actions>
        <span class="ledger-live"><i />实时滚动</span>
      </template>
      <div class="ledger-head">
        <span>告警编号 / 事件</span><span>对应区域</span><span>处理状态</span><span>处理责任人</span>
      </div>
      <div class="ledger-window">
        <div class="ledger-scroll">
          <button v-for="(order, index) in scrollingOrders" :key="`${order.id}-${index}`" @click="store.locateAiAlert(order)">
            <span class="ledger-order">
              <i :class="`level-${order.level}`" />
              <b>{{ order.orderNo }}</b>
              <small>{{ order.algorithm }} · {{ order.time }}</small>
            </span>
            <span class="ledger-area"><b>{{ order.area }}</b><small>{{ securityCameras.find(camera => camera.id === order.cameraId)?.name }}</small></span>
            <span><em :class="statusClass(order.status)">{{ progressText(order.id, order.status) }}</em></span>
            <span class="ledger-owner"><i>{{ assigneeName(order.assignee).slice(0, 1) }}</i><b>{{ assigneeName(order.assignee) }}</b></span>
          </button>
        </div>
      </div>
    </HudPanel>
    <HudPanel title="今日工单概览" class="workflow-count-panel">
      <div class="closure-rate"><strong>{{ closureRate }}<small>%</small></strong><span>当前闭环率</span></div>
      <div class="workflow-counts compact">
        <span><i class="pending" />待确认<b>{{ pendingCount }}</b></span>
        <span><i class="processing" />处理中<b>{{ processingCount }}</b></span>
        <span><i class="processing" />待复核<b>{{ reviewCount }}</b></span>
        <span><i class="resolved" />已处理<b>{{ resolvedCount }}</b></span>
      </div>
    </HudPanel>
  </section>
</template>
