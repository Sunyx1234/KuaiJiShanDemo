import { salesOrders, summarizeItems, formatQuantities, type QuantityPart } from './sales'
export const fulfillmentSteps = ['销售订单', '要货确认', '备货放行', '发货出库', '配送送达', '客户签收']
export function formatBusinessTime(at: string | null | undefined) {
  return at ? at.replace('T', ' ').slice(5, 16) : '—'
}
export const orderLifecycles = salesOrders.map((order, index) => {
  // All pages share the approved presentation schedule; original CRM documents stay intact.
  const { deliveredAt, signedAt } = order
  const wineItems = order.items.filter(item => item.category === 'wine')
  const wineUnit = wineItems[0]!.unit
  // Box shipments retain warehouse quantity; jar/container orders keep separate item units.
  const shippedQuantities: QuantityPart[] = wineUnit === '箱'
    ? [{ quantity: order.sourceShippedQuantity, unit: '箱' }]
    : summarizeItems(order.items)
  const shipmentCount = order.dispatchCodes.length
  const shipments = order.dispatchCodes.map((dispatchCode, shipmentIndex) => ({
    code: `WB${order.shippedAt.slice(0, 10).replaceAll('-', '')}${String(index + 1).padStart(2, '0')}${String(shipmentIndex + 1).padStart(2, '0')}`,
    dispatchCode, carrier: order.carrier, deliveredAt, signedAt, recipient: order.customer,
    quantities: shippedQuantities.map(part => ({ ...part, quantity: Math.floor(part.quantity / shipmentCount) + (shipmentIndex < part.quantity % shipmentCount ? 1 : 0) })),
    status: '已签收',
  }))
  const times = [order.createdAt, order.confirmedAt, order.releasedAt, order.shippedAt, deliveredAt, signedAt]
  return {
    ...order, batch: order.id, stage: 5, attention: false,
    shipped: order.sourceShippedQuantity, signed: order.sourceShippedQuantity, unit: wineUnit,
    shippedQuantities, signedQuantities: shippedQuantities,
    shippedText: formatQuantities(shippedQuantities), signedText: formatQuantities(shippedQuantities),
    deliveredAt, signedAt,
    waybillCode: shipments.map(shipment => shipment.code).join(' / '), shipments,
    logisticsException: null as null | { label: string; at: string },
    documents: [
      { label: '销售订单', codes: [order.id] }, { label: '要货单', codes: order.demandCodes },
      { label: '发货通知', codes: order.noticeCodes }, { label: '排车单', codes: order.dispatchCodes },
      { label: 'ERP出库单', codes: order.outboundCodes }, { label: '物流运单', codes: shipments.map(shipment => shipment.code) },
    ],
    timeline: fulfillmentSteps.map((label, step) => ({ label, time: formatBusinessTime(times[step]), status: step === 5 ? '已签收' : '已完成' })),
  }
})
