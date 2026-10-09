<script setup lang="ts">
import { computed } from 'vue'
import HudPanel from './HudPanel.vue'
import { useFactoryStore } from '../stores/factory'
import { factoryThemes } from '../data/factory'
import { orderLifecycles } from '../data/fulfillment'
import { useOrdersStore } from '../stores/orders'

defineProps<{ side: 'left' | 'right' }>()
const factory = useFactoryStore()
const orders = useOrdersStore()
const isOrderTheme = computed(() => ['overview', 'fulfillment'].includes(factory.theme))
const linkedOrder = computed(() => orderLifecycles.find(order => order.batch === factory.selected.batch))
const related = computed(() => (['production', 'quality', 'equipment'] as const).map(key => ({
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
          <small>关联批次 {{ record.batch }}<template v-if="!isOrderTheme"> / 设备 {{ record.device }}</template></small>
        </button>
      </HudPanel>
      <HudPanel :title="isOrderTheme ? '订单档案' : factory.theme === 'equipment' ? '设备档案' : '批次档案'">
        <dl class="factory-facts"><div v-for="[label, value] in factory.selected.facts" :key="label"><dt>{{ label }}</dt><dd>{{ value }}</dd></div></dl>
      </HudPanel>
      <HudPanel title="业务关联">
        <button v-for="item in related" :key="item.key" class="factory-link" :disabled="!item.record" @click="factory.openTheme(item.key)"><span>{{ item.label }}</span><b>{{ item.record?.status ?? '暂无关联' }}</b><i>↗</i></button>
      </HudPanel>
    </template>
    <template v-else>
      <HudPanel :title="isOrderTheme ? '履约数量' : factory.theme === 'quality' ? '检验结果' : factory.theme === 'equipment' ? '运行参数' : '关键工艺参数'">
        <p class="factory-caption">{{ factory.selected.name }} / {{ factory.selected.id }}</p>
        <div v-for="[label, value, hint] in factory.selected.readings" :key="label" class="factory-reading"><span>{{ label }}<small>{{ hint }}</small></span><strong>{{ value }}</strong></div>
      </HudPanel>
      <HudPanel title="业务关注">
        <div class="factory-focus" :class="{ attention: factory.selected.attention }"><small>{{ factory.selected.attention ? '待跟进' : '当前状态' }}</small><h3>{{ factory.selected.status }}</h3><p>{{ isOrderTheme ? (factory.selected.attention ? '关注质量放行或配送节点，结合订单时间轴查看当前任务。' : '要货、出库、送达与签收分别记录，支持查看关联单据。') : factory.selected.attention ? '灌装批次复检与设备维护关注需协同跟进，质量放行前保留批次关联记录。' : '工序、检测与设备记录按批次关联，可切换主题查看业务明细。' }}</p><button v-if="linkedOrder" class="factory-detail-button" @click="orders.open(linkedOrder.id)">订单生命周期 →</button></div>
      </HudPanel>
      <HudPanel :title="factory.theme === 'equipment' ? '维护与点检记录' : '最新业务记录'">
        <ol class="factory-events"><li v-for="[time, content] in factory.selected.events" :key="time"><time>{{ time }}</time><p>{{ content }}</p></li></ol>
      </HudPanel>
    </template>
  </aside>
</template>
