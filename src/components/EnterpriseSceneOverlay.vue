<script setup lang="ts">
import { computed } from 'vue'
import { overviewCampusRegions } from '../data/enterpriseOverview'
import { useEnterpriseOverviewStore } from '../stores/enterpriseOverview'
import { useFactoryStore } from '../stores/factory'
import { productionRecords } from '../data/factory'
defineProps<{ pointStyle: (x: number, y: number) => { left: string; top: string } }>()
const overview = useEnterpriseOverviewStore()
const factory = useFactoryStore()
const info = computed(() => overview.selectedRegion?.id === 'brewing' ? [['当前工序', '糖化发酵'], ['关联批次', productionRecords[0]!.batch]]
  : overview.selectedRegion?.id === 'storage' ? [['原酒储量', '待接入'], ['库存台账', '待接入']]
  : overview.selectedRegion?.id === 'bottling' ? [['关联批次', productionRecords[2]!.batch], ['批次状态', productionRecords[2]!.status]]
  : [['统计期出库', `${overview.summary.shipped.toLocaleString()} 箱`], ['仓储库存', '待接入']])
function enter() {
  const id = overview.selectedRegion?.id
  if (id === 'warehouse') factory.openTheme('fulfillment')
  else { factory.openTheme('production'); factory.select(id === 'storage' ? 1 : id === 'bottling' ? 2 : 0) }
}
</script>
<template>
  <div class="enterprise-scene-title"><small>HUIJISHAN · DIGITAL FACTORY</small><h2>绍兴工厂</h2><p>酿造 · 陈酿 · 灌装 · 仓储</p></div>
  <button v-for="region in overviewCampusRegions" :key="region.id" class="factory-scene-marker enterprise-area-marker" :class="{ selected: overview.sceneAreaId === region.id }" :style="{ ...pointStyle(region.x, region.y), '--region-color': region.color }" :aria-label="`查看厂区：${region.label}`" :aria-pressed="overview.sceneAreaId === region.id" @click.stop="overview.selectArea(region.id)"><i /><span><b>{{ region.label }}</b></span></button>
  <div v-if="overview.selectedRegion" class="enterprise-area-summary"><header><h3>{{ overview.selectedRegion.label }}</h3><button aria-label="关闭厂区摘要" @click="overview.sceneAreaId = null">×</button></header><dl><div v-for="[label, value] in info" :key="label"><dt>{{ label }}</dt><dd>{{ value }}</dd></div></dl><button class="enterprise-area-enter" @click="enter">{{ overview.selectedRegion.id === 'warehouse' ? '查看订单履约' : '进入生产工艺' }} →</button></div>
  <div v-else class="enterprise-scene-caption"><i /> 点击厂区查看区域摘要</div>
</template>
