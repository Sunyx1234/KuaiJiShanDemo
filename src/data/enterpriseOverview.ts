import { orderLifecycles } from './fulfillment'
import type { Metric } from './types'
import { processRegions, type CampusRegion } from './processRegions'
export type OverviewOrder = typeof orderLifecycles[number]
export type OverviewPeriod = 'week' | 'month'
export type OverviewFilter = { kind: 'orders' | 'shipped' | 'signed' | 'product' | 'region' | 'day'; value?: string; title: string }
export const overviewReportDate = '2026-10-09'
const dayMs = 86400000
export function periodBounds(period: OverviewPeriod, reportDate = overviewReportDate) {
  const date = new Date(`${reportDate}T00:00:00Z`)
  const from = period === 'month' ? `${reportDate.slice(0, 7)}-01` : new Date(date.getTime() - 6 * dayMs).toISOString().slice(0, 10)
  return { from, to: reportDate }
}
export function buildOverview(orders: OverviewOrder[], from: string, to: string) {
  const within = (at: string | null) => !!at && at.slice(0, 10) >= from && at.slice(0, 10) <= to
  const selectedOrders = orders.filter(order => within(order.createdAt))
  const shippedOrders = orders.filter(order => order.shipped > 0 && within(order.shippedAt))
  const signedOrders = orders.filter(order => order.signed > 0 && order.waybillCode && within(order.signedAt))
  const amount = selectedOrders.reduce((sum, order) => sum + order.amount, 0)
  const shipped = shippedOrders.reduce((sum, order) => sum + order.shipped, 0)
  const signedWaybills = new Set(signedOrders.map(order => order.waybillCode)).size
  const products = new Map<string, number>()
  const regions = new Map<string, { customers: Set<string>; amount: number }>()
  for (const order of selectedOrders) {
    for (const item of order.items) {
      const name = item.name.split(' · ')[0]!
      products.set(name, (products.get(name) ?? 0) + item.amount)
    }
    const row = regions.get(order.province) ?? { customers: new Set<string>(), amount: 0 }
    row.customers.add(order.customerCode)
    row.amount += order.amount
    regions.set(order.province, row)
  }
  const trend: { day: string; amount: number; count: number }[] = []
  for (let time = Date.parse(`${from}T00:00:00Z`); time <= Date.parse(`${to}T00:00:00Z`); time += dayMs) {
    const day = new Date(time).toISOString().slice(0, 10)
    const matches = selectedOrders.filter(order => order.createdAt.slice(0, 10) === day)
    trend.push({ day, amount: matches.reduce((sum, order) => sum + order.amount, 0), count: matches.length })
  }
  const makeMetric = (label: string, value: string, unit: string, icon: string): Metric => ({ label, value, unit, icon, delta: '', positive: true })
  return {
    orders: selectedOrders, shippedOrders, signedOrders, amount, shipped, signedWaybills, trend,
    products: [...products].map(([name, amount]) => ({ name, amount })).sort((a, b) => b.amount - a.amount),
    regions: [...regions].map(([name, row]) => ({ name, dealers: row.customers.size, amount: row.amount })).sort((a, b) => b.dealers - a.dealers || b.amount - a.amount),
    metrics: [makeMetric('订单数', String(selectedOrders.length), '单', 'Tickets'), makeMetric('订单金额', (amount / 10000).toLocaleString('zh-CN', { maximumFractionDigits: 2 }), '万元', 'TrendCharts'), makeMetric('累计出库量', shipped.toLocaleString(), '箱', 'Box'), makeMetric('签收运单数', String(signedWaybills), '单', 'CircleCheck')],
  }
}
// 与工艺页共用投影坐标；实际厂房用途与位置仍需客户确认。
export const overviewCampusRegions: CampusRegion[] = [
  { ...processRegions[2]!, id: 'brewing', label: '酿造车间', area: '酿造车间', width: 26, detail: '酿造批次与发酵工序' },
  { ...processRegions[4]!, id: 'storage', label: '陈酿酒库', area: '陈酿酒库', detail: '原酒储存与陈酿台账' },
  { ...processRegions[5]!, id: 'bottling', label: '灌装车间', area: '灌装车间', detail: '灌装产量与包装批次' },
  { ...processRegions[5]!, id: 'warehouse', label: '成品仓', area: '成品仓', x: 65, y: 48, width: 12, depth: 11, color: '#b5ade8', detail: '成品出库与订单交付' },
]
