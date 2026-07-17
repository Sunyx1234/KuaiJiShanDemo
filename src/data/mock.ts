import type { AlertItem, LayerKey, Metric, NavKey, SceneMarker } from './types'

export const navItems: { key: NavKey; label: string }[] = [
  { key: 'overview', label: '综合态势' },
  { key: 'device', label: '设备监测' },
  { key: 'energy', label: '能源管理' },
  { key: 'people', label: '人员管理' },
  { key: 'emergency', label: '应急指挥' },
]

const baseMetrics: Metric[] = [
  { label: '今日产能', value: '12,680', unit: '件', delta: '8.6%', positive: true, icon: 'DataLine' },
  { label: '设备在线率', value: '98.2', unit: '%', delta: '2.3%', positive: true, icon: 'Cpu' },
  { label: '能源利用率', value: '91.6', unit: '%', delta: '5.7%', positive: true, icon: 'Lightning' },
  { label: '人员在岗率', value: '97.5', unit: '%', delta: '1.8%', positive: true, icon: 'UserFilled' },
  { label: '风险点总数', value: '158', unit: '处', delta: '8.6%', positive: true, icon: 'LocationFilled' },
  { label: '今日告警数', value: '23', unit: '条', delta: '15.0%', positive: true, icon: 'BellFilled' },
]

export const metricsByNav: Record<NavKey, Metric[]> = {
  overview: baseMetrics,
  device: baseMetrics.map((m, i) => i === 0 ? { ...m, label: '运行设备', value: '2,114', unit: '台' } : m),
  energy: baseMetrics.map((m, i) => i === 0 ? { ...m, label: '今日综合能耗', value: '785', unit: 'MWh' } : m),
  people: baseMetrics.map((m, i) => i === 0 ? { ...m, label: '在岗人数', value: '2,521', unit: '人' } : m),
  emergency: baseMetrics.map((m, i) => i === 0 ? { ...m, label: '应急资源完好率', value: '99.1', unit: '%' } : m),
}

export const layerItems: { key: LayerKey; label: string; icon: string }[] = [
  { key: 'overview', label: '总览', icon: 'Grid' },
  { key: 'building', label: '建筑', icon: 'OfficeBuilding' },
  { key: 'device', label: '设备', icon: 'Cpu' },
  { key: 'people', label: '人员', icon: 'UserFilled' },
  { key: 'camera', label: '摄像头', icon: 'VideoCameraFilled' },
  { key: 'risk', label: '风险点', icon: 'WarningFilled' },
  { key: 'fire', label: '消防设施', icon: 'HelpFilled' },
  { key: 'environment', label: '环境监测', icon: 'MostlyCloudy' },
]

export const sceneMarkers: SceneMarker[] = [
  { id: 'transformer', name: '变配电室', sub: '负荷 82% · 正常', x: 20, y: 33, layer: 'device', tone: 'normal',
    device: { name: '10kV 智能配电柜', code: 'CHT-PD-1028', area: '变配电室', type: '高压配电设备', rated: '1,250 kVA', running: '826 kW', status: '正常运行', businessLabel: '今日供电量', businessValue: '18.6 MWh', hours: '18,642 h', updated: '14:01:25', trend: [62,68,65,74,71,79,82,78,85,83,88,82], alarms: ['07-12 温升预警 · 已恢复', '06-28 A相电压波动 · 已关闭'] } },
  { id: 'pump', name: '循环水泵房', sub: '3#泵 · 运行中', x: 49, y: 22, layer: 'device', tone: 'info',
    device: { name: '3# 循环水泵', code: 'CHT-WP-0303', area: '循环水泵房', type: '离心式循环泵', rated: '160 kW', running: '128 kW', status: '正常运行', businessLabel: '今日能耗', businessValue: '2,184 kWh', hours: '9,268 h', updated: '14:01:18', trend: [71,72,73,72,76,75,78,80,79,82,81,80], alarms: ['07-10 出口压力偏低 · 已恢复'] } },
  { id: 'warehouse', name: '危险品仓库', sub: '可燃气体 18%LEL', x: 66, y: 54, layer: 'risk', tone: 'critical' },
  { id: 'height', name: '高处作业风险', sub: '2人作业 · 已监护', x: 32, y: 54, layer: 'risk', tone: 'attention' },
  { id: 'waste', name: '污水处理站', sub: 'COD 36mg/L', x: 75, y: 31, layer: 'environment', tone: 'normal' },
  { id: 'camera-1', name: '东门摄像头', sub: '在线 · AI识别开启', x: 82, y: 43, layer: 'camera', tone: 'info' },
  { id: 'people-1', name: '人员聚集区域', sub: '当前 38 人', x: 74, y: 69, layer: 'people', tone: 'critical' },
  { id: 'fire-1', name: '消防栓 F-16', sub: '压力正常', x: 59, y: 73, layer: 'fire', tone: 'normal' },
  { id: 'building-1', name: '中央控制室', sub: 'A栋 · 4层', x: 46, y: 55, layer: 'building', tone: 'info' },
]

export const alerts: AlertItem[] = [
  { id: 'a1', level: 'critical', category: '环境', content: '可燃气体浓度超标', area: '危险化学品库', time: '14:00:22', status: '处置中', markerId: 'warehouse' },
  { id: 'a2', level: 'attention', category: '设备', content: '配电柜温度异常', area: '变配电室', time: '13:59:11', status: '已确认', markerId: 'transformer' },
  { id: 'a3', level: 'normal', category: '人员', content: '人员未佩戴安全帽', area: '1#生产车间', time: '13:58:33', status: '已派单', markerId: 'people-1' },
  { id: 'a4', level: 'info', category: '其他', content: '消防通道临时占用', area: '原料仓储区', time: '13:57:45', status: '待确认', markerId: 'fire-1' },
  { id: 'a5', level: 'normal', category: '环境', content: '湿度接近阈值', area: '3#生产车间', time: '13:56:12', status: '监测中', markerId: 'waste' },
]

export const energySeries = {
  day: {
    labels: ['00', '02', '04', '06', '08', '10', '12', '14', '16', '18', '20', '22', '24'],
    today: [19, 22, 25, 24, 28, 27, 31, 29, 32, 28, 27, 25, 29],
    yesterday: [17, 18, 20, 21, 24, 23, 25, 24, 26, 23, 22, 23, 24],
  },
  month: {
    labels: ['1', '4', '7', '10', '13', '16', '19', '22', '25', '28', '31'],
    today: [680, 720, 701, 755, 780, 760, 805, 821, 790, 835, 842],
    yesterday: [650, 681, 690, 712, 735, 728, 760, 771, 755, 780, 795],
  },
  year: {
    labels: ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'],
    today: [18, 19, 21, 20, 23, 24, 25, 26, 24, 27, 28, 29],
    yesterday: [17, 18, 19, 19, 21, 22, 23, 24, 23, 25, 26, 27],
  },
}

export const cameraFeeds = [
  { name: '1#生产车间·东侧', area: '生产区域', tone: 'normal', alarm: false, pos: '18% 34%' },
  { name: '危险品仓库·南侧', area: '重点区域', tone: 'critical', alarm: true, pos: '64% 52%' },
  { name: '原料仓储区·西侧', area: '仓储区域', tone: 'normal', alarm: false, pos: '44% 60%' },
  { name: '污水处理站·北侧', area: '环保区域', tone: 'normal', alarm: false, pos: '74% 30%' },
  { name: '2#生产车间·西侧', area: '生产区域', tone: 'attention', alarm: true, pos: '52% 34%' },
]
