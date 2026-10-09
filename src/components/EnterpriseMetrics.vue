<script setup lang="ts">
import * as Icons from '@element-plus/icons-vue'
import { useEnterpriseOverviewStore } from '../stores/enterpriseOverview'
const overview = useEnterpriseOverviewStore()
const icons = Icons as Record<string, any>
const kinds = ['orders', 'orders', 'shipped', 'signed'] as const
</script>
<template>
  <section class="enterprise-metrics" aria-label="企业经营指标">
    <div class="enterprise-period"><small>BUSINESS OVERVIEW</small><b>经营概览</b><div><button :class="{ active: overview.period === 'week' }" @click="overview.period = 'week'">近7日</button><button :class="{ active: overview.period === 'month' }" @click="overview.period = 'month'">本月</button></div><span>{{ overview.periodLabel }}</span></div>
    <button v-for="(metric, index) in overview.summary.metrics" :key="metric.label" class="enterprise-kpi" @click="overview.inspect({ kind: kinds[index]!, title: metric.label })"><el-icon><component :is="icons[metric.icon]" /></el-icon><span><small>{{ metric.label }}</small><strong>{{ metric.value }}<em>{{ metric.unit }}</em></strong></span><i>↗</i></button>
  </section>
</template>
