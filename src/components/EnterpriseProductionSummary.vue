<script setup lang="ts">
import { computed } from 'vue'
import HudPanel from './HudPanel.vue'
import { businessReport as report } from '../data/businessReport'
import { useEnterpriseOverviewStore } from '../stores/enterpriseOverview'
const overview = useEnterpriseOverviewStore()
const deliveryRate = computed(() => overview.summary.orders.length ? overview.summary.signedOrders.length / overview.summary.orders.length * 100 : 0)
</script>
<template>
  <aside class="enterprise-production"><HudPanel title="经营与交付"><template #actions><span class="enterprise-panel-meta">{{ report.period }}</span></template>
    <section class="enterprise-brewing"><header><h3>营业收入</h3><span class="enterprise-growth">同比 +{{ report.revenueGrowth }}%</span></header><div class="enterprise-brew-count"><strong>{{ (report.revenue / 100000000).toFixed(2) }}</strong><span>亿元</span></div><p class="enterprise-finance-note">会稽山绍兴酒股份有限公司</p></section>
    <section class="enterprise-storage"><header><h3>归母净利润</h3><span class="enterprise-growth">同比 +{{ report.profitGrowth }}%</span></header><strong>{{ (report.netProfit / 100000000).toFixed(2) }}<small>亿元</small></strong></section>
    <section class="enterprise-bottling"><header><h3>经销商网络</h3><span class="enterprise-panel-meta">报告期末</span></header><strong>{{ report.dealers.toLocaleString() }}<small>家</small></strong><div class="enterprise-dealer-regions"><span v-for="region in report.dealerRegions" :key="region.name">{{ region.name }}<b>{{ region.value }}</b></span></div></section>
    <section class="enterprise-equipment"><header><h3>本月订单交付</h3><button @click="overview.inspect({ kind: 'orders', title: '订单明细' })">订单明细 ↗</button></header><div class="enterprise-delivery-counts"><span><b>{{ overview.summary.orders.length }}</b>订单</span><span><b>{{ overview.summary.outboundCount }}</b>出库单</span><span><b>{{ overview.summary.signedWaybills }}</b>签收运单</span></div><div class="enterprise-production-progress"><i :style="{ width: `${Math.min(100, deliveryRate)}%` }" /></div><p class="enterprise-finance-note">订单签收率 <b>{{ deliveryRate.toFixed(0) }}%</b></p></section>
  </HudPanel></aside>
</template>
