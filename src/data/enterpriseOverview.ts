import { orderLifecycles } from './fulfillment'
import { formatQuantities, mergeQuantities } from './sales'
import type { Metric } from './types'
import { processRegions, type CampusRegion } from './processRegions'
export type OverviewOrder = typeof orderLifecycles[number]
export type OverviewPeriod = 'week' | 'month'
export type OverviewFilter = { kind: 'orders' | 'shipped' | 'signed' | 'product' | 'region' | 'day' | 'order'; value?: string; title: string }
export const overviewReportDate = '2026-10-15'
const dayMs = 86400000
export function periodBounds(period: OverviewPeriod, reportDate = overviewReportDate) {
  const date = new Date(`${reportDate}T00:00:00Z`)
  const from = period === 'month' ? `${reportDate.slice(0, 7)}-01` : new Date(date.getTime() - 6 * dayMs).toISOString().slice(0, 10)
  return { from, to: reportDate }
}
export function buildOverview(orders: OverviewOrder[], from: string, to: string, allOrders = false) {
  const within = (at: string | null) => !!at && at.slice(0, 10) >= from && at.slice(0, 10) <= to
  // The monthly presentation includes the complete approved ten-order snapshot.
  const selectedOrders = allOrders ? orders : orders.filter(order => within(order.createdAt))
  const shippedOrders = orders.filter(order => order.shipped > 0 && (allOrders || within(order.shippedAt)))
  const signedOrders = orders.filter(order => order.signed > 0 && (allOrders || within(order.signedAt)))
  const amount = selectedOrders.reduce((sum, order) => sum + Math.round(order.amount * 100), 0) / 100
  const outboundCount = new Set(shippedOrders.flatMap(order => order.outboundCodes)).size
  const signedWaybills = new Set(signedOrders.flatMap(order => order.shipments.map(shipment => shipment.code))).size
  const shippedQuantities = mergeQuantities(shippedOrders.map(order => order.shippedQuantities))
  const products = new Map<string, number>()
  const regions = new Map<string, { customers: Set<string>; amount: number }>()
  for (const order of selectedOrders) {
    for (const item of order.items) products.set(item.name, (products.get(item.name) ?? 0) + Math.round(item.amount * 100))
    const row = regions.get(order.city) ?? { customers: new Set<string>(), amount: 0 }
    row.customers.add(order.customerCode)
    row.amount += order.amount
    regions.set(order.city, row)
  }
  const productRanking = [...products].map(([name, cents]) => ({ name, amount: cents / 100 })).sort((a, b) => b.amount - a.amount)
  const topProducts = productRanking.slice(0, 3)
  const chartProducts = productRanking.length > 3 ? [...topProducts, { name: '其他产品', amount: productRanking.slice(3).reduce((sum, row) => sum + Math.round(row.amount * 100), 0) / 100 }] : topProducts
  const trend = [...selectedOrders].sort((a, b) => a.createdAt.localeCompare(b.createdAt)).map((order, index) => ({ id: order.id, label: String(index + 1).padStart(2, '0'), day: order.createdAt.slice(0, 10), amount: order.amount, count: 1 }))
  const makeMetric = (label: string, value: string, unit: string, icon: string): Metric => ({ label, value, unit, icon, delta: '', positive: true })
  return {
    orders: selectedOrders, shippedOrders, signedOrders, amount, outboundCount, shippedQuantities,
    shippedText: formatQuantities(shippedQuantities), signedWaybills, trend,
    customerCount: new Set(selectedOrders.map(order => order.customerCode)).size,
    products: chartProducts, productRanking,
    regions: [...regions].map(([name, row]) => ({ name, dealers: row.customers.size, amount: row.amount })).sort((a, b) => b.dealers - a.dealers || b.amount - a.amount),
    metrics: [makeMetric('订单数', String(selectedOrders.length), '单', 'Tickets'), makeMetric('订单金额', (amount / 10000).toLocaleString('zh-CN', { maximumFractionDigits: 2 }), '万元', 'TrendCharts'), makeMetric('出库单数', String(outboundCount), '张', 'Box'), makeMetric('签收运单数', String(signedWaybills), '单', 'CircleCheck')],
  }
}
// 与工艺页共用投影坐标；实际厂房用途与位置仍需客户确认。
export const overviewCampusRegions: CampusRegion[] = [
  { ...processRegions[2]!, id: 'brewing', label: '酿造车间', area: '酿造车间', width: 26, detail: '酿造批次与发酵工序' },
  { ...processRegions[4]!, id: 'storage', label: '陈酿酒库', area: '陈酿酒库', detail: '原酒储存与陈酿台账' },
  { ...processRegions[5]!, id: 'bottling', label: '灌装车间', area: '灌装车间', detail: '灌装产量与包装批次' },
  { ...processRegions[5]!, id: 'warehouse', label: '成品仓', area: '成品仓', x: 65, y: 48, width: 12, depth: 11, color: '#b5ade8', detail: '成品出库与订单交付' },
]
