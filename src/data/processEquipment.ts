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
    { label: '设备运行读数', value: '待接入', condition: '温度、净含量与封口数据尚无采集接口' },
    { label: '生产定额', value: '待核定', condition: '瓶/时、瓶/箱按瓶型、包装规格与产能验收确定' },
  ], sources: [
    { title: '总局令70号 · 定量包装商品计量监督管理办法', url: 'https://www.samr.gov.cn/zw/zfxxgk/fdzdgknr/fgs/art/2023/art_7ca30c3e1b47458cace623dbaab78389.html' },
    { title: 'CN105523515A · 黄酒冷灌装方法（条件性参考）', url: 'https://patents.google.com/patent/CN105523515A/zh' },
  ] },
}

export type BottlingMetric = { id: string; label: string; unit: string; target: string; range: string }
export type BottlingDevice = { id: string; name: string; nodeName: string; task: string; metrics: BottlingMetric[]; record: string }
// Stable presentation IDs mapped to actual GLB roots; no device acquisition values are available yet.
export const bottlingDevices: BottlingDevice[] = [
  { id: 'GZ-T01', name: '上料机', nodeName: 'EQ_BOT_001_LOADER', task: '空瓶上料与输送', metrics: [
    { id: 'feed', label: '上料节拍', unit: '瓶/min', target: '生产定额 · 待核定', range: '随瓶型与全线节拍验收' },
    { id: 'belt', label: '输送速度', unit: 'm/min', target: '设备设定 · 待标定', range: '以稳瓶、不堆瓶为校核条件' },
    { id: 'jam', label: '堵瓶次数', unit: '次', target: '运行读数 · 待接入', range: '按光电与停机事件记录' },
  ], record: '已登记上料机模型；出料输送面标高 1.55 m，接入变高输送段。' },
  { id: 'GZ-T02', name: '酒瓶质检机', nodeName: 'EQ_BOT_005_INSPECTOR', task: '空瓶外观与缺陷检查', metrics: [
    { id: 'checked', label: '检查数量', unit: '瓶', target: '生产定额 · 随批次核定', range: '以过瓶计数为准' },
    { id: 'reject', label: '剔除数量', unit: '瓶', target: '工艺要求 · 缺陷瓶隔离', range: '缺陷分类与阈值待确认' },
    { id: 'rate', label: '检查节拍', unit: '瓶/min', target: '设备设定 · 待标定', range: '依瓶型与检测覆盖率确定' },
  ], record: '已登记质检机模型；进出瓶接口标高均为 0.95 m。' },
  { id: 'GZ-T03', name: '环形灌装机', nodeName: 'EQ_BOT_002_ROTARY_FILLER', task: '酒液定量灌装', metrics: [
    { id: 'volume', label: '灌装净含量', unit: 'mL', target: '工艺要求 · 批均值 ≥ 标注量', range: '单件允许短缺按总局令70号判定' },
    { id: 'flow', label: '灌装节拍', unit: '瓶/min', target: '生产定额 · 待核定', range: '随瓶容、酒液与阀组验收' },
    { id: 'temperature', label: '酒液温度', unit: '°C', target: '工艺设定 · 待确认', range: '冷、热灌装路线分别核定' },
  ], record: '已登记环形灌装机模型；酒液、CIP 与气源接口保留，公用管网待接。' },
  { id: 'GZ-T04', name: '高温杀菌机', nodeName: 'EQ_BOT_006_STERILIZER', task: '瓶装酒热处理', metrics: [
    { id: 'temperature', label: '杀菌区温度', unit: '°C', target: '工艺参考 · 82–85 °C', range: '仅冷灌装后封盖路线；非设备设定' },
    { id: 'pu', label: '累计杀菌强度', unit: 'PU', target: '工艺参考 · 总 PU > 30', range: 'CN105523515A；须验证温度历程' },
    { id: 'speed', label: '输送速度', unit: 'm/min', target: '设备设定 · 待热工验证', range: '由瓶型、温区与停留时间确定' },
  ], record: '已登记 12.8 m 机内输送带；模型杀菌→旋盖顺序待工艺复核。' },
  { id: 'GZ-T05', name: '旋盖机', nodeName: 'EQ_BOT_007_CAPPER', task: '瓶盖旋紧与封口', metrics: [
    { id: 'torque', label: '旋盖扭矩', unit: 'N·m', target: '工艺要求 · 按瓶盖规范', range: '结合盖型、垫片与密封试验确认' },
    { id: 'missing', label: '缺盖数量', unit: '瓶', target: '工艺要求 · 缺盖瓶隔离', range: '检测点与剔除联锁待接入' },
    { id: 'speed', label: '旋盖节拍', unit: '瓶/min', target: '生产定额 · 待核定', range: '按瓶盖组合与整线联动验收' },
  ], record: '已登记旋盖机模型；进出瓶标高 1.02 m，保留双星轮交接。' },
  { id: 'GZ-T06', name: '装箱机', nodeName: 'EQ_BOT_008_CASE_PACKER', task: '成品装箱与交接', metrics: [
    { id: 'cases', label: '装箱数量', unit: '箱', target: '生产定额 · 待核定', range: '箱规与合格箱计数接口待确认' },
    { id: 'rate', label: '装箱节拍', unit: '箱/min', target: '设备设定 · 待验收', range: '按瓶型、箱规与抓取节拍确定' },
    { id: 'count', label: '单箱瓶数', unit: '瓶/箱', target: '包装要求 · 按产品箱规', range: '不以模型夹持阵列推断箱规' },
  ], record: '已登记装箱机模型；瓶体与成箱出口保留 0.76 m 横向偏置。' },
]
