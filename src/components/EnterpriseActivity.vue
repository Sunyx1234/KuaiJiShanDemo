<script setup lang="ts">
import { computed } from 'vue'
import HudPanel from './HudPanel.vue'
import { useEnterpriseOverviewStore } from '../stores/enterpriseOverview'
import { useOrdersStore } from '../stores/orders'
const overview = useEnterpriseOverviewStore()
const orders = useOrdersStore()
const tabs = [{ key: 'orders', label: '最新订单' }, { key: 'shipped', label: '最新发货' }, { key: 'signed', label: '最新签收' }, { key: 'exceptions', label: '物流异常' }] as const
const rows = computed(() => {
  const list = overview.activity === 'shipped' ? overview.summary.shippedOrders : overview.activity === 'signed' ? overview.summary.signedOrders : overview.summary.orders
  return [...list].map(order => ({ order, at: overview.activity === 'shipped' ? order.shippedAt : overview.activity === 'signed' ? order.signedAt : order.createdAt })).sort((a, b) => (b.at ?? '').localeCompare(a.at ?? '')).slice(0, 3)
})
function inspectAll() { if (overview.activity !== 'exceptions') overview.inspect({ kind: overview.activity, title: tabs.find(tab => tab.key === overview.activity)!.label }) }
</script>
<template>
  <HudPanel title="业务动态" class="enterprise-activity"><template #actions><nav class="enterprise-activity-tabs" aria-label="业务动态类型"><button v-for="tab in tabs" :key="tab.key" :class="{ active: overview.activity === tab.key }" :aria-pressed="overview.activity === tab.key" @click="overview.activity = tab.key">{{ tab.label }}</button></nav><button v-if="overview.activity !== 'exceptions'" class="enterprise-view-all" @click="inspectAll">查看全部 ↗</button></template>
    <div v-if="overview.activity === 'exceptions'" class="enterprise-exception-empty"><i>◇</i><span><b>物流异常数据待接入</b><small>接入明确的异常类型、发生时间和处理状态后展示</small></span></div>
    <div v-else class="enterprise-activity-table"><div class="enterprise-activity-heading"><span>业务时间</span><span>订单 / 运单</span><span>客户</span><span>产品</span><span>目的城市</span><span>{{ overview.activity === 'orders' ? '订单金额' : overview.activity === 'shipped' ? '出库数量' : '签收数量' }}</span><span>状态</span></div><button v-for="row in rows" :key="row.order.id" @click="orders.open(row.order.id)"><time>{{ row.at?.replace('T', ' ').slice(5, 16) }}</time><span>{{ overview.activity === 'signed' ? row.order.waybillCode : row.order.id }}</span><span>{{ row.order.customer }}</span><span>{{ row.order.product }}</span><span>{{ row.order.city }}</span><b>{{ overview.activity === 'orders' ? `${(row.order.amount / 10000).toFixed(2)} 万元` : `${(overview.activity === 'shipped' ? row.order.shipped : row.order.signed).toLocaleString()} 箱` }}</b><em>{{ overview.activity === 'signed' ? '已签收' : overview.activity === 'shipped' ? '已出库' : row.order.status }}</em></button><p v-if="!rows.length" class="enterprise-no-records">所选周期暂无记录</p></div>
  </HudPanel>
</template>
