<script setup lang="ts">
import { computed } from 'vue'
import HudPanel from './HudPanel.vue'
import { visitorExceptions, visitors } from '../data/mock'
import { useDashboardStore } from '../stores/dashboard'
import type { VisitorExceptionStatus } from '../data/types'

const store = useDashboardStore()
const statuses: ('全部' | VisitorExceptionStatus)[] = ['全部', '待确认', '处理中', '已处理']
const exceptionCounts = computed(() => ({
  全部: visitorExceptions.length,
  待确认: visitorExceptions.filter(item => item.status === '待确认').length,
  处理中: visitorExceptions.filter(item => item.status === '处理中').length,
  已处理: visitorExceptions.filter(item => item.status === '已处理').length,
}))
const levelClass = (level: string) => level === '严重' ? 'critical' : level === '关注' ? 'attention' : 'normal'
const currentVisitors = computed(() => store.filteredVisitors.slice(0, 6))
</script>

<template>
  <aside class="side-column right-column visitor-right">
    <HudPanel title="访客异常事件" class="visitor-exception-panel">
      <div class="visitor-exception-tabs">
        <button v-for="status in statuses" :key="status" :class="{ active: store.visitorExceptionStatus === status }"
          @click="store.visitorExceptionStatus = status">{{ status }}<b>{{ exceptionCounts[status] }}</b></button>
      </div>
      <div class="visitor-exception-list">
        <button v-for="item in store.filteredVisitorExceptions" :key="item.id"
          :class="{ selected: store.selectedVisitorException?.id === item.id }" @click="store.locateVisitorException(item)">
          <i :class="`level-${levelClass(item.level)}`">!</i>
          <span><b>{{ item.type }}</b><strong>{{ item.content }}</strong><small>{{ visitors.find(visitor => visitor.id === item.visitorId)?.maskedName }} · {{ item.area }}</small></span>
          <em :class="`status-${item.status}`">{{ item.status }}</em><time>{{ item.time }}</time>
        </button>
      </div>
    </HudPanel>
    <HudPanel title="访客定位列表" class="visitor-list-panel">
      <template #actions><span class="visitor-data-source"><i />UWB在线</span></template>
      <div class="visitor-list-head"><span>访客</span><span>当前区域</span><span>状态</span></div>
      <div class="visitor-mini-list">
        <button v-for="visitor in currentVisitors" :key="visitor.id" @click="store.selectVisitor(visitor)">
          <span><b>{{ visitor.maskedName }}</b><small>{{ visitor.company }}</small></span>
          <span>{{ visitor.area }}</span><em :class="`visitor-status-${visitor.status}`">{{ visitor.status }}</em>
        </button>
      </div>
    </HudPanel>
  </aside>
</template>
