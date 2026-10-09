<script setup lang="ts">
import * as Icons from '@element-plus/icons-vue'
import { useEnterpriseOverviewStore } from '../stores/enterpriseOverview'
const overview = useEnterpriseOverviewStore()
const icons = Icons as Record<string, any>
const kinds = ['orders', 'orders', 'shipped', 'signed'] as const
</script>
<template>
  <section class="enterprise-metrics" aria-label="企业经营指标">
    <header class="enterprise-period">
      <b>经营概览</b><span>{{ overview.periodLabel }}</span>
      <nav aria-label="经营指标统计周期"><button :class="{ active: overview.period === 'week' }" :aria-pressed="overview.period === 'week'" @click="overview.period = 'week'">近7日</button><button :class="{ active: overview.period === 'month' }" :aria-pressed="overview.period === 'month'" @click="overview.period = 'month'">本月</button></nav>
    </header>
    <div class="enterprise-kpi-grid">
      <button v-for="(metric, index) in overview.summary.metrics" :key="metric.label" class="enterprise-kpi" @click="overview.inspect({ kind: kinds[index]!, title: metric.label })"><span><small><el-icon><component :is="icons[metric.icon]" /></el-icon>{{ metric.label }}</small><strong>{{ metric.value }}<em>{{ metric.unit }}</em></strong></span><i>↗</i></button>
    </div>
  </section>
</template>
