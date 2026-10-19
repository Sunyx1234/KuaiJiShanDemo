<script setup lang="ts">
import { computed } from 'vue'
import HudPanel from './HudPanel.vue'
import { useFactoryStore } from '../stores/factory'
import { factoryThemes } from '../data/factory'

defineProps<{ side: 'left' | 'right' }>()
const factory = useFactoryStore()
const related = computed(() => (['production', 'equipment'] as const).map(key => ({
  key, label: factoryThemes[key].title,
  record: factoryThemes[key].records.find(record => record.batch === factory.selected.batch),
})))
</script>
<template>
  <aside class="factory-side" :class="`factory-side--${side}`">
    <template v-if="side === 'left'">
      <HudPanel :title="factory.config.list">
        <p class="factory-caption">选择记录，联动园区与业务明细</p>
        <button v-for="(record, index) in factory.config.records" :key="record.id" class="factory-record" :class="{ selected: factory.selectedIndex === index }" :aria-pressed="factory.selectedIndex === index" @click="factory.select(index)">
          <span class="factory-record-top"><b>{{ record.name }}</b><em :class="{ attention: record.attention }">{{ record.status }}</em></span>
          <span>{{ record.id }} · {{ record.area }}</span>
          <small>关联批次 {{ record.batch }} / 设备 {{ record.device }}</small>
        </button>
      </HudPanel>
      <HudPanel :title="factory.theme === 'equipment' ? '设备档案' : '批次档案'">
        <dl class="factory-facts"><div v-for="[label, value] in factory.selected.facts" :key="label"><dt>{{ label }}</dt><dd>{{ value }}</dd></div></dl>
      </HudPanel>
      <HudPanel title="业务关联">
        <button v-for="item in related" :key="item.key" class="factory-link" :disabled="!item.record" @click="factory.openTheme(item.key)"><span>{{ item.label }}</span><b>{{ item.record?.status ?? '暂无关联' }}</b><i>↗</i></button>
      </HudPanel>
    </template>
    <template v-else>
      <HudPanel v-if="factory.theme === 'production'" title="关键工艺参数 · 参考值">
        <p class="factory-caption">{{ factory.processRegion.label }} / {{ factory.processReference.scope }}</p>
        <div v-for="reading in factory.processReference.readings" :key="reading.label" class="factory-reading process-reference-reading"><span>{{ reading.label }}<small>{{ reading.condition }}</small></span><strong>{{ reading.value }}</strong></div>
        <details class="reference-sources"><summary>参考依据与适用范围</summary><p>资料工况，执行范围以对应产品工艺规程为准。</p><a v-for="source in factory.processReference.sources" :key="source.url" :href="source.url" target="_blank" rel="noopener noreferrer">{{ source.title }} ↗</a></details>
      </HudPanel>
      <HudPanel v-else title="运行参数">
        <p class="factory-caption">{{ factory.selected.name }} / {{ factory.selected.id }}</p>
        <div v-for="[label, value, hint] in factory.selected.readings" :key="label" class="factory-reading"><span>{{ label }}<small>{{ hint }}</small></span><strong>{{ value }}</strong></div>
      </HudPanel>
      <HudPanel title="设备列表">
        <p class="factory-caption">{{ factory.processRegion.label }} · {{ factory.processDevices.length }} 台设备</p>
        <button v-for="device in factory.processDevices" :key="device.id" class="factory-record process-device-record" :class="{ 'bottling-device-record': factory.selectedProcessIndex === 5, selected: factory.selectedProcessDeviceId === device.id }" :aria-pressed="factory.selectedProcessDeviceId === device.id" @click="factory.selectProcessDevice(device.id)"><span class="factory-record-top"><b>{{ device.name }}</b><em>{{ factory.selectedProcessDeviceId === device.id ? '已选中' : '定位 ↗' }}</em></span><span>{{ device.id }} · 临时编号</span><small v-if="factory.selectedProcessIndex !== 5">点击聚焦设备并查看工艺参数</small></button>
        <p v-if="!factory.processDevices.length" class="factory-caption">该环节设备档案待补充</p>
      </HudPanel>
      <HudPanel :title="factory.theme === 'equipment' ? '维护与点检记录' : '最新业务记录'">
        <ol class="factory-events"><li v-for="[time, content] in factory.selected.events" :key="time"><time>{{ time }}</time><p>{{ content }}</p></li></ol>
      </HudPanel>
    </template>
  </aside>
</template>

<style scoped>
.bottling-device-record{min-height:54px!important;padding:8px 10px;margin-bottom:5px}.bottling-device-record .factory-record-top{margin-bottom:4px}.bottling-device-record span:not(.factory-record-top){font-size:11px}

.process-reference-reading{min-height:44px;gap:10px;padding:7px 0}.process-reference-reading>span{max-width:52%}.process-reference-reading strong{font-size:17px;white-space:normal;text-align:right;max-width:48%}.process-reference-reading small{font-size:10px;line-height:1.4}.reference-sources{font-size:10px;color:#7895b4;padding-top:5px}.reference-sources summary{cursor:pointer;color:#83bbd8}.reference-sources p{margin:5px 0;line-height:1.5}.reference-sources a{display:block;color:#79cfff;margin:5px 0}.process-device-record{min-height:76px}.process-device-record .factory-record-top b{font-size:14px}
.factory-side--right :deep(.hud-panel__body){overflow-y:auto;scrollbar-width:thin;scrollbar-color:#285c7f transparent}
</style>
