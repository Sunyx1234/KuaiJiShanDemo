// 展示用订单和地市中心坐标，均不代表真实客户、销售额或物流状态。
export const salesOrders = [
  { id: 'SO-001', city: '北京', province: '北京市', latitude: 39.9, longitude: 116.4, customer: '华北渠道客户', product: '花雕黄酒 · 500mL × 6', quantity: 1200, amount: 288000, status: '生产中' },
  { id: 'SO-002', city: '上海', province: '上海市', latitude: 31.2, longitude: 121.5, customer: '华东渠道客户', product: '陈酿黄酒 · 500mL × 6', quantity: 2400, amount: 432000, status: '备货中' },
  { id: 'SO-003', city: '成都', province: '四川省', latitude: 30.7, longitude: 104.1, customer: '西南渠道客户', product: '纯酿黄酒 · 500mL × 6', quantity: 800, amount: 192000, status: '待复检' },
  { id: 'SO-004', city: '广州', province: '广东省', latitude: 23.1, longitude: 113.3, customer: '华南渠道客户', product: '纯酿黄酒 · 500mL × 6', quantity: 1500, amount: 270000, status: '已签收' },
  { id: 'SO-005', city: '武汉', province: '湖北省', latitude: 30.6, longitude: 114.3, customer: '华中渠道客户', product: '花雕黄酒 · 500mL × 6', quantity: 960, amount: 172800, status: '配送中' },
  { id: 'SO-006', city: '西安', province: '陕西省', latitude: 34.3, longitude: 108.9, customer: '西北渠道客户', product: '陈酿黄酒 · 500mL × 6', quantity: 600, amount: 144000, status: '已发货' },
  { id: 'SO-007', city: '南京', province: '江苏省', latitude: 32.1, longitude: 118.8, customer: '江苏渠道客户', product: '纯酿黄酒 · 500mL × 6', quantity: 1800, amount: 324000, status: '已签收' },
  { id: 'SO-008', city: '深圳', province: '广东省', latitude: 22.5, longitude: 114.1, customer: '深圳渠道客户', product: '花雕黄酒 · 500mL × 6', quantity: 720, amount: 129600, status: '配送中' },
]
export const salesCycleSeconds = 8
export function formatSalesAmount(amount: number) {
  return (amount / 10000).toLocaleString('zh-CN', { maximumFractionDigits: 2 })
}
