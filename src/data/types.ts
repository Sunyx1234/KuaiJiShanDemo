export type StatusTone = 'normal' | 'info' | 'attention' | 'alarm' | 'critical'
export type NavKey = 'overview' | 'device' | 'energy' | 'people' | 'emergency'
export type LayerKey = 'overview' | 'building' | 'device' | 'people' | 'camera' | 'risk' | 'fire' | 'environment'

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
