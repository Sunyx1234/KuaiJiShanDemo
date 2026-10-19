// Presentation setpoints requested for the dashboard. These are not acquisition API readings,
// equipment ratings or commissioned process limits. Keep regulatory references separate.
export interface EquipmentReading {
  id: string; label: string; unit: string; baseline: number; precision: number
  target: number; context: string; updateMode: 'fixed' | 'fluctuate'
}
const metric = (id: string, label: string, unit: string, baseline: number, precision: number, target: number, context: string): EquipmentReading => ({ id, label, unit, baseline, precision, target, context, updateMode: /液位|数量|次数|累计|输送速度|时间|时长|单箱瓶数/.test(label) ? 'fixed' : 'fluctuate' })
const bottlingReadings: Record<string, EquipmentReading[]> = {
  'GZ-T01': [metric('feed', '上料节拍', '瓶/min', 202, 2, 200, '空瓶连续上料'), metric('belt', '输送速度', 'm/min', 12.2, 3, 12, '空瓶输送段'), metric('jam', '堵瓶次数', '次', 0, 0, 0, '本班输送记录')],
  'GZ-T02': [metric('checked', '检查数量', '瓶', 12600, 0, 13000, '本班累计检查'), metric('reject', '剔除数量', '瓶', 18, 0, 20, '缺陷瓶隔离'), metric('rate', '检查节拍', '瓶/min', 201, 2, 200, '空瓶外观检查')],
  'GZ-T03': [metric('volume', '灌装净含量', 'mL', 502.8, 2, 500, '500 mL 包装规格'), metric('flow', '灌装节拍', '瓶/min', 200, 2, 200, '连续灌装工况'), metric('temperature', '酒液温度', '°C', 30.2, 2, 30, '冷灌装预热工况')],
  'GZ-T04': [metric('temperature', '杀菌区温度', '°C', 83.5, 2, 84, '瓶装酒热处理'), metric('pu', '累计杀菌强度', 'PU', 32.5, 2, 32, '当前温区组合'), metric('speed', '输送速度', 'm/min', 1.28, 4, 1.3, '杀菌机输送段')],
  'GZ-T05': [metric('torque', '旋盖扭矩', 'N·m', 1.2, 4, 1.2, '瓶盖旋紧工况'), metric('missing', '缺盖数量', '瓶', 0, 0, 0, '本班封口记录'), metric('speed', '旋盖节拍', '瓶/min', 200, 2, 200, '与灌装节拍配合')],
  'GZ-T06': [metric('cases', '装箱数量', '箱', 2080, 0, 2200, '本班累计装箱'), metric('rate', '装箱节拍', '箱/min', 33.3, 2, 33.3, '6 瓶包装箱规'), metric('count', '单箱瓶数', '瓶/箱', 6, 0, 6, '固定产品箱规')],
}
export function getEquipmentReadings(id: string): EquipmentReading[] {
  if (id.startsWith('ZFJ-')) {
    const second = id.endsWith('02')
    return [metric('temperature', '蒸煮温度', '°C', second ? 98.6 : 98.2, 2, 98, '蒸饭箱体'), metric('pressure', '蒸汽压力', 'MPa', second ? .14 : .12, 4, .15, '供汽压力'), metric('duration', '蒸煮时间', 'min', second ? 31.5 : 32, 2, 32, '物料停留时间')]
  }
  if (id.startsWith('QF-') || id.startsWith('HF-')) {
    const pre = id.startsWith('QF-'), index = Number(id.slice(-2)) - 1
    return [metric('temperature', '醪液温度', '°C', pre ? 23.6 + index % 5 * .15 : 16.2 + index % 7 * .12, 2, pre ? 24 : 17, pre ? '前发酵控温' : '后发酵控温'), metric('level', '罐内液位', '%', 74 + index % 6 * 1.4, 2, 80, '罐内装料液位'), metric('duration', '发酵时长', 'h', pre ? 72 + index * 2 : 288 + index * 3, 2, pre ? 96 : 360, pre ? '糖化与前发酵周期' : '后发酵成熟周期')]
  }
  if (id === 'YZ-T01') return [metric('hydraulicPressure', '液压压紧压力', 'MPa', 16, 3, 16, '液压压紧回路'), metric('feedPressure', '酒醪进料压力', 'MPa', .45, 4, .45, '酒醪进料回路'), metric('filtrateFlow', '滤液流量', 'L/min', 85, 2, 90, '固液分离过滤段')]
  return bottlingReadings[id] ?? bottlingReadings['GZ-T01']!
}
