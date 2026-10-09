<script setup lang="ts">
import { computed } from 'vue'
import { useEnterpriseOverviewStore } from '../stores/enterpriseOverview'
import { useOrdersStore } from '../stores/orders'
const overview = useEnterpriseOverviewStore()
const orders = useOrdersStore()
const businessLabel = computed(() => overview.filter?.kind === 'shipped' ? '出库' : overview.filter?.kind === 'signed' ? '签收' : '订单')
const isLogistics = computed(() => overview.filter?.kind === 'shipped' || overview.filter?.kind === 'signed')
function open(id: string) { overview.filter = null; orders.open(id) }
</script>
<template>
  <el-dialog :model-value="!!overview.filter" :title="overview.filter?.title ?? '订单明细'" width="840px" class="order-detail-dialog enterprise-order-dialog" modal-class="order-dialog-overlay" @close="overview.filter = null">
    <p class="enterprise-list-period">统计周期 {{ overview.periodLabel }} · {{ overview.filteredOrders.length }} 条订单 · 按{{ businessLabel }}时间统计</p><table class="order-items"><thead><tr><th>订单 / 运单</th><th>客户 / 城市</th><th>商品</th><th>{{ isLogistics ? `${businessLabel}数量` : '订单金额' }}</th><th>{{ businessLabel }}时间</th><th></th></tr></thead><tbody><tr v-for="order in overview.filteredOrders" :key="order.id"><td>{{ order.id }}<small v-if="overview.filter?.kind === 'signed'">{{ order.waybillCode }}</small></td><td>{{ order.customer }}<small>{{ order.city }}</small></td><td>{{ order.product }}</td><td>{{ isLogistics ? `${(overview.filter?.kind === 'shipped' ? order.shipped : order.signed).toLocaleString()} 箱` : `${(order.amount / 10000).toFixed(2)} 万元` }}</td><td>{{ (overview.filter?.kind === 'shipped' ? order.shippedAt : overview.filter?.kind === 'signed' ? order.signedAt : order.createdAt)?.replace('T', ' ').slice(5, 16) }}</td><td><button @click="open(order.id)">查看详情 →</button></td></tr></tbody></table><p v-if="!overview.filteredOrders.length" class="enterprise-no-records">所选周期暂无对应订单</p>
  </el-dialog>
</template>
