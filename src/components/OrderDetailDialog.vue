<script setup lang="ts">
import { useOrdersStore } from '../stores/orders'
import { formatSalesAmount, formatQuantities } from '../data/sales'
import { formatBusinessTime } from '../data/fulfillment'
const orders = useOrdersStore()
</script>
<template>
  <el-dialog :model-value="!!orders.selected" title="订单生命周期" width="840px" class="order-detail-dialog" modal-class="order-dialog-overlay" @close="orders.close()">
    <div v-if="orders.selected" class="order-detail">
      <header><div><small>{{ orders.selected.id }}</small><h2>绍兴 → {{ orders.selected.destinationLabel }}</h2><p>{{ orders.selected.customer }} · {{ orders.selected.status }}</p></div><strong>{{ formatSalesAmount(orders.selected.amount) }}<small> 万元</small></strong></header>
      <div class="order-detail-summary"><span>支付金额 {{ formatSalesAmount(orders.selected.paidAmount) }} 万元</span><span>期望到货 {{ orders.selected.expectedArrival }}</span><span>{{ orders.selected.transportMode }}</span></div>
      <div class="order-delivery-summary"><span><small>发货仓库</small>{{ orders.selected.warehouse }}</span><span><small>承运商</small>{{ orders.selected.carrier }}</span><span><small>本次出库</small>{{ orders.selected.shippedText }}</span><span><small>本次签收</small>{{ orders.selected.signedText }}</span></div>
      <h3>履约时间轴</h3><div class="order-timeline"><article v-for="(node, index) in orders.selected.timeline" :key="node.label" class="reached"><i>{{ index + 1 }}</i><b>{{ node.label }}</b><small>{{ node.status }}</small><time>{{ node.time }}</time></article></div>
      <h3>商品明细 <small>{{ orders.selected.items.length }} 项 · {{ orders.selected.quantityText }}</small></h3><table class="order-items order-product-table"><colgroup><col style="width:125px"/><col/><col style="width:90px"/><col style="width:85px"/><col style="width:90px"/></colgroup><thead><tr><th>商品编码</th><th>商品名称</th><th>规格</th><th>数量</th><th>销售金额</th></tr></thead><tbody><tr v-for="item in orders.selected.items" :key="item.code"><td>{{ item.code }}</td><td>{{ item.name }}</td><td>{{ item.spec }}</td><td>{{ item.quantity.toLocaleString() }} {{ item.unit }}</td><td>{{ formatSalesAmount(item.amount) }} 万元</td></tr></tbody></table>
      <h3>运输与签收</h3><div class="order-receipts"><article v-for="shipment in orders.selected.shipments" :key="shipment.code"><header><b>{{ shipment.code }}</b><em>{{ shipment.status }}</em></header><p>{{ shipment.carrier }} · {{ formatQuantities(shipment.quantities) }}</p><dl><div><dt>配送送达</dt><dd>{{ formatBusinessTime(shipment.deliveredAt) }}</dd></div><div><dt>客户签收</dt><dd>{{ formatBusinessTime(shipment.signedAt) }}</dd></div><div><dt>签收方</dt><dd>{{ shipment.recipient }}</dd></div></dl></article></div>
      <div class="order-delivery-address"><small>收货地址</small><p>{{ orders.selected.address }}</p></div>
      <h3>关联业务单据</h3><div class="order-documents"><div v-for="doc in orders.selected.documents" :key="doc.label"><span>{{ doc.label }} · {{ doc.codes.length }} 张</span><b>{{ doc.codes.join(' / ') }}</b></div></div>
    </div>
  </el-dialog>
</template>
