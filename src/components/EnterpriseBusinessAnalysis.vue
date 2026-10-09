<script setup lang="ts">
import { computed } from 'vue'
import HudPanel from './HudPanel.vue'
import BaseChart from './BaseChart.vue'
import { useEnterpriseOverviewStore } from '../stores/enterpriseOverview'
const overview = useEnterpriseOverviewStore()
const colors = ['#67cadb', '#d7b477', '#8ba4e8', '#85c6b2']
const trendOption = computed(() => ({
  color: ['#69ccdd'], tooltip: { trigger: 'axis', backgroundColor: '#0c2438', borderColor: '#315771', textStyle: { color: '#c9e4ed' }, formatter: (params: { dataIndex: number }[]) => {
    const row = overview.summary.trend[params[0]?.dataIndex ?? -1]
    return row ? `${row.day}<br/>订单金额 ${(row.amount / 10000).toFixed(2)} 万元<br/>订单数 ${row.count} 单` : ''
  } },
  grid: { left: 40, right: 12, top: 25, bottom: 25 },
  xAxis: { type: 'category', data: overview.summary.trend.map(row => row.day.slice(5).replace('-', '/')), axisLine: { lineStyle: { color: '#2c4d66' } }, axisTick: { show: false }, axisLabel: { color: '#849fac', fontSize: 11, interval: 'auto' } },
  yAxis: { type: 'value', name: '万元', nameTextStyle: { color: '#799dad', fontSize: 11 }, axisLabel: { color: '#849fac', fontSize: 11 }, splitLine: { lineStyle: { color: '#24435966', type: 'dashed' } } },
  series: [{ type: 'line', smooth: true, symbolSize: 5, data: overview.summary.trend.map(row => +(row.amount / 10000).toFixed(2)), lineStyle: { width: 2 }, areaStyle: { color: '#62c9dd', opacity: .13 } }],
}))
const productOption = computed(() => ({
  color: colors, tooltip: { trigger: 'item', backgroundColor: '#0c2438', borderColor: '#315771', textStyle: { color: '#c9e4ed' }, formatter: '{b}<br/>{c} 万元 · {d}%' },
  series: [{ type: 'pie', radius: ['55%', '79%'], center: ['50%', '50%'], label: { show: false }, itemStyle: { borderColor: '#0a1b2d', borderWidth: 3 }, data: overview.summary.products.map(row => ({ name: row.name, value: +(row.amount / 10000).toFixed(2) })) }],
}))
function selectTrend(event: { dataIndex?: number }) { const row = overview.summary.trend[event.dataIndex ?? -1]; if (row) overview.inspect({ kind: 'day', value: row.day, title: `${row.day} 订单` }) }
function selectProduct(event: { name?: string }) { if (event.name) overview.inspect({ kind: 'product', value: event.name, title: `${event.name} 销售订单` }) }
const maxDealers = computed(() => Math.max(1, ...overview.summary.regions.map(row => row.dealers)))
</script>
<template>
  <aside class="enterprise-business">
    <HudPanel title="订单趋势" class="enterprise-trend"><template #actions><span class="enterprise-panel-meta">订单金额 / 日</span></template><BaseChart :option="trendOption" @select="selectTrend" /></HudPanel>
    <HudPanel title="产品销售结构" class="enterprise-products"><template #actions><span class="enterprise-panel-meta">按订单金额</span></template><div class="enterprise-product-layout"><div class="enterprise-donut"><BaseChart :option="productOption" @select="selectProduct" /><span>产品系列<b>{{ overview.summary.products.length }}</b></span></div><div class="enterprise-product-legend"><button v-for="(row, index) in overview.summary.products" :key="row.name" @click="overview.inspect({ kind: 'product', value: row.name, title: `${row.name} 销售订单` })"><i :style="{ background: colors[index % colors.length] }" /><span>{{ row.name }}<small>{{ (row.amount / 10000).toFixed(2) }} 万元</small></span><b>{{ overview.summary.amount ? (row.amount / overview.summary.amount * 100).toFixed(1) : '0' }}%</b></button></div></div></HudPanel>
    <HudPanel title="区域经销商分布" class="enterprise-regions"><template #actions><span class="enterprise-panel-meta">客户编码去重</span></template><div class="enterprise-region-list"><button v-for="row in overview.summary.regions" :key="row.name" @click="overview.inspect({ kind: 'region', value: row.name, title: `${row.name} 经销商订单` })"><span>{{ row.name.replace(/省|市/g, '') }}</span><i><u :style="{ width: `${row.dealers / maxDealers * 100}%` }" /></i><b>{{ row.dealers }}<small>家</small></b></button></div></HudPanel>
  </aside>
</template>
