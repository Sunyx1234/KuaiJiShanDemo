<script setup lang="ts">
import { useOrdersStore } from '../stores/orders'
import { formatSalesAmount } from '../data/sales'
const orders = useOrdersStore()
</script>
<template>
  <el-dialog :model-value="!!orders.selected" title="订单生命周期" width="840px" class="order-detail-dialog" modal-class="order-dialog-overlay" @close="orders.close()">
    <div v-if="orders.selected" class="order-detail">
      <header><div><small>{{ orders.selected.id }}</small><h2>绍兴 → {{ orders.selected.city }}</h2><p>{{ orders.selected.customer }} · {{ orders.selected.status }}</p></div><strong>{{ formatSalesAmount(orders.selected.amount) }}<small> 万元</small></strong></header>
      <div class="order-detail-summary"><span>期望到货 {{ orders.selected.expectedArrival }}</span><span>承运商 {{ orders.selected.carrier }}</span><span>出库 {{ orders.selected.shipped }} / 签收 {{ orders.selected.signed }} {{ orders.selected.unit }}</span></div>
      <h3>履约时间轴</h3><div class="order-timeline"><article v-for="(node, index) in orders.selected.timeline" :key="node.label" :class="{ reached: index <= orders.selected.stage }"><i>{{ index + 1 }}</i><b>{{ node.label }}</b><small>{{ node.status }}</small><time>{{ node.time || '—' }}</time></article></div>
      <h3>商品明细</h3><table class="order-items"><thead><tr><th>商品</th><th>规格 / 产品</th><th>数量</th><th>金额</th></tr></thead><tbody><tr v-for="item in orders.selected.items" :key="item.code"><td>{{ item.code }}</td><td>{{ item.name }}</td><td>{{ item.quantity }} {{ item.unit }}</td><td>{{ formatSalesAmount(item.amount) }} 万元</td></tr></tbody></table>
      <h3>关联单据与批次</h3><div class="order-documents"><div v-for="doc in orders.selected.documents" :key="doc.label"><span>{{ doc.label }}</span><b>{{ doc.codes.join(' / ') || '尚未生成' }}</b></div></div>
    </div>
  </el-dialog>
</template>
