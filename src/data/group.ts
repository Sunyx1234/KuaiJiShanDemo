import type { ParkConfig } from './types'

// The campus figures below are demo values shared with the park dashboard.
// Replace them when Huijishan's production data and reporting definitions arrive.
export const groupNetworkSummary = [
  { label: '已接入园区', value: '1', unit: '个' },
  { label: '三维园区模型', value: '1', unit: '套' },
  { label: '园区所在地', value: '绍兴', unit: '' },
]

export const groupPerformanceTopics = [
  {
    key: 'operations',
    shortLabel: '运营',
    title: '运营态势',
    description: '当前为界面演示数据，正式指标与口径待园区业务确认。',
    hero: { period: '今日', category: '园区运营', label: '设备在线率', value: '98.2', unit: '%', badge: '演示数据' },
    indicators: [
      { category: '设备运行', label: '运行设备', value: '2,114', unit: '台' },
      { category: '设备运行', label: '维护设备', value: '58', unit: '台' },
      { category: '环境监测', label: '环境安全指数', value: '82.3', unit: '' },
      { category: '能源利用', label: '能源利用率', value: '91.6', unit: '%' },
      { category: '人员管理', label: '在岗率', value: '97.5', unit: '%' },
      { category: '园区访客', label: '当前在厂', value: '86', unit: '人' },
    ],
  },
  {
    key: 'safety',
    shortLabel: '安全',
    title: '安全态势',
    description: '当前为界面演示数据，正式告警与处置数据待园区系统接入。',
    hero: { period: '今日', category: '安全监控', label: '今日告警', value: '23', unit: '条', badge: '演示数据' },
    indicators: [
      { category: '视频监控', label: '摄像头总数', value: '326', unit: '台' },
      { category: '视频监控', label: '在线摄像头', value: '319', unit: '台' },
      { category: 'AI 识别', label: '今日识别事件', value: '48', unit: '条' },
      { category: '告警处置', label: '待处理告警', value: '7', unit: '条' },
      { category: '访客定位', label: '定位在线率', value: '97.7', unit: '%' },
      { category: '访客定位', label: '当前异常人数', value: '6', unit: '人' },
    ],
  },
]

export const groupConnectivitySummary = [
  { label: '已接入园区', value: '1', unit: '个' },
  { label: '三维场景', value: '1', unit: '套' },
  { label: '业务视图', value: '3', unit: '类' },
]

export const groupShowcaseTopics = [
  {
    key: 'energy', shortLabel: '能源', badge: '能', title: '园区能源',
    heroValue: '91.6', heroUnit: '%', heroLabel: '能源利用率',
    items: [
      { label: '今日综合能耗', value: '785', unit: 'MWh' },
      { label: '较昨日变化', value: '-8.2', unit: '%' },
    ],
    description: '当前为界面演示数据，能源统计口径待确认。',
  },
  {
    key: 'environment', shortLabel: '环境', badge: '环', title: '园区环境',
    heroValue: '28.6', heroUnit: '°C', heroLabel: '当前温度',
    items: [
      { label: '空气湿度', value: '54.7', unit: '%RH' },
      { label: 'PM2.5', value: '18', unit: 'μg/m³' },
    ],
    description: '当前为界面演示数据，环境监测设备接入后更新。',
  },
  {
    key: 'visitors', shortLabel: '访客', badge: '访', title: '园区访客',
    heroValue: '86', heroUnit: '人', heroLabel: '当前在厂访客',
    items: [
      { label: '今日实际入厂', value: '142', unit: '人' },
      { label: '超时滞留', value: '3', unit: '人' },
    ],
    description: '当前为界面演示数据，访客数据口径待确认。',
  },
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
    sceneAsset: '/assets/models/huijishan-campus-v1.glb',
    summary: '会稽山绍兴园区数字孪生场景，可进入园区查看三维模型、安监与访客演示视图。',
    products: '园区三维模型、安监场景、访客管理',
    positioning: '绍兴园区数字孪生展示入口',
    pinOffset: { x: 48, y: -24 },
  },
]
