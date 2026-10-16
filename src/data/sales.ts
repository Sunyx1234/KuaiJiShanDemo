import snapshot from './crmOrderSnapshot.json'
import { orderSchedules } from './orderTimeline'

export interface OrderItem {
  code: string; name: string; spec: string; quantity: number; unit: string; unitCode: string
  category: 'wine' | 'packaging'; amount: number; paidAmount: number
}
export interface QuantityPart { quantity: number; unit: string }
export function summarizeItems(items: OrderItem[]): QuantityPart[] {
  const totals = new Map<string, number>()
  for (const item of items) {
    const unit = item.category === 'packaging' ? '件包装' : item.unit
    totals.set(unit, (totals.get(unit) ?? 0) + item.quantity)
  }
  return [...totals].map(([unit, quantity]) => ({ unit, quantity })).sort((a, b) => Number(a.unit === '件包装') - Number(b.unit === '件包装'))
}
export function formatQuantities(parts: QuantityPart[]) {
  return parts.filter(part => part.quantity > 0).map(part => `${part.quantity.toLocaleString('zh-CN')} ${part.unit}`).join(' · ')
}
export function mergeQuantities(groups: QuantityPart[][]): QuantityPart[] {
  const totals = new Map<string, number>()
  for (const parts of groups) for (const part of parts) totals.set(part.unit, (totals.get(part.unit) ?? 0) + part.quantity)
  return [...totals].map(([unit, quantity]) => ({ unit, quantity })).sort((a, b) => Number(a.unit === '件包装') - Number(b.unit === '件包装'))
}
export const salesOrders = snapshot.map(source => {
  const schedule = orderSchedules[source.id]
  if (!schedule) throw new Error(`Missing order schedule: ${source.id}`)
  const items = source.items as OrderItem[]
  const quantities = summarizeItems(items)
  return {
    ...source, ...schedule, items, quantities, quantityText: formatQuantities(quantities),
    quantity: items.filter(item => item.category === 'wine').reduce((sum, item) => sum + item.quantity, 0),
    customerCode: source.customer, status: '已签收', paidAmount: source.amount,
    productLabel: `${source.product} · ${source.spec}`, additionalItemCount: items.length - 1,
    localDelivery: source.city === '绍兴',
    destinationLabel: source.city === '绍兴' ? (source.address.includes('上虞') ? '上虞区' : '越城区') : source.city,
  }
})
export const salesCycleSeconds = 8
export function formatSalesAmount(amount: number) {
  return (amount / 10000).toLocaleString('zh-CN', { maximumFractionDigits: 2 })
}
