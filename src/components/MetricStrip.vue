<script setup lang="ts">
import { computed } from 'vue'
import { useFactoryStore } from '../stores/factory'
import * as Icons from '@element-plus/icons-vue'
import { useDashboardStore } from '../stores/dashboard'

const store = useDashboardStore()
const factory = useFactoryStore()
const metrics = computed(() => store.activeNav === 'equipment' ? factory.operationsMetrics : store.metrics)
const iconMap = Icons as Record<string, any>
</script>

<template>
  <div class="metric-strip">
    <article v-for="metric in metrics" :key="metric.label" class="metric-card">
      <span class="metric-icon"><el-icon><component :is="iconMap[metric.icon]" /></el-icon></span>
      <div>
        <p>{{ metric.label }}</p>
        <strong>{{ metric.value }}<small>{{ metric.unit }}</small></strong>
      </div>
    </article>
  </div>
</template>
