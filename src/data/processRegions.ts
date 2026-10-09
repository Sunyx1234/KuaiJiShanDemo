// 百分比坐标与园区投影共用坐标轴。工艺—建筑映射待客户校准。
export interface CampusRegion { id: string; label: string; area: string; x: number; y: number; width: number; depth: number; color: string; detail: string }
export const processRegions: CampusRegion[] = [
  { id: 'raw', label: '原料验收', area: '原料接收区', x: 31, y: 59, width: 16, depth: 12, color: '#6bd5c2', detail: '原料接收、验收与批次建档' },
  { id: 'steam', label: '浸米蒸煮', area: '预处理区', x: 31, y: 43, width: 16, depth: 13, color: '#71c6f1', detail: '浸米、蒸煮与投料记录' },
  { id: 'ferment', label: '糖化发酵', area: '酿造发酵区', x: 46, y: 40, width: 14, depth: 16, color: '#66e0e5', detail: '发酵批次、温度与工艺执行' },
  { id: 'press', label: '压榨煎酒', area: '压榨煎酒区', x: 60, y: 41, width: 13, depth: 16, color: '#b29ef3', detail: '压榨、煎酒与工序交接' },
  { id: 'blend', label: '储存勾调', area: '储存勾调区', x: 50, y: 27, width: 19, depth: 10, color: '#e8c181', detail: '原酒储存、配方与勾调批次' },
  { id: 'pack', label: '灌装入库', area: '灌装与成品区', x: 61, y: 60, width: 17, depth: 13, color: '#87dab2', detail: '灌装、包装批次与成品入库' },
]
export const equipmentModelCatalog: Record<string, { name: string; assetUrl: string | null; processIndex: number }> = {
  'FJ-03': { name: '3# 发酵罐', assetUrl: null, processIndex: 2 },
  'GT-02': { name: '2# 勾调罐', assetUrl: null, processIndex: 4 },
  'GZ-01': { name: '1# 灌装线', assetUrl: null, processIndex: 5 },
}
