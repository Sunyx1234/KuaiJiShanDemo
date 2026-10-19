<script setup lang="ts">
import { computed } from 'vue'
import { Cpu, CollectionTag, Location, User, Calendar, Clock, OfficeBuilding, Grid, Tickets, Warning, Connection } from '@element-plus/icons-vue'
import HudPanel from './HudPanel.vue'
import { operationDevices } from '../data/equipmentOperations'
import { useFactoryStore } from '../stores/factory'
defineProps<{ side: 'left' | 'right' }>()
const factory = useFactoryStore()
const deviceName = (id: string) => operationDevices.find(d => d.id === id)?.name ?? id
const facts = computed(() => {
  const device = factory.activeDevice
  return device ? [['设备名称', device.name], ['设备编码', device.id], ['所属区域', device.area], ['责任班组', device.team], ['最近保养', device.lastService], ['下次保养', device.nextService]] : [
    ['查看范围', '园区全部设备'], ['设备总数', `${operationDevices.length} 台`], ['责任班组', '各区域运维班组'], ['未结工单', `${factory.currentTasks.filter(t => t.status !== '已完成').length} 单`], ['保养逾期', `${operationDevices.filter(factory.serviceOverdue).length} 台`], ['工艺环节', `${factory.processSummary.length} 道工序`],
  ]
})
const archiveIcons: Record<string, typeof Cpu> = {
  '设备名称': Cpu, '设备编码': CollectionTag, '所属区域': Location, '责任班组': User,
  '最近保养': Calendar, '下次保养': Clock, '查看范围': OfficeBuilding,
  '设备总数': Grid, '未结工单': Tickets, '保养逾期': Warning, '工艺环节': Connection,
}
const globalParameters = computed(() => [
  ['运行覆盖', `${operationDevices.filter(d => d.status !== '故障停机').length} / ${operationDevices.length} 台`, '含预警运行设备'],
  ['预警设备', `${operationDevices.filter(d => d.status === '预警').length} 台`, '进入运维关注列表'],
  ['停机设备', `${operationDevices.filter(d => d.status === '故障停机').length} 台`, '检修工单已关联'],
])
</script>
<template>
  <aside class="factory-side operations-side" :class="`factory-side--${side}`">
    <template v-if="side === 'left'">
      <HudPanel title="运维关注">
        <button v-for="device in factory.attentionDevices" :key="device.id" class="factory-record" :class="{ selected: factory.activeDevice?.id === device.id }" :aria-pressed="factory.activeDevice?.id === device.id" @click="factory.selectOperationDevice(device.id)">
          <span class="factory-record-top"><b>{{ device.name }}</b><em :class="{ attention: device.status !== '正常运行' }">{{ device.status }}</em></span>
          <span>{{ device.area }} · {{ device.id }}</span>
          <small :class="{ overdue: factory.serviceOverdue(device) }">{{ device.reason || (factory.serviceOverdue(device) ? `保养逾期 · 应于 ${device.nextService} 完成` : '今日保养到期，待执行') }}</small>
        </button>
        <p v-if="!factory.attentionDevices.length" class="factory-caption">当前无待关注设备</p>
      </HudPanel>
      <HudPanel title="设备档案" class="equipment-archive-panel">
        <dl class="equipment-archive-grid">
          <div v-for="[label, value] in facts" :key="label" class="archive-item" :class="{ 'archive-item--overdue': (label === '下次保养' && factory.activeDevice && factory.serviceOverdue(factory.activeDevice)) || (label === '保养逾期' && operationDevices.some(factory.serviceOverdue)) }">
            <span class="archive-icon" aria-hidden="true"><el-icon><component :is="archiveIcons[label!]" /></el-icon></span>
            <div class="archive-copy"><dt>{{ label }}</dt><dd>{{ value }}<strong v-if="label === '下次保养' && factory.activeDevice && factory.serviceOverdue(factory.activeDevice)">已逾期</strong></dd></div>
          </div>
        </dl>
      </HudPanel>
      <HudPanel title="当前运维任务">
        <button v-for="task in factory.currentTasks" :key="task.id" class="factory-record task-record" @click="factory.openOperationDetail('task', task)">
          <span class="factory-record-top"><b>{{ task.name }}</b><em :class="{ attention: task.status !== '已完成' }">{{ task.status }}</em></span>
          <span>{{ task.type }} · {{ task.owner }}</span><small>{{ task.createdAt }} · {{ deviceName(task.deviceId) }}</small>
        </button>
        <p v-if="!factory.currentTasks.length" class="factory-caption">当前无运维任务</p>
      </HudPanel>
    </template>
    <template v-else>
      <HudPanel title="运行参数">
        <p class="factory-caption parameter-caption"><em :class="{ attention: factory.activeDevice && factory.activeDevice.health !== '健康' }">{{ factory.activeDevice ? `健康状态：${factory.activeDevice.health}` : '全局汇总' }}</em></p>
        <div v-for="[label, value, hint] in factory.activeDevice?.parameters ?? globalParameters" :key="label" class="factory-reading" :class="{ 'parameter-warning': hint.includes('预警') || hint.includes('故障') }"><span>{{ label }}<small>{{ hint }}</small></span><strong>{{ value }}</strong></div>
        <p class="parameter-note">{{ factory.activeDevice ? `运行状态：${factory.activeDevice.status}` : '设备完好率按非故障停机设备占比计算' }}</p>
      </HudPanel>
      <HudPanel title="区域设备列表">
        <div v-if="factory.equipmentScope === 'device' && factory.selectedProcessIndex === 2" class="fermentation-list-tabs" role="group" aria-label="发酵设备分类"><button :aria-pressed="factory.fermentationZone === 'pre'" @click="factory.selectFermentationZone('pre')">前发酵罐 · 8</button><button :aria-pressed="factory.fermentationZone === 'post'" @click="factory.selectFermentationZone('post')">后发酵罐 · 24</button></div>
        <button v-for="device in factory.visibleDevices" :key="device.id" class="factory-record" :class="{ selected: factory.activeDevice?.id === device.id }" :aria-pressed="factory.activeDevice?.id === device.id" @click="factory.selectOperationDevice(device.id)">
          <span class="factory-record-top"><b>{{ device.name }}</b><em :class="{ attention: device.status !== '正常运行' }">{{ device.status }}</em></span>
          <span>{{ device.id }}</span><small class="device-health">{{ device.area }} <em :class="{ attention: device.health !== '健康' }">健康状态：{{ device.health }}</em></small>
        </button>
      </HudPanel>
      <HudPanel title="维护与点检记录">
        <ol class="factory-events"><li v-for="event in factory.currentEvents" :key="event.id"><button class="event-button" @click="factory.openOperationDetail('event', event)"><time>{{ event.time }}</time><em :class="{ attention: !['已完成', '已归档'].includes(event.status) }">{{ event.status }}</em><p>{{ event.description }}</p><small>{{ event.type }} · {{ deviceName(event.deviceId) }} ↗</small></button></li></ol>
      </HudPanel>
    </template>
  </aside>
</template>
<style scoped>
.equipment-archive-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));grid-template-rows:repeat(3,minmax(0,1fr));gap:6px;height:100%;margin:0}
.archive-item{display:flex;align-items:center;gap:8px;min-width:0;padding:7px 8px;border:1px solid #28557266;background:linear-gradient(120deg,#12395066,#09223855);border-radius:3px}
.archive-icon{display:grid;place-items:center;flex:none;width:26px;height:26px;color:#73c9f1;border:1px solid #39779b88;border-radius:5px;background:#174c694d;font-size:16px}
.archive-copy{min-width:0}.archive-copy dt{font-size:11px;color:#89adbf;line-height:1.4;margin-bottom:4px}.archive-copy dd{margin:0;font-size:12px;color:#d4e8f3;line-height:1.45;overflow-wrap:anywhere;font-variant-numeric:tabular-nums}.archive-copy strong{display:block;font-size:10px;font-weight:500;color:#ffb184;line-height:1.4;margin-top:2px}
.archive-item--overdue{border-color:#9b654b88;background:linear-gradient(120deg,#52352644,#09223855)}.archive-item--overdue .archive-icon{color:#f2b57c;border-color:#9b654b88;background:#62412b44}.archive-item--overdue dd{color:#ffbf96}

.operations-side :deep(.hud-panel__body){overflow:auto;scrollbar-width:thin;scrollbar-color:#285c7f transparent;overscroll-behavior:contain}
.factory-caption{font-size:12px;margin-bottom:9px;line-height:1.5}.factory-record{padding:8px 10px;margin-bottom:7px}.factory-record-top{margin-bottom:5px}.factory-record b{font-size:14px}.factory-record span:not(.factory-record-top){font-size:12px}.factory-record small{font-size:11px;margin-top:5px;line-height:1.5}.factory-record em,.event-button em,.parameter-caption em{font-size:11px;font-style:normal;color:#79dfcf}.factory-record em.attention,.event-button em.attention,.parameter-caption em.attention{color:#edbd74}.factory-facts>div{padding:7px 0;font-size:12px;gap:10px}.factory-facts dt{flex-shrink:0}.factory-facts strong{font-weight:500}.overdue,.factory-facts dd.overdue{color:#ffad86}.factory-reading{padding:12px 0;gap:10px}.factory-reading span{font-size:13px}.factory-reading small{font-size:11px;margin-top:5px;line-height:1.5}.factory-reading strong{font-size:21px;white-space:nowrap}.parameter-warning strong{color:#f1ba79}.parameter-note{color:#8ca9b8;font-size:11px;margin:10px 0 0}.parameter-caption em{display:block}.fermentation-list-tabs{display:flex;gap:6px;position:sticky;top:-8px;background:#081e34;padding:5px 0;margin-bottom:8px;z-index:1}.fermentation-list-tabs button{flex:1;border:1px solid #285c7f;background:#092b47;color:#9dc9e4;padding:6px;font-size:12px;cursor:pointer}.fermentation-list-tabs button[aria-pressed="true"]{border-color:#79d8e3;background:#174d66;color:#d2f5ff}.device-health{display:flex!important;justify-content:space-between;gap:5px}.factory-events li{padding-bottom:13px}.event-button{background:none;border:0;text-align:left;width:100%;padding:0;color:inherit;cursor:pointer}.event-button em{float:right}.event-button p{font-size:12px;margin:5px 0;line-height:1.5}.event-button small{color:#8ca9b8;font-size:11px}.operations-side button:focus-visible{outline:2px solid #79d8e3;outline-offset:2px}.factory-record:hover,.event-button:hover{background:#23495b55}
</style>
