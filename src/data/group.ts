import { businessReport as report } from './businessReport'
import type { ParkConfig } from './types'

// Company operating figures use the 2026 interim disclosures; order figures use the CRM snapshot.
export const groupNetworkSummary = [
  { label: '已接入园区', value: '1', unit: '个' },
  { label: '三维园区模型', value: '1', unit: '套' },
  { label: '园区所在地', value: '绍兴', unit: '' },
]

const indicator = (category: string, label: string, value: string, unit: string) => ({ category, label, value, unit })
export const groupPerformanceTopics = [
  { key: 'finance', shortLabel: '经营', title: '公司经营', hero: { period: report.period, category: '公司经营', label: '营业收入', value: (report.revenue / 1e8).toFixed(2), unit: '亿元' }, indicators: [
    indicator('盈利能力', '归母净利润', (report.netProfit / 1e8).toFixed(2), '亿元'), indicator('经营增长', '营收同比增长', String(report.revenueGrowth), '%'),
    indicator('利润增长', '归母净利润同比', String(report.profitGrowth), '%'), indicator('经营现金', '经营活动现金净额', (report.operatingCash / 1e4).toFixed(2), '万元'),
    indicator('产品销售', '酒类业务收入', (report.wineRevenue / 1e4).toFixed(2), '亿元'), indicator('经销网络', '经销商数量', report.dealers.toLocaleString(), '家'),
  ] },
  { key: 'products', shortLabel: '产品', title: '酒类销售', hero: { period: report.period, category: '酒类业务', label: '酒类销售收入', value: (report.wineRevenue / 1e4).toFixed(2), unit: '亿元' }, indicators: [
    ...report.productSales.map(row => indicator('产品档次', row.name, row.value.toLocaleString('zh-CN', { maximumFractionDigits: 2 }), '万元')),
    ...report.channelSales.map(row => indicator('销售渠道', row.name, row.value.toLocaleString('zh-CN', { maximumFractionDigits: 2 }), '万元')),
  ] },
  { key: 'network', shortLabel: '区域', title: '区域市场', hero: { period: report.period, category: '经销网络', label: '经销商数量', value: report.dealers.toLocaleString(), unit: '家' }, indicators: [
    ...report.regionalSales.map(row => indicator('区域销售', row.name, row.value.toLocaleString('zh-CN', { maximumFractionDigits: 2 }), '万元')),
    indicator('经销网络', '浙江区域经销商', '534', '家'),
  ] },
]

export const groupConnectivitySummary = [
  { label: '已接入园区', value: '1', unit: '个' },
  { label: '三维场景', value: '1', unit: '套' },
  { label: '业务视图', value: '5', unit: '类' },
]

export const groupShowcaseTopics = [
  { key: 'products', shortLabel: '产品', badge: '酒', title: '中高端黄酒', heroValue: '5.95', heroUnit: '亿元', heroLabel: '2026年上半年销售收入', items: [{ label: '收入同比增长', value: '14.17', unit: '%' }, { label: '酒类收入占比', value: (59518.81 / report.wineRevenue * 100).toFixed(1), unit: '%' }] },
  { key: 'channels', shortLabel: '渠道', badge: '渠', title: '直销与团购', heroValue: '1.65', heroUnit: '亿元', heroLabel: '2026年上半年销售收入', items: [{ label: '收入同比增长', value: '18.45', unit: '%' }, { label: '批发代理收入', value: '6.57', unit: '亿元' }] },
  { key: 'network', shortLabel: '网络', badge: '网', title: '经销商网络', heroValue: '2,009', heroUnit: '家', heroLabel: '2026年上半年报告期末', items: [{ label: '浙江区域', value: '534', unit: '家' }, { label: '江苏区域', value: '369', unit: '家' }] },
]

export const parks: ParkConfig[] = [
  {
    id: 'huijishan',
    name: '会稽山绍兴酒园区',
    shortName: '会稽山园区',
    city: '中国 · 浙江绍兴',
    // Shaoxing city center is a temporary map anchor until the site coordinates are supplied.
    longitude: 120.58,
    latitude: 30.0,
    status: 'connected',
    sceneType: 'gltf',
    sceneAsset: '/assets/models/huijishan-campus-v8.glb',
    summary: '会稽山绍兴园区数字孪生场景，可进入园区查看企业经营、生产工艺、设备运维与安全监控。',
    products: '园区三维模型、工艺区域高亮、设备运维与AI视频安监',
    positioning: '绍兴园区数字孪生展示入口',
    pinOffset: { x: 48, y: -24 },
  },
]
