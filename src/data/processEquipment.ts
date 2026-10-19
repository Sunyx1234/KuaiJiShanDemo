// Temporary asset identifiers; replace through the equipment registry when commissioned.
export const steamerDevices = [
  { id: 'ZFJ-T01', name: '1# 连续式蒸饭机', temperature: '98.2', pressure: '0.12', duration: '32.0' },
  { id: 'ZFJ-T02', name: '2# 连续式蒸饭机', temperature: '98.6', pressure: '0.14', duration: '31.5' },
]
export type ProcessReference = { label: string; value: string; condition: string }
export const processReferences: Record<number, { scope: string; readings: ProcessReference[]; sources: { title: string; url: string }[] }> = {
  0: { scope: '原料接收与检验', readings: [
    { label: '原料感官', value: '色泽、气味正常', condition: '无霉变、无异味' },
    { label: '水分与杂质', value: '按原料验收标准', condition: '依原料种类与等级判定' },
    { label: '批次追溯', value: '单批独立建档', condition: '供应商、到货与检验记录' },
  ], sources: [] },
  1: { scope: '浸米与蒸饭参考工况', readings: [
    { label: '浸米水温', value: '25–28 °C', condition: '浸米阶段；随季节与米质调整' },
    { label: '蒸煮温度', value: '约 100 °C', condition: '常压箱体；以当地沸点为准' },
    { label: '蒸汽压力', value: '0.10–0.25 MPa', condition: '供汽压力；不等同于箱体压力' },
    { label: '蒸煮时间', value: '约 15 min', condition: '资料工况；依据米层与熟化调整' },
    { label: '冷却落罐温度', value: '28–30 °C', condition: '蒸饭后冷却阶段' },
  ], sources: [
    { title: '现代黄酒酿造技术虚拟仿真实验', url: 'https://jsxngx.seu.edu.cn/ResourceDetail.aspx?Id=5318128CDD505E9B' },
    { title: 'CN102041216A 黄酒生产方法', url: 'https://patents.google.com/patent/CN102041216A/zh' },
  ] },
  2: { scope: '控温发酵参考工况', readings: [
    { label: '前酵温度', value: '22–25 °C', condition: '控温发酵工艺' },
    { label: '前酵时间', value: '3–5 d', condition: '结合糖度、酸度与酒精度判断' },
    { label: '后酵温度', value: '14–18 °C', condition: '后发酵阶段' },
    { label: '总发酵时间', value: '15–25 d', condition: '对应资料配方，非全品类通用' },
  ], sources: [{ title: 'CN112877162A 黄酒酿造方法', url: 'https://patents.google.com/patent/CN112877162A/zh' }] },
  3: { scope: '压榨与煎酒参考工况', readings: [
    { label: '压榨压力', value: '按压滤机工况', condition: '以机型及滤板额定值为准' },
    { label: '煎酒温度', value: '87 °C', condition: '清爽型低度黄酒工艺' },
    { label: '保温时间', value: '15 min', condition: '与上述温度配套使用' },
  ], sources: [{ title: 'CN101691533B 清爽型低度黄酒工艺', url: 'https://patents.google.com/patent/CN101691533B/zh' }] },
  4: { scope: '复曲黄酒勾调参考配方', readings: [
    { label: '酒精度', value: '14.0–15.0 %vol', condition: '20 °C；对应复曲黄酒配方' },
    { label: '总糖', value: '40.1–45.0 g/L', condition: '以葡萄糖计' },
    { label: '总酸', value: '4.5–6.5 g/L', condition: '以乳酸计' },
  ], sources: [{ title: 'CN102286336A 复曲黄酒生产工艺', url: 'https://patents.google.com/patent/CN102286336A/zh' }] },
  5: { scope: '灌装、瓶装杀菌与包装要求', readings: [
    { label: '工艺要求 · 净含量', value: '批均值 ≥ 标注量', condition: '单件允许短缺按净含量档位判定；总局令70号第8、9条' },
    { label: '工艺参考 · 杀菌区', value: '82–85 °C', condition: '仅限 CN105523515A 冷灌装后封盖路线；非当前设备设定' },
    { label: '工艺参考 · 杀菌强度', value: '总 PU > 30', condition: '同一专利配套条件；须封盖后杀菌，当前模型顺序待工艺复核' },
    { label: '包装规格', value: '500 mL × 6 瓶', condition: '瓶装产品与装箱规格' },
    { label: '计划节拍', value: '200 瓶/min', condition: '整线看板计划；12,000 瓶/h' },
  ], sources: [
    { title: '总局令70号 · 定量包装商品计量监督管理办法', url: 'https://www.samr.gov.cn/zw/zfxxgk/fdzdgknr/fgs/art/2023/art_7ca30c3e1b47458cace623dbaab78389.html' },
    { title: 'CN105523515A · 黄酒冷灌装方法（条件性参考）', url: 'https://patents.google.com/patent/CN105523515A/zh' },
  ] },
}

export type BottlingDevice = { id: string; name: string; nodeName: string; task: string }
// Stable presentation IDs mapped to actual GLB roots. Display setpoints live in equipmentReadings.ts.
export const bottlingDevices: BottlingDevice[] = [
  { id: 'GZ-T01', name: '上料机', nodeName: 'EQ_BOT_001_LOADER', task: '空瓶上料与输送' },
  { id: 'GZ-T02', name: '酒瓶质检机', nodeName: 'EQ_BOT_005_INSPECTOR', task: '空瓶外观与缺陷检查' },
  { id: 'GZ-T03', name: '环形灌装机', nodeName: 'EQ_BOT_002_ROTARY_FILLER', task: '酒液定量灌装' },
  { id: 'GZ-T04', name: '高温杀菌机', nodeName: 'EQ_BOT_006_STERILIZER', task: '瓶装酒热处理' },
  { id: 'GZ-T05', name: '旋盖机', nodeName: 'EQ_BOT_007_CAPPER', task: '瓶盖旋紧与封口' },
  { id: 'GZ-T06', name: '装箱机', nodeName: 'EQ_BOT_008_CASE_PACKER', task: '成品装箱与交接' },
]

export type FermentationZone = 'pre' | 'post'
export const fermentationZones = [
  { id: 'pre' as const, name: '前发酵区', count: 8 },
  { id: 'post' as const, name: '后发酵区', count: 24 },
]
// Registry points at actual independent tank roots in the assembled GLBs.
export const fermentationDevices = fermentationZones.flatMap(zone => Array.from({ length: zone.count }, (_, index) => {
  const number = String(index + 1).padStart(2, '0'), pre = zone.id === 'pre'
  return {
    id: `${pre ? 'QF' : 'HF'}-T${number}`, zone: zone.id,
    name: `${index + 1}# ${pre ? '前发酵罐' : '后发酵罐'}`,
    nodeName: `EQ_FER_${pre ? '009' : '010'}_${index === 0 ? 'SINGLE' : `T${number}`}`,
    task: pre ? '糖化与前发酵管理' : '后发酵与成熟管理',
  }
}))

// One existing static press; real process feed is a pipe, not the reserved conveyor sockets.
export const pressDevices: BottlingDevice[] = [{
  id: 'YZ-T01', name: '1# 板框压榨机', nodeName: 'EQ_PRS_003_FILTER_PRESS', task: '酒醪压榨与固液分离' }]
