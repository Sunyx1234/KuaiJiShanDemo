import { factoryMetrics, factoryThemes } from './factory'
import type { ParkConfig } from './types'

// The campus figures below are demo values shared with the park dashboard.
// Replace them when Huijishan's production data and reporting definitions arrive.
export const groupNetworkSummary = [
  { label: '已接入园区', value: '1', unit: '个' },
  { label: '三维园区模型', value: '1', unit: '套' },
  { label: '园区所在地', value: '绍兴', unit: '' },
]

export const groupPerformanceTopics = (['production', 'quality', 'equipment'] as const).map(key => ({
  key, shortLabel: key === 'production' ? '生产' : key === 'quality' ? '质量' : '设备',
  title: factoryThemes[key].title,
  hero: { period: '当前', category: factoryThemes[key].title, label: factoryMetrics[key][0]!.label, value: factoryMetrics[key][0]!.value, unit: factoryMetrics[key][0]!.unit },
  indicators: factoryMetrics[key].map(metric => ({ category: factoryThemes[key].title, label: metric.label, value: metric.value, unit: metric.unit })),
}))

export const groupConnectivitySummary = [
  { label: '已接入园区', value: '1', unit: '个' },
  { label: '三维场景', value: '1', unit: '套' },
  { label: '业务视图', value: '5', unit: '类' },
]

export const groupShowcaseTopics = [
  { key: 'production', shortLabel: '工艺', badge: '酿', title: '黄酒生产工艺', heroValue: '6', heroUnit: '环节', heroLabel: '工艺节点与园区区域联动', items: [{ label: '在制批次', value: '3', unit: '批' }, { label: '灌装完成率', value: '72', unit: '%' }] },
  { key: 'quality', shortLabel: '追溯', badge: '质', title: '批次质量追溯', heroValue: '3', heroUnit: '批', heroLabel: '生产与检验关联批次', items: [{ label: '待复检指标', value: '1', unit: '项' }, { label: '待放行批次', value: '2', unit: '批' }] },
  { key: 'equipment', shortLabel: '设备', badge: '机', title: '关键设备运维', heroValue: '3', heroUnit: '台', heroLabel: '关键设备档案', items: [{ label: '运行设备', value: '3', unit: '台' }, { label: '维护关注', value: '1', unit: '项' }] },
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
    summary: '会稽山绍兴园区数字孪生场景，可进入园区查看生产工艺、质量追溯、设备运维与订单履约。',
    products: '园区三维模型、工艺区域高亮、批次追溯与订单履约',
    positioning: '绍兴园区数字孪生展示入口',
    pinOffset: { x: 48, y: -24 },
  },
]
