import { bottlingDevices, fermentationDevices, pressDevices, steamerDevices } from './processEquipment'
import { processRegions } from './processRegions'
import type { Metric } from './types'

export type OperationStatus = '正常运行' | '预警' | '故障停机'
export interface OperationDevice {
  id: string; name: string; processIndex: number; zone?: 'pre' | 'post'; area: string; team: string
  status: OperationStatus; health: '健康' | '关注' | '异常'; reason: string
  lastService: string; nextService: string; parameters: [string, string, string][]
}
export interface OperationTask {
  id: string; deviceId: string; name: string; type: '故障维修' | '异常排查' | '定期保养' | '日常点检'
  owner: string; status: '待执行' | '处理中' | '待验收' | '已完成'; createdAt: string; description: string
}
export interface MaintenanceEvent {
  id: string; deviceId: string; taskId?: string; type: OperationTask['type'] | '异常告警'
  time: string; description: string; status: string
}
const today = () => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Shanghai' }).format(new Date())
export const serviceOverdue = (device: OperationDevice) => device.nextService < today()
export const serviceDue = (device: OperationDevice) => device.nextService <= today()
const registry: { id: string; name: string; processIndex: number; zone?: 'pre' | 'post' }[] = [
  { id: 'YL-T01', name: '1# 原料输送机', processIndex: 0 },
  ...steamerDevices.map(d => ({ ...d, processIndex: 1 })),
  ...fermentationDevices.map(d => ({ ...d, processIndex: 2 })),
  ...pressDevices.map(d => ({ ...d, processIndex: 3 })),
  { id: 'GT-T01', name: '1# 勾调罐', processIndex: 4 },
  { id: 'GT-T02', name: '2# 勾调罐', processIndex: 4 },
  ...bottlingDevices.map(d => ({ ...d, processIndex: 5 })),
]
export const operationDevices: OperationDevice[] = registry.map((device, index) => {
  const fault = device.id === 'YZ-T01', warning = ['QF-T03', 'GZ-T03'].includes(device.id)
  const zone = device.zone
  const parameters: [string, string, string][][] = [
    [['输送速度', '12 m/min', '运行平稳'], ['电机电流', '4.2 A', '额定上限 8 A'], ['累计运行', '128 h', '本月累计']],
    [['蒸煮温度', '99.2 °C', '工作区间 98–100 °C'], ['供汽压力', '0.14 MPa', '工作区间 0.10–0.25 MPa'], ['蒸煮时长', '15 min', '当前批次']],
    [['罐体温度', warning ? '28.8 °C' : zone === 'post' ? '16.2 °C' : `${23 + index % 3}.2 °C`, warning ? '高温预警 · 上限 25 °C' : zone === 'post' ? '控制区间 14–18 °C' : '控制区间 22–25 °C'], ['发酵时长', zone === 'post' ? '288 h' : '72 h', '当前批次累计'], ['罐体液位', `${68 + index % 12} %`, '安全上限 85 %']],
    [['工作压力', '0.00 MPa', '液压故障 · 已停机卸压'], ['运行电流', '0.0 A', '停机联锁已生效'], ['运行时长', '628 h', '累计运行']],
    [['罐体液位', index % 2 ? '64 %' : '72 %', '安全上限 85 %'], ['酒液温度', '22.4 °C', '工作区间 18–25 °C'], ['搅拌状态', '运行中', '搅拌转速 60 r/min']],
    [['灌装速度', '120 瓶/min', warning ? '电流预警 · 已降速运行' : '整线联动节拍'], ['累计产量', '8,640 瓶', '本班整线累计'], ['运行电流', warning ? '24.6 A' : '12.8 A', warning ? '高电流预警 · 上限 22 A' : '额定上限 22 A']],
  ]
  return { id: device.id, name: device.name, processIndex: device.processIndex, zone,
    area: zone ? `${zone === 'pre' ? '前' : '后'}发酵区` : processRegions[device.processIndex]!.area,
    team: ['原料保障班', '蒸煮一班', '酿造一班', '压榨维修班', '勾调一班', '灌装机修班'][device.processIndex]!,
    status: fault ? '故障停机' : warning ? '预警' : '正常运行', health: fault ? '异常' : warning ? '关注' : '健康',
    reason: fault ? '液压站压力异常，停机待维修' : warning ? device.id === 'QF-T03' ? '罐温高于控制上限，待排查冷却回路' : '驱动电流偏高，已降速运行' : '',
    lastService: '2026-10-01', nextService: device.id === 'HF-T02' ? '2026-10-17' : device.id === 'ZFJ-T02' ? '2026-10-19' : '2026-11-01',
    parameters: parameters[device.processIndex]!,
  }
})
export const operationTasks: OperationTask[] = operationDevices.flatMap(device => {
  const tasks: OperationTask[] = [{ id: `DJ-${device.id}`, deviceId: device.id, name: '班前设备点检', type: '日常点检', owner: device.team, status: '已完成', createdAt: '2026-10-19 07:30', description: '检查设备外观、联锁及润滑状态，结果已归档。' }]
  if (device.status !== '正常运行') tasks.unshift({ id: `WX-${device.id}`, deviceId: device.id,
    name: device.id === 'YZ-T01' ? '液压站密封检修' : device.id === 'QF-T03' ? '发酵罐冷却回路排查' : '灌装驱动电流排查',
    type: device.status === '故障停机' ? '故障维修' : '异常排查', owner: device.id === 'YZ-T01' ? '陈建国' : '王志强',
    status: device.id === 'YZ-T01' ? '处理中' : '待执行', createdAt: '2026-10-19 09:40', description: `${device.reason}。处理后须完成试运行和班组验收。` })
  if (serviceDue(device)) tasks.unshift({ id: `BY-${device.id}`, deviceId: device.id, name: '周期润滑与密封保养', type: '定期保养', owner: '李明', status: '待执行', createdAt: '2026-10-16 15:00', description: `计划日期 ${device.nextService}，检查密封、润滑及仪表连接，完成后提交验收。` })
  return tasks
})
export const maintenanceEvents: MaintenanceEvent[] = operationDevices.flatMap(device => [
  ...(device.reason ? [{ id: `AL-${device.id}`, deviceId: device.id, taskId: `WX-${device.id}`, type: '异常告警' as const, time: '2026-10-19 09:40', description: device.reason, status: device.status === '故障停机' ? '维修处理中' : '待排查' }] : []),
  ...operationTasks.filter(task => task.deviceId === device.id && task.status !== '已完成').map(task => ({ id: `EV-${task.id}`, deviceId: device.id, taskId: task.id, type: task.type, time: task.createdAt, description: task.name, status: task.status })),
  { id: `DJ-${device.id}`, deviceId: device.id, taskId: `DJ-${device.id}`, type: '日常点检' as const, time: '2026-10-19 08:00', description: '班前外观、联锁及润滑检查完成', status: '已完成' },
  { id: `BY-${device.id}`, deviceId: device.id, type: '定期保养' as const, time: '2026-10-01 15:00', description: '密封与润滑保养完成，试运行验收通过', status: '已归档' },
])
export function equipmentMetrics(): Metric[] {
  const normal = operationDevices.filter(d => d.status === '正常运行').length
  const fault = operationDevices.filter(d => d.status === '故障停机').length
  const values: [string, string, string, string][] = [
    ['设备总数', String(operationDevices.length), '台', 'Cpu'], ['正常运行', String(normal), '台', 'CircleCheck'],
    ['异常设备', String(operationDevices.length - normal), '台', 'Warning'],
    ['待执行保养', String(operationTasks.filter(t => t.type === '定期保养' && t.status !== '已完成').length), '项', 'Tools'],
    ['设备完好率', ((operationDevices.length - fault) / operationDevices.length * 100).toFixed(1), '%', 'DataLine'],
    ['待处理工单', String(operationTasks.filter(t => t.status !== '已完成').length), '单', 'Tickets'],
  ]
  return values.map(([label, value, unit, icon]) => ({ label, value, unit, icon, delta: '', positive: true }))
}
