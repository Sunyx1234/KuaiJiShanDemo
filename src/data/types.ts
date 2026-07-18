export type StatusTone = 'normal' | 'info' | 'attention' | 'alarm' | 'critical'
export type NavKey = 'overview' | 'security' | 'people'
export type LayerKey = 'overview' | 'building' | 'device' | 'people' | 'camera' | 'risk' | 'fire' | 'environment'
export type CameraStatus = 'online' | 'offline' | 'abnormal' | 'alarm'
export type AiAlgorithm = '明火' | '烟雾' | '危险作业' | '安全帽' | '反光衣'
export type AiAlertLevel = '一般' | '关注' | '严重'
export type AiAlertStatus = '待确认' | '处理中' | '已处理'
export type SecurityRange = 'today' | '7d' | '30d'
export type VisitorStatus = '正常' | '即将超时' | '超时滞留' | '限制区告警' | '定位失联' | '已离厂'
export type VisitorScope = '全部访客' | '当前在厂' | '今日入厂' | '今日已离厂' | '异常访客'
export type VisitorTrackRange = '30m' | '1h' | '2h' | 'all'
export type VisitorExceptionStatus = '待确认' | '处理中' | '已处理'

export interface Metric {
  label: string
  value: string
  unit: string
  delta: string
  positive: boolean
  icon: string
}

export interface SceneMarker {
  id: string
  name: string
  sub: string
  x: number
  y: number
  layer: LayerKey
  tone: StatusTone
  device?: DeviceDetail
}

export interface DeviceDetail {
  name: string
  code: string
  area: string
  type: string
  rated: string
  running: string
  status: string
  businessLabel: string
  businessValue: string
  hours: string
  updated: string
  trend: number[]
  alarms: string[]
}

export interface AlertItem {
  id: string
  level: StatusTone
  category: '设备' | '人员' | '环境' | '其他'
  content: string
  area: string
  time: string
  status: string
  markerId: string
}

export interface SecurityCamera {
  id: string
  name: string
  areaId: string
  area: string
  x: number
  y: number
  status: CameraStatus
  algorithms: AiAlgorithm[]
  alertCount: number
  videoUrl?: string
  posterPosition: string
}

export interface CameraArea {
  id: string
  name: string
  x: number
  y: number
}

export interface AiAlert {
  id: string
  orderNo: string
  cameraId: string
  algorithm: AiAlgorithm
  level: AiAlertLevel
  content: string
  area: string
  time: string
  status: AiAlertStatus
  assignee: string
  snapshotUrl?: string
  snapshotPosition: string
  videoTime: number
}

export interface AiCategoryStat {
  name: AiAlgorithm
  value: number
  color: string
}

export interface AlarmHotspot {
  cameraId: string
  name: string
  area: string
  category: AiAlgorithm
  counts: Record<SecurityRange, number>
}

export interface VisitorTrackNode {
  id: string
  x: number
  y: number
  time: string
  area: string
  event: '入厂' | '普通移动' | '区域进入' | '长时间停留' | '越界' | '定位中断' | '恢复定位' | '当前位置' | '离厂'
  stay?: string
  connected?: boolean
}

export interface Visitor {
  id: string
  name: string
  maskedName: string
  company: string
  department: string
  host: string
  reason: string
  visitorCard: string
  uwbTag: string
  allowedAreas: string[]
  escortRequired: boolean
  areaId: string
  area: string
  floor: string
  x: number
  y: number
  status: VisitorStatus
  visitType: '商务访问' | '施工检修' | '物流配送' | '项目交流' | '参观访问' | '其他'
  actualEntry: string
  plannedLeave: string
  actualLeave?: string
  duration: string
  lastLocated: string
  accessStatus: string
  tagStatus: string
  track: VisitorTrackNode[]
}

export interface VisitorArea {
  id: string
  name: string
  x: number
  y: number
  density: '正常' | '较高' | '关注'
  total: number
  abnormal: number
}

export interface VisitorException {
  id: string
  visitorId: string
  type: '超时滞留' | '进入未授权区域' | '偏离活动区域' | '定位标签失联' | '长时间静止'
  level: '一般' | '关注' | '严重'
  area: string
  time: string
  status: VisitorExceptionStatus
  content: string
  trackNodeId: string
}
