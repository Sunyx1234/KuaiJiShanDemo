import { fulfillmentRecords, fulfillmentSteps, orderLifecycles } from './fulfillment'
import type { Metric } from './types'

// 展示场景数据；工艺、指标口径与设备位置待客户确认后由业务接口替换。
export type FactoryTheme = 'overview' | 'production' | 'quality' | 'equipment' | 'fulfillment'
export interface FactoryRecord {
  id: string
  name: string
  status: string
  attention?: boolean
  area: string
  batch: string
  device: string
  progress: number
  facts: [string, string][]
  readings: [string, string, string][]
  events: [string, string][]
  x: number
  y: number
}
export const processSteps = ['原料验收', '浸米蒸煮', '糖化发酵', '压榨煎酒', '储存勾调', '灌装入库']
export const traceSteps = ['原料批次', '酿造批次', '过程检测', '成品检测', '质量放行', '入库交付']
export const maintenanceSteps = ['状态采集', '异常识别', '维护计划', '检修执行', '复核验收', '记录归档']
export const productionRecords: FactoryRecord[] = [
  { id: 'B-260901', name: '花雕酒 · 酿造批次', status: '发酵中', area: '酿造区', batch: 'B-260901', device: 'FJ-03', progress: 2, x: 34, y: 44,
    facts: [['生产订单', 'MO-260901'], ['计划产量', '36 kL'], ['原料批次', 'RM-260828'], ['计划入库', '10月18日']],
    readings: [['发酵温度', '28.6 °C', '工艺监测'], ['发酵时长', '192 h', '过程累计'], ['罐体液位', '76 %', '运行参数']],
    events: [['08:30', '班组完成巡检，发酵参数已记录'], ['07:10', '原料投料记录已关联批次'], ['昨日 16:20', '蒸煮工序完成，转入发酵']], },
  { id: 'B-260902', name: '陈酿酒 · 勾调批次', status: '勾调中', area: '储存勾调区', batch: 'B-260902', device: 'GT-02', progress: 4, x: 55, y: 34,
    facts: [['生产订单', 'MO-260902'], ['计划产量', '24 kL'], ['原酒批次', 'YW-230916'], ['计划入库', '10月12日']],
    readings: [['罐体温度', '22.4 °C', '工艺监测'], ['勾调进度', '68 %', '配料执行'], ['罐体液位', '64 %', '运行参数']],
    events: [['09:20', '勾调配方执行记录已归集'], ['08:40', '原酒批次出库，转入勾调罐'], ['昨日 15:10', '原酒感官评定完成']], },
  { id: 'B-260903', name: '纯酿酒 · 灌装批次', status: '待复检', attention: true, area: '灌装区', batch: 'B-260903', device: 'GZ-01', progress: 5, x: 49, y: 65,
    facts: [['生产订单', 'MO-260903'], ['计划产量', '12,000 瓶'], ['包装规格', '500 mL'], ['当前产量', '8,640 瓶']],
    readings: [['灌装节拍', '120 瓶/min', '运行参数'], ['累计产量', '8,640 瓶', '批次累计'], ['复检样品', '1 组', '待检任务']],
    events: [['10:15', '灌装净含量抽检进入复检流程'], ['09:45', '包装材料批次已绑定'], ['08:00', '产线开班检查完成']], },
]
export const qualityRecords: FactoryRecord[] = productionRecords.map((record, index) => ({
  ...record, name: ['花雕酒 · 过程检验', '陈酿酒 · 成品检验', '纯酿酒 · 净含量复检'][index]!,
  status: ['过程合格', '待放行', '复检中'][index]!, progress: [2, 4, 3][index]!,
  facts: [['检验任务', `QC-26090${index + 1}`], ['关联批次', record.batch], ['原料 / 原酒', ['RM-260828', 'YW-230916', 'YW-260830'][index]!], ['检验节点', ['发酵过程', '勾调成品', '灌装抽检'][index]!]],
  readings: index === 2 ? [['净含量', '待复检', '复检进行中'], ['酒精度', '15.2 %vol', '本次检测合格'], ['感官评定', '通过', '本次检测合格']] : [['酒精度', index === 0 ? '15.6 %vol' : '16.1 %vol', '本次检测合格'], ['总酸', index === 0 ? '4.2 g/L' : '4.5 g/L', '本次检测合格'], ['感官评定', '通过', '本次检测合格']],
  events: index === 2 ? [['10:25', '复检样品已送检，批次暂缓放行'], ['10:15', '净含量抽检触发复检任务'], ['09:50', '成品样品采集并绑定批次']] : [['10:00', '检验结果录入并关联生产批次'], ['09:30', '检验样品接收，记录样品编号'], ['08:50', '采样完成，关联工序与设备']],
}))
export const equipmentRecords: FactoryRecord[] = productionRecords.map((record, index) => ({
  ...record, id: record.device, name: ['3# 发酵罐', '2# 勾调罐', '1# 灌装线'][index]!,
  status: ['运行中', '运行中', '维护关注'][index]!, progress: index === 2 ? 2 : 0,
  facts: [['设备编码', record.device], ['关联批次', record.batch], ['责任班组', ['酿造一班', '勾调一班', '灌装一班'][index]!], ['下次保养', ['10月16日', '10月20日', '10月10日'][index]!]],
  readings: index === 2 ? [['运行速度', '120 瓶/min', '实时参数'], ['运行时长', '1,286 h', '累计记录'], ['驱动电流', '18.6 A', '维护关注']] : [['罐体温度', index === 0 ? '28.6 °C' : '22.4 °C', '实时参数'], ['罐体液位', index === 0 ? '76 %' : '64 %', '实时参数'], ['运行时长', index === 0 ? '2,180 h' : '1,640 h', '累计记录']],
  events: index === 2 ? [['10:20', '维护计划已关联灌装线驱动检查'], ['09:40', '驱动电流趋势进入关注状态'], ['昨日 16:00', '班组完成清洗与点检']] : [['09:00', '日常点检完成，设备运行正常'], ['昨日 17:00', '清洗记录已归档'], ['10月01日', '周期保养完成并复核']],
}))
const metric = (label: string, value: string, unit: string, icon = 'DataLine'): Metric => ({ label, value, unit, icon, delta: '', positive: true })
export const factoryMetrics: Record<FactoryTheme, Metric[]> = {
  overview: [metric('销售订单', String(orderLifecycles.length), '单'), metric('订单金额', (orderLifecycles.reduce((s, o) => s + o.amount, 0) / 10000).toFixed(2), '万元'), metric('待出库订单', String(orderLifecycles.filter(o => o.stage < 3).length), '单'), metric('已出库数量', orderLifecycles.reduce((s, o) => s + o.shipped, 0).toLocaleString(), '箱'), metric('已签收任务', String(orderLifecycles.filter(o => o.stage === 5).length), '单'), metric('业务关注', String(orderLifecycles.filter(o => o.attention).length), '项')],
  production: [metric('在制批次', '3', '批'), metric('酿造计划', '60', 'kL'), metric('灌装计划', '12,000', '瓶'), metric('灌装产量', '8,640', '瓶'), metric('灌装完成率', '72', '%'), metric('待复检批次', '1', '批')],
  quality: [metric('关联批次', '3', '批'), metric('检测指标', '9', '项'), metric('已完成检测', '8', '项'), metric('待复检指标', '1', '项'), metric('待放行批次', '2', '批'), metric('追溯关联设备', '3', '台', 'Cpu')],
  fulfillment: [metric('履约订单', String(orderLifecycles.length), '单'), metric('待出库订单', String(orderLifecycles.filter(o => o.stage < 3).length), '单'), metric('已出库', orderLifecycles.reduce((s, o) => s + o.shipped, 0).toLocaleString(), '箱'), metric('待签收任务', String(orderLifecycles.filter(o => o.stage >= 3 && o.stage < 5).length), '单'), metric('已签收任务', String(orderLifecycles.filter(o => o.stage === 5).length), '单'), metric('业务关注', String(orderLifecycles.filter(o => o.attention).length), '项')],
  equipment: [metric('主题设备', '3', '台', 'Cpu'), metric('运行设备', '3', '台'), metric('维护关注', '1', '项'), metric('保养计划', '3', '项', 'Tools'), metric('关联在制批次', '3', '批'), metric('待检修任务', '1', '项')],
}
export const factoryThemes = {
  fulfillment: { title: '订单履约', subtitle: '要货 · 出库 · 配送 · 签收', list: '订单履约任务', steps: fulfillmentSteps, records: fulfillmentRecords },
  overview: { title: '综合驾驶舱', subtitle: '生产 · 质量 · 设备', list: '重点订单', steps: fulfillmentSteps, records: fulfillmentRecords.slice(0, 3) },
  production: { title: '生产工艺', subtitle: '批次流转与工艺执行', list: '生产批次', steps: processSteps, records: productionRecords },
  quality: { title: '质量追溯', subtitle: '检验记录与批次关联', list: '批次检验任务', steps: traceSteps, records: qualityRecords },
  equipment: { title: '设备运维', subtitle: '设备状态与维护履历', list: '关键设备', steps: maintenanceSteps, records: equipmentRecords },
}
