<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useSalesStore } from '../stores/sales'
import { useOrdersStore } from '../stores/orders'
import { formatSalesAmount } from '../data/sales'
const router = useRouter()
const sales = useSalesStore()
const orderDetails = useOrdersStore()
const orderList = ref<HTMLElement | null>(null)
watch(() => sales.activeIndex, async index => {
  await nextTick()
  const button = orderList.value?.querySelector<HTMLButtonElement>(`button[data-index="${index}"]`)
  if (button && orderList.value) {
    const list = orderList.value
    const top = button.offsetTop
    if (top < list.scrollTop) list.scrollTo({ top, behavior: 'smooth' })
    else if (top + button.offsetHeight > list.scrollTop + list.clientHeight) list.scrollTo({ top: top + button.offsetHeight - list.clientHeight, behavior: 'smooth' })
  }
})
function openOrder(index: number) {
  const order = sales.orders[index]
  if (!order) return
  sales.selectOrder(index)
  orderDetails.open(order.id)
}
</script>

<template>
  <aside class="group-showcase-column group-left-overview sales-left">
    <section class="group-showcase-panel sales-summary">
      <header class="group-showcase-heading"><div><span>SALES NETWORK</span><h2>黄酒销售流向</h2></div></header>
      <p class="sales-intro">从绍兴出发，连接各地市场</p>
      <div class="sales-total"><span>订单总金额</span><strong>{{ formatSalesAmount(sales.totalAmount) }}<small>万元</small></strong></div>
      <div class="sales-summary-stats"><div><b>{{ sales.cityCount }}</b><span>目的地市</span></div><div><b>{{ sales.orders.length }}</b><span>销售订单</span></div></div>
      <header class="sales-list-heading"><h3>订单轮播</h3><button @click="sales.playing = !sales.playing">{{ sales.playing ? '暂停轮播' : '继续轮播' }}</button></header>
      <nav ref="orderList" class="sales-order-list" :style="{ gridTemplateRows: `repeat(${sales.orders.length}, minmax(54px, 1fr))` }" aria-label="销售订单">
        <button v-for="(order, index) in sales.orders" :key="order.id" :data-index="index" :class="{ active: sales.activeIndex === index }" :aria-pressed="sales.activeIndex === index" aria-haspopup="dialog" @click="openOrder(index)">
          <span class="sales-order-number">{{ String(index + 1).padStart(2, '0') }}</span><span><b>绍兴 → {{ order.destinationLabel }}</b><small>{{ order.quantityText }}</small></span><strong>{{ formatSalesAmount(order.amount) }}<small>万元</small></strong>
        </button>
      </nav>
      <div class="sales-playback sales-list-playback"><button aria-label="上一笔订单" @click="sales.selectOrder(sales.activeIndex - 1)">←</button><span>订单 {{ sales.activeIndex + 1 }} / {{ sales.orders.length }}</span><button aria-label="下一笔订单" @click="sales.selectOrder(sales.activeIndex + 1)">→</button></div>
      <button class="sales-campus-entry" @click="router.push('/park/huijishan')">进入绍兴园区 <span>→</span></button>
    </section>
  </aside>
</template>
