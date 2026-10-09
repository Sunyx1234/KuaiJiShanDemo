import { salesOrders } from './sales'
import type { FactoryRecord } from './factory'
export const fulfillmentSteps = ['销售订单', '要货确认', '备货放行', '发货出库', '配送送达', '客户签收']
// 统一展示场景，非脱敏表中的真实统计或实单。拆单/多批次通过数组保留。
export const orderLifecycles = salesOrders.map((order, index) => {
  const stage = [2, 2, 2, 5, 4, 3, 5, 4][index]!
  const batch = index < 3 ? `B-26090${index + 1}` : `B-26080${index + 1}`
  const createdDate = `2026-10-${String(index + 2).padStart(2, '0')}`
  const shipped = stage >= 3 ? order.quantity : 0
  const signed = stage === 5 ? order.quantity : 0
  return {
    ...order, batch, stage, shipped, signed,
    customerCode: `DEALER-${String(index + 1).padStart(3, '0')}`, createdAt: `${createdDate}T08:00:00`,
    shippedAt: stage >= 3 ? `${createdDate}T11:00:00` : null, signedAt: stage === 5 ? `${createdDate}T13:00:00` : null,
    waybillCode: stage >= 3 ? `WB-${index + 1}` : null, logisticsException: null as null | { label: string; at: string }, unit: '箱', carrier: stage >= 3 ? '华东物流' : '待安排',
    expectedArrival: `2026-10-${index === 0 ? '20' : index === 1 ? '14' : '12'} 18:00`, attention: index === 2 || index === 4,
    items: [{ code: `SKU-${index + 1}`, name: order.product, quantity: order.quantity, unit: '箱', amount: order.amount }],
    documents: [
      { label: '销售订单', codes: [order.id] }, { label: '要货单', codes: [`DH-${index + 1}`] },
      { label: '发货通知', codes: stage >= 3 ? [`DN-${index + 1}`] : [] },
      { label: 'ERP发货 / 出库', codes: stage >= 3 ? [`DL-${index + 1}`, `OUT-${index + 1}`] : [] },
      { label: '运单', codes: stage >= 3 ? [`WB-${index + 1}`] : [] }, { label: '成品批次', codes: [batch] },
    ],
    timeline: fulfillmentSteps.map((label, step) => ({ label, time: step <= stage ? `${createdDate.slice(5, 7)}月${createdDate.slice(8, 10)}日 ${String(8 + step).padStart(2, '0')}:00` : '', status: step < stage ? '已完成' : step === stage ? order.status : '待执行' })),
  }
})
export const fulfillmentRecords: FactoryRecord[] = orderLifecycles.map(order => ({
  id: order.id, name: `${order.city} · ${order.customer}`, status: order.status, attention: order.attention,
  area: '成品出库区', batch: order.batch, device: order.id === 'SO-001' ? 'FJ-03' : order.id === 'SO-002' ? 'GT-02' : order.id === 'SO-003' ? 'GZ-01' : '—',
  progress: order.stage, x: 61, y: 60,
  facts: [['客户', order.customer], ['订单金额', `${(order.amount / 10000).toFixed(2)} 万元`], ['期望到货', `${order.expectedArrival.slice(5, 7)}月${order.expectedArrival.slice(8, 10)}日 18:00`], ['关联批次', order.batch]],
  readings: [['订单数量', `${order.quantity.toLocaleString()} 箱`, '销售单位'], ['已出库', `${order.shipped.toLocaleString()} 箱`, '正向出库'], ['已签收', `${order.signed.toLocaleString()} 箱`, '客户签收']],
  events: order.timeline.filter(node => node.time).slice(-3).reverse().map(node => [node.time, `${node.label} · ${node.status}`] as [string, string]),
}))
