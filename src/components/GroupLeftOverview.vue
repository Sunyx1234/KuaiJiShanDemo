<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useSalesStore } from '../stores/sales'
import { formatSalesAmount } from '../data/sales'
const router = useRouter()
const sales = useSalesStore()
</script>

<template>
  <aside class="group-showcase-column group-left-overview sales-left">
    <section class="group-showcase-panel sales-summary">
      <header class="group-showcase-heading"><div><span>SALES NETWORK</span><h2>黄酒销售流向</h2></div></header>
      <p class="sales-intro">从绍兴出发，连接各地市场</p>
      <div class="sales-total"><span>订单总金额</span><strong>{{ formatSalesAmount(sales.totalAmount) }}<small>万元</small></strong></div>
      <div class="sales-summary-stats"><div><b>{{ sales.orders.length }}</b><span>目的地市</span></div><div><b>{{ sales.totalQuantity.toLocaleString() }}</b><span>订单总箱数</span></div></div>
      <header class="sales-list-heading"><h3>订单轮播</h3><button @click="sales.playing = !sales.playing">{{ sales.playing ? '暂停轮播' : '继续轮播' }}</button></header>
      <nav class="sales-order-list" aria-label="销售订单">
        <button v-for="(order, index) in sales.orders" :key="order.id" :class="{ active: sales.activeIndex === index }" :aria-pressed="sales.activeIndex === index" @click="sales.selectOrder(index)">
          <span class="sales-order-number">{{ String(index + 1).padStart(2, '0') }}</span><span><b>绍兴 → {{ order.city }}</b><small>{{ order.quantity.toLocaleString() }} 箱 · {{ order.status }}</small></span><strong>{{ formatSalesAmount(order.amount) }}<small>万元</small></strong>
        </button>
      </nav>
      <div class="sales-playback sales-list-playback"><button aria-label="上一笔订单" @click="sales.selectOrder(sales.activeIndex - 1)">←</button><span>订单 {{ sales.activeIndex + 1 }} / {{ sales.orders.length }}</span><button aria-label="下一笔订单" @click="sales.selectOrder(sales.activeIndex + 1)">→</button></div>
      <button class="sales-campus-entry" @click="router.push('/park/huijishan')">进入绍兴园区 <span>→</span></button>
    </section>
  </aside>
</template>
