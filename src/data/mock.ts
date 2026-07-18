import type { AiAlert, AiCategoryStat, AlarmHotspot, AlertItem, CameraArea, LayerKey, Metric, NavKey, SceneMarker, SecurityCamera, Visitor, VisitorArea, VisitorException } from './types'

export const navItems: { key: NavKey | 'more'; label: string; disabled?: boolean }[] = [
  { key: 'overview', label: '综合态势' },
  { key: 'security', label: '安全监控' },
  { key: 'people', label: '访客管理' },
  { key: 'more', label: '更多模块', disabled: true },
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
  security: [
    { label: '摄像头总数', value: '326', unit: '台', delta: '3.2%', positive: true, icon: 'VideoCameraFilled' },
    { label: '摄像头在线率', value: '97.9', unit: '%', delta: '0.8%', positive: true, icon: 'Connection' },
    { label: 'AI任务运行率', value: '96.8', unit: '%', delta: '1.4%', positive: true, icon: 'Cpu' },
    { label: '今日AI识别事件', value: '48', unit: '条', delta: '12.5%', positive: false, icon: 'View' },
    { label: '待处理告警', value: '7', unit: '条', delta: '22.2%', positive: false, icon: 'BellFilled' },
    { label: '严重告警', value: '2', unit: '条', delta: '33.3%', positive: false, icon: 'WarningFilled' },
  ],
  people: [
    { label: '当前在厂访客', value: '86', unit: '人', delta: '0', positive: true, icon: 'UserFilled' },
    { label: '今日实际入厂', value: '142', unit: '人', delta: '0', positive: true, icon: 'Right' },
    { label: '今日实际离厂', value: '56', unit: '人', delta: '0', positive: true, icon: 'Back' },
    { label: '定位在线率', value: '97.7', unit: '%', delta: '0', positive: true, icon: 'LocationFilled' },
    { label: '超时滞留', value: '3', unit: '人', delta: '0', positive: false, icon: 'Timer' },
    { label: '当前异常人数', value: '6', unit: '人', delta: '0', positive: false, icon: 'WarningFilled' },
  ],
}

export const layerItems: { key: LayerKey; label: string; icon: string }[] = [
  { key: 'overview', label: '总览', icon: 'Grid' },
  { key: 'building', label: '建筑', icon: 'OfficeBuilding' },
  { key: 'device', label: '设备', icon: 'Cpu' },
  { key: 'people', label: '人员', icon: 'UserFilled' },
  { key: 'camera', label: '摄像头', icon: 'VideoCameraFilled' },
]

export const sceneMarkers: SceneMarker[] = [
  { id: 'transformer', name: '变配电室', sub: '负荷 82% · 正常', x: 20, y: 33, layer: 'device', tone: 'normal',
    device: { name: '10kV 智能配电柜', code: 'CHT-PD-1028', area: '变配电室', type: '高压配电设备', rated: '1,250 kVA', running: '826 kW', status: '正常运行', businessLabel: '今日供电量', businessValue: '18.6 MWh', hours: '18,642 h', updated: '14:01:25', trend: [62,68,65,74,71,79,82,78,85,83,88,82], alarms: ['07-12 温升预警 · 已恢复', '06-28 A相电压波动 · 已关闭'] } },
  { id: 'pump', name: '循环水泵房', sub: '3#泵 · 运行中', x: 49, y: 22, layer: 'device', tone: 'info',
    device: { name: '3# 循环水泵', code: 'CHT-WP-0303', area: '循环水泵房', type: '离心式循环泵', rated: '160 kW', running: '128 kW', status: '正常运行', businessLabel: '今日能耗', businessValue: '2,184 kWh', hours: '9,268 h', updated: '14:01:18', trend: [71,72,73,72,76,75,78,80,79,82,81,80], alarms: ['07-10 出口压力偏低 · 已恢复'] } },
  { id: 'air-compressor', name: '空压站 2#机组', sub: '排气压力 0.72MPa · 运行中', x: 63, y: 43, layer: 'device', tone: 'normal',
    device: { name: '2# 离心式空压机组', code: 'CHT-AC-0206', area: '能源动力区', type: '离心式空压机', rated: '315 kW', running: '246 kW', status: '正常运行', businessLabel: '当前供气量', businessValue: '4,820 Nm³/h', hours: '12,406 h', updated: '14:01:20', trend: [68,70,72,73,76,78,77,80,81,79,78,78], alarms: ['07-15 冷却水温偏高 · 已恢复'] } },
  { id: 'assembly-line', name: '1#车间装配线', sub: '节拍 42秒 · 稼动率 94.6%', x: 35, y: 47, layer: 'device', tone: 'info',
    device: { name: '智能装配线 A', code: 'CHT-PL-A018', area: '1#生产车间', type: '自动化装配产线', rated: '180 件/h', running: '170 件/h', status: '正常生产', businessLabel: '今日产量', businessValue: '3,864 件', hours: '7,932 h', updated: '14:01:22', trend: [77,81,84,83,88,91,90,93,94,95,93,95], alarms: ['07-16 工位传感器遮挡 · 已关闭'] } },
  { id: 'solar-inverter', name: '屋顶光伏逆变器', sub: '发电 1.86MW · 并网正常', x: 55, y: 31, layer: 'device', tone: 'normal',
    device: { name: '3# 光伏并网逆变器', code: 'CHT-PV-INV03', area: '2#生产车间屋顶', type: '组串式逆变器', rated: '250 kW', running: '218 kW', status: '并网运行', businessLabel: '今日发电量', businessValue: '1.42 MWh', hours: '6,584 h', updated: '14:01:16', trend: [18,24,31,45,62,78,86,91,88,74,51,29], alarms: ['07-08 组串电流偏低 · 已恢复'] } },
  { id: 'warehouse', name: '危险品仓库', sub: '可燃气体 18%LEL', x: 66, y: 54, layer: 'risk', tone: 'critical' },
  { id: 'height', name: '高处作业风险', sub: '2人作业 · 已监护', x: 32, y: 54, layer: 'risk', tone: 'attention' },
  { id: 'waste', name: '污水处理站', sub: 'COD 36mg/L', x: 75, y: 31, layer: 'environment', tone: 'normal' },
  { id: 'camera-1', name: '东门摄像头', sub: '在线 · AI识别开启', x: 82, y: 43, layer: 'camera', tone: 'info' },
  { id: 'people-1', name: '人员聚集区域', sub: '当前 38 人', x: 74, y: 69, layer: 'people', tone: 'critical' },
  { id: 'fire-1', name: '消防栓 F-16', sub: '压力正常', x: 59, y: 73, layer: 'fire', tone: 'normal' },
  { id: 'building-1', name: '中央控制室', sub: 'A栋 · 4层', x: 46, y: 55, layer: 'building', tone: 'info' },
  { id: 'building-2', name: '1#生产车间', sub: '智能装配与检测 · 368人在岗', x: 34, y: 44, layer: 'building', tone: 'info' },
  { id: 'building-3', name: '2#生产车间', sub: '精密制造与加工 · 286人在岗', x: 55, y: 34, layer: 'building', tone: 'info' },
  { id: 'building-4', name: '原料仓储中心', sub: '库存利用率 76% · 作业正常', x: 49, y: 65, layer: 'building', tone: 'normal' },
  { id: 'building-5', name: '行政研发中心', sub: 'A/B座 · 当前 412人', x: 72, y: 63, layer: 'building', tone: 'info' },
  { id: 'building-6', name: '东门访客中心', sub: '今日到访 142人 · 通行正常', x: 82, y: 47, layer: 'building', tone: 'normal' },
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

export const securityCameraAreas: CameraArea[] = [
  { id: 'east-gate', name: '东门及访客区', x: 82, y: 43 },
  { id: 'workshop-1', name: '1#生产车间', x: 35, y: 46 },
  { id: 'workshop-2', name: '2#生产车间', x: 54, y: 34 },
  { id: 'hazmat', name: '危险品仓库', x: 66, y: 55 },
  { id: 'warehouse', name: '原料仓储区', x: 49, y: 66 },
  { id: 'water', name: '污水处理站', x: 76, y: 30 },
]

export const securityCameras: SecurityCamera[] = [
  { id: 'cam-e01', name: '东门入口枪机 E01', areaId: 'east-gate', area: '东门及访客区', x: 80.5, y: 41, status: 'online', algorithms: ['安全帽', '反光衣'], alertCount: 0, videoUrl: '/assets/videos/cam-e01.mp4', posterPosition: '82% 43%' },
  { id: 'cam-e02', name: '访客通道球机 E02', areaId: 'east-gate', area: '东门及访客区', x: 84, y: 45.5, status: 'online', algorithms: ['安全帽'], alertCount: 0, videoUrl: '/assets/videos/cam-e02.mp4', posterPosition: '79% 46%' },
  { id: 'cam-e05', name: '东门外围枪机 E05', areaId: 'east-gate', area: '东门及访客区', x: 78, y: 47.5, status: 'online', algorithms: ['安全帽', '反光衣'], alertCount: 0, videoUrl: '/assets/videos/cam-e05.mp4', posterPosition: '77% 48%' },
  { id: 'cam-w11', name: '1#车间东侧 W11', areaId: 'workshop-1', area: '1#生产车间', x: 32.5, y: 44, status: 'alarm', algorithms: ['危险作业', '安全帽', '反光衣'], alertCount: 2, videoUrl: '/assets/videos/cam-w11.mp4', posterPosition: '31% 44%' },
  { id: 'cam-w12', name: '1#车间装配线 W12', areaId: 'workshop-1', area: '1#生产车间', x: 37.5, y: 48, status: 'online', algorithms: ['安全帽', '反光衣'], alertCount: 0, videoUrl: '/assets/videos/cam-w12.mp4', posterPosition: '37% 47%' },
  { id: 'cam-w21', name: '2#车间西侧 W21', areaId: 'workshop-2', area: '2#生产车间', x: 51.5, y: 31.5, status: 'abnormal', algorithms: ['烟雾', '危险作业'], alertCount: 0, videoUrl: '/assets/videos/cam-w21.mp4', posterPosition: '52% 34%' },
  { id: 'cam-w22', name: '2#车间通道 W22', areaId: 'workshop-2', area: '2#生产车间', x: 57, y: 36.5, status: 'online', algorithms: ['安全帽'], alertCount: 0, videoUrl: '/assets/videos/cam-w22.mp4', posterPosition: '57% 36%' },
  { id: 'cam-h01', name: '危化品库南侧 H01', areaId: 'hazmat', area: '危险品仓库', x: 63.5, y: 52, status: 'alarm', algorithms: ['明火', '烟雾'], alertCount: 3, videoUrl: '/assets/videos/cam-h01.mp4', posterPosition: '64% 52%' },
  { id: 'cam-h02', name: '危化品库装卸区 H02', areaId: 'hazmat', area: '危险品仓库', x: 68.5, y: 57, status: 'online', algorithms: ['明火', '危险作业'], alertCount: 0, videoUrl: '/assets/videos/cam-h02.mp4', posterPosition: '69% 57%' },
  { id: 'cam-r01', name: '原料库西侧 R01', areaId: 'warehouse', area: '原料仓储区', x: 46.5, y: 64, status: 'online', algorithms: ['明火', '反光衣'], alertCount: 0, videoUrl: '/assets/videos/cam-r01.mp4', posterPosition: '45% 63%' },
  { id: 'cam-r02', name: '原料库通道 R02', areaId: 'warehouse', area: '原料仓储区', x: 52, y: 68, status: 'alarm', algorithms: ['烟雾', '安全帽'], alertCount: 1, videoUrl: '/assets/videos/cam-r02.mp4', posterPosition: '52% 67%' },
  { id: 'cam-s01', name: '污水站北侧 S01', areaId: 'water', area: '污水处理站', x: 73.5, y: 28, status: 'online', algorithms: ['危险作业', '反光衣'], alertCount: 0, videoUrl: '/assets/videos/cam-s01.mp4', posterPosition: '74% 30%' },
  { id: 'cam-s02', name: '污水站池区 S02', areaId: 'water', area: '污水处理站', x: 78.5, y: 32.5, status: 'online', algorithms: ['危险作业'], alertCount: 0, videoUrl: '/assets/videos/cam-s02.mp4', posterPosition: '79% 32%' },
]

export const aiCategoryStats: AiCategoryStat[] = [
  { name: '明火', value: 5, color: '#ef515c' },
  { name: '烟雾', value: 8, color: '#f48648' },
  { name: '危险作业', value: 13, color: '#f2ae42' },
  { name: '安全帽', value: 14, color: '#2aa9ff' },
  { name: '反光衣', value: 8, color: '#45d799' },
]

export const alarmHotspots: AlarmHotspot[] = [
  { cameraId: 'cam-h01', name: '危化品库南侧 H01', area: '危险品仓库', category: '明火', counts: { today: 6, '7d': 31, '30d': 108 } },
  { cameraId: 'cam-w11', name: '1#车间东侧 W11', area: '1#生产车间', category: '危险作业', counts: { today: 5, '7d': 27, '30d': 92 } },
  { cameraId: 'cam-r02', name: '原料库通道 R02', area: '原料仓储区', category: '安全帽', counts: { today: 4, '7d': 22, '30d': 77 } },
  { cameraId: 'cam-w21', name: '2#车间西侧 W21', area: '2#生产车间', category: '烟雾', counts: { today: 3, '7d': 18, '30d': 63 } },
  { cameraId: 'cam-e01', name: '东门入口枪机 E01', area: '东门及访客区', category: '反光衣', counts: { today: 2, '7d': 13, '30d': 48 } },
]

export const aiAlerts: AiAlert[] = [
  { id: 'ai-001', orderNo: 'AI-20260717-001', cameraId: 'cam-h01', algorithm: '明火', level: '严重', content: '危化品库装卸区检测到疑似明火', area: '危险品仓库', time: '14:00:22', status: '处理中', assignee: '陈志强', snapshotUrl: '/assets/images/ai-001.jpg', snapshotPosition: '64% 52%', videoTime: 12 },
  { id: 'ai-002', orderNo: 'AI-20260717-002', cameraId: 'cam-w11', algorithm: '危险作业', level: '关注', content: '作业人员进入设备吊装警戒区', area: '1#生产车间', time: '13:58:33', status: '待确认', assignee: '待分派', snapshotUrl: '/assets/images/ai-002.jpg', snapshotPosition: '31% 44%', videoTime: 8 },
  { id: 'ai-003', orderNo: 'AI-20260717-003', cameraId: 'cam-r02', algorithm: '安全帽', level: '一般', content: '检测到人员未佩戴安全帽', area: '原料仓储区', time: '13:55:18', status: '待确认', assignee: '待分派', snapshotUrl: '/assets/images/ai-003.jpg', snapshotPosition: '52% 67%', videoTime: 16 },
  { id: 'ai-004', orderNo: 'AI-20260717-004', cameraId: 'cam-h01', algorithm: '烟雾', level: '严重', content: '仓库南侧检测到烟雾扩散', area: '危险品仓库', time: '13:49:06', status: '已处理', assignee: '周海峰', snapshotUrl: '/assets/images/ai-004.jpg', snapshotPosition: '66% 54%', videoTime: 21 },
  { id: 'ai-005', orderNo: 'AI-20260717-005', cameraId: 'cam-w21', algorithm: '烟雾', level: '关注', content: '焊接区域烟雾浓度持续升高', area: '2#生产车间', time: '13:42:51', status: '处理中', assignee: '王建国', snapshotUrl: '/assets/images/ai-005.jpg', snapshotPosition: '52% 34%', videoTime: 10 },
  { id: 'ai-006', orderNo: 'AI-20260717-006', cameraId: 'cam-e01', algorithm: '反光衣', level: '一般', content: '访客通道人员未穿反光衣', area: '东门及访客区', time: '13:36:29', status: '已处理', assignee: '李晓明', snapshotUrl: '/assets/images/ai-006.jpg', snapshotPosition: '82% 43%', videoTime: 6 },
]

export const visitorAreas: VisitorArea[] = [
  { id: 'visitor-workshop-1', name: '1#生产车间', x: 35, y: 46, density: '较高', total: 18, abnormal: 2 },
  { id: 'visitor-workshop-2', name: '2#生产车间', x: 54, y: 34, density: '正常', total: 14, abnormal: 0 },
  { id: 'visitor-office', name: '行政办公区', x: 73, y: 62, density: '正常', total: 16, abnormal: 0 },
  { id: 'visitor-warehouse', name: '仓储物流区', x: 49, y: 66, density: '关注', total: 12, abnormal: 2 },
  { id: 'visitor-power', name: '能源动力区', x: 67, y: 48, density: '关注', total: 15, abnormal: 2 },
  { id: 'visitor-rd', name: '研发区域', x: 23, y: 70, density: '正常', total: 11, abnormal: 0 },
]

export const visitors: Visitor[] = [
  {
    id: 'v-001', name: '王磊', maskedName: '王*', company: '浙江华电科技有限公司', department: '能源管理部', host: '陈志强',
    reason: '能源管理系统技术交流', visitorCard: 'VIS-20260717-036', uwbTag: 'UWB-V-1036', allowedAreas: ['行政办公区', '能源动力区'],
    escortRequired: true, areaId: 'visitor-power', area: '能源动力区', floor: '室外动力区', x: 68, y: 49, status: '限制区告警',
    visitType: '项目交流', actualEntry: '09:18:36', plannedLeave: '16:30:00', duration: '7小时45分', lastLocated: '17:03:18',
    accessStatus: '身份核验通过 · 已入厂', tagStatus: '在线 · 3秒前',
    track: [
      { id: 'v1-n1', x: 84, y: 72, time: '09:18', area: '东门访客中心', event: '入厂' },
      { id: 'v1-n2', x: 75, y: 65, time: '09:36', area: '行政办公区', event: '区域进入' },
      { id: 'v1-n3', x: 67, y: 58, time: '11:20', area: '能源动力区', event: '区域进入' },
      { id: 'v1-n4', x: 64, y: 51, time: '15:48', area: '动力站北侧', event: '长时间停留', stay: '38分钟' },
      { id: 'v1-n5', x: 68, y: 49, time: '16:39', area: '能源动力区限制边界', event: '越界' },
      { id: 'v1-n6', x: 68, y: 49, time: '17:03', area: '能源动力区', event: '当前位置' },
    ],
  },
  {
    id: 'v-002', name: '李敏', maskedName: '李*', company: '苏州智造装备有限公司', department: '生产制造部', host: '赵海峰',
    reason: '产线设备验收', visitorCard: 'VIS-20260717-028', uwbTag: 'UWB-V-1028', allowedAreas: ['1#生产车间'],
    escortRequired: true, areaId: 'visitor-workshop-1', area: '1#生产车间', floor: '一层装配区', x: 34, y: 47, status: '超时滞留',
    visitType: '施工检修', actualEntry: '10:06:21', plannedLeave: '16:00:00', duration: '6小时57分', lastLocated: '17:03:16',
    accessStatus: '身份核验通过 · 已入厂', tagStatus: '在线 · 5秒前',
    track: [
      { id: 'v2-n1', x: 84, y: 72, time: '10:06', area: '东门访客中心', event: '入厂' },
      { id: 'v2-n2', x: 61, y: 67, time: '10:21', area: '厂区主干道', event: '普通移动' },
      { id: 'v2-n3', x: 45, y: 57, time: '10:32', area: '1#生产车间东门', event: '区域进入' },
      { id: 'v2-n4', x: 37, y: 49, time: '13:20', area: '装配线A区', event: '长时间停留', stay: '1小时12分' },
      { id: 'v2-n5', x: 34, y: 47, time: '17:03', area: '1#生产车间', event: '当前位置' },
    ],
  },
  {
    id: 'v-003', name: '刘杰', maskedName: '刘*', company: '上海电气服务有限公司', department: '设备动力部', host: '王建国',
    reason: '动力设备巡检', visitorCard: 'VIS-20260717-019', uwbTag: 'UWB-V-1019', allowedAreas: ['能源动力区'],
    escortRequired: false, areaId: 'visitor-power', area: '能源动力区', floor: '循环水泵房', x: 61, y: 42, status: '定位失联',
    visitType: '施工检修', actualEntry: '11:12:08', plannedLeave: '17:30:00', duration: '5小时51分', lastLocated: '16:48:02',
    accessStatus: '身份核验通过 · 已入厂', tagStatus: '失联 · 15分钟前',
    track: [
      { id: 'v3-n1', x: 84, y: 72, time: '11:12', area: '东门访客中心', event: '入厂' },
      { id: 'v3-n2', x: 72, y: 55, time: '11:31', area: '能源动力区南门', event: '区域进入' },
      { id: 'v3-n3', x: 64, y: 45, time: '14:05', area: '循环水泵房', event: '普通移动' },
      { id: 'v3-n4', x: 61, y: 42, time: '16:48', area: '循环水泵房', event: '定位中断', connected: false },
    ],
  },
  {
    id: 'v-004', name: '周建国', maskedName: '周**', company: '杭州数智工业研究院', department: '数字化中心', host: '李晓明',
    reason: '数字孪生项目交流', visitorCard: 'VIS-20260717-042', uwbTag: 'UWB-V-1042', allowedAreas: ['行政办公区', '研发区域'],
    escortRequired: false, areaId: 'visitor-office', area: '行政办公区', floor: 'A栋三层', x: 72, y: 64, status: '正常',
    visitType: '项目交流', actualEntry: '13:26:45', plannedLeave: '18:00:00', duration: '3小时36分', lastLocated: '17:03:20',
    accessStatus: '身份核验通过 · 已入厂', tagStatus: '在线 · 1秒前',
    track: [
      { id: 'v4-n1', x: 84, y: 72, time: '13:26', area: '东门访客中心', event: '入厂' },
      { id: 'v4-n2', x: 76, y: 68, time: '13:38', area: '行政办公区', event: '区域进入' },
      { id: 'v4-n3', x: 72, y: 64, time: '17:03', area: 'A栋三层会议室', event: '当前位置' },
    ],
  },
  {
    id: 'v-005', name: '张森', maskedName: '张*', company: '宁波安捷物流有限公司', department: '仓储物流部', host: '孙伟',
    reason: '原材料配送', visitorCard: 'VIS-20260717-051', uwbTag: 'UWB-V-1051', allowedAreas: ['仓储物流区'],
    escortRequired: false, areaId: 'visitor-warehouse', area: '仓储物流区', floor: '原料库月台', x: 50, y: 67, status: '即将超时',
    visitType: '物流配送', actualEntry: '15:02:12', plannedLeave: '17:15:00', duration: '2小时01分', lastLocated: '17:03:17',
    accessStatus: '车辆及人员核验通过', tagStatus: '在线 · 4秒前',
    track: [
      { id: 'v5-n1', x: 84, y: 72, time: '15:02', area: '东门访客中心', event: '入厂' },
      { id: 'v5-n2', x: 66, y: 73, time: '15:18', area: '物流通道', event: '普通移动' },
      { id: 'v5-n3', x: 52, y: 68, time: '15:26', area: '原料库月台', event: '区域进入' },
      { id: 'v5-n4', x: 50, y: 67, time: '17:03', area: '仓储物流区', event: '当前位置' },
    ],
  },
  {
    id: 'v-006', name: '陈凯', maskedName: '陈*', company: '温州高新材料有限公司', department: '生产制造部', host: '郑涛',
    reason: '材料工艺验证', visitorCard: 'VIS-20260717-063', uwbTag: 'UWB-V-1063', allowedAreas: ['2#生产车间'],
    escortRequired: true, areaId: 'visitor-workshop-2', area: '2#生产车间', floor: '二层工艺区', x: 55, y: 35, status: '正常',
    visitType: '商务访问', actualEntry: '14:18:09', plannedLeave: '17:45:00', duration: '2小时45分', lastLocated: '17:03:19',
    accessStatus: '身份核验通过 · 已入厂', tagStatus: '在线 · 2秒前',
    track: [
      { id: 'v6-n1', x: 84, y: 72, time: '14:18', area: '东门访客中心', event: '入厂' },
      { id: 'v6-n2', x: 68, y: 55, time: '14:31', area: '厂区主干道', event: '普通移动' },
      { id: 'v6-n3', x: 58, y: 39, time: '14:43', area: '2#生产车间南门', event: '区域进入' },
      { id: 'v6-n4', x: 55, y: 35, time: '17:03', area: '二层工艺区', event: '当前位置' },
    ],
  },
  {
    id: 'v-007', name: '赵强', maskedName: '赵*', company: '南京工业设计院', department: '研发中心', host: '吴昊',
    reason: '实验室参观', visitorCard: 'VIS-20260717-012', uwbTag: 'UWB-V-1012', allowedAreas: ['研发区域'],
    escortRequired: true, areaId: 'visitor-rd', area: '研发区域', floor: '研发楼二层', x: 24, y: 69, status: '已离厂',
    visitType: '参观访问', actualEntry: '08:42:15', plannedLeave: '12:00:00', actualLeave: '11:48:36', duration: '3小时06分', lastLocated: '11:48:30',
    accessStatus: '已离厂', tagStatus: '标签已回收',
    track: [
      { id: 'v7-n1', x: 84, y: 72, time: '08:42', area: '东门访客中心', event: '入厂' },
      { id: 'v7-n2', x: 25, y: 70, time: '09:08', area: '研发区域', event: '区域进入' },
      { id: 'v7-n3', x: 84, y: 72, time: '11:48', area: '东门访客中心', event: '离厂' },
    ],
  },
]

export const visitorExceptions: VisitorException[] = [
  { id: 've-001', visitorId: 'v-001', type: '进入未授权区域', level: '严重', area: '能源动力区', time: '16:39:25', status: '处理中', content: '访客进入动力站限制边界', trackNodeId: 'v1-n5' },
  { id: 've-002', visitorId: 'v-002', type: '超时滞留', level: '关注', area: '1#生产车间', time: '16:30:00', status: '待确认', content: '访客已超过计划离厂时间33分钟', trackNodeId: 'v2-n5' },
  { id: 've-003', visitorId: 'v-003', type: '定位标签失联', level: '关注', area: '能源动力区', time: '16:48:02', status: '处理中', content: 'UWB标签连续15分钟无心跳', trackNodeId: 'v3-n4' },
  { id: 've-004', visitorId: 'v-005', type: '长时间静止', level: '一般', area: '仓储物流区', time: '16:12:44', status: '已处理', content: '访客在原料库月台静止超过30分钟', trackNodeId: 'v5-n4' },
  { id: 've-005', visitorId: 'v-001', type: '偏离活动区域', level: '一般', area: '能源动力区', time: '15:52:17', status: '已处理', content: '访客短时偏离申报访问路线', trackNodeId: 'v1-n4' },
]
