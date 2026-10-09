<script setup lang="ts">
import { computed } from 'vue'
import HudPanel from './HudPanel.vue'
import { useFactoryStore } from '../stores/factory'
import { useOrdersStore } from '../stores/orders'
import { orderLifecycles } from '../data/fulfillment'
const factory = useFactoryStore()
const orders = useOrdersStore()
const isOrderTheme = computed(() => ['overview', 'fulfillment'].includes(factory.theme))
const linkedOrder = computed(() => orderLifecycles.find(order => order.batch === factory.selected.batch))
const title = computed(() => isOrderTheme.value ? '订单履约链' : factory.theme === 'quality' ? '批次追溯链' : factory.theme === 'equipment' ? '维护流程与设备关联' : '黄酒生产工艺链')
</script>
<template>
  <HudPanel :title="title" class="factory-dock">
    <template #actions><span class="factory-dock-id">{{ factory.selected.batch }} · {{ isOrderTheme ? factory.selected.id : factory.selected.device }}</span></template>
    <div class="factory-step-chain"><button v-for="(step, index) in factory.config.steps" :key="step" class="factory-step" :class="{ complete: index < factory.selected.progress, current: index === factory.selected.progress, inspected: factory.theme === 'production' && index === factory.selectedProcessIndex, attention: factory.selected.attention && index === factory.selected.progress }" :disabled="factory.theme !== 'production'" :aria-pressed="factory.theme === 'production' ? index === factory.selectedProcessIndex : undefined" @click="factory.selectProcess(index)"><i>{{ String(index + 1).padStart(2, '0') }}</i><b>{{ step }}</b><small>{{ index < factory.selected.progress ? '已记录' : index === factory.selected.progress ? factory.selected.status : '后续节点' }}</small></button></div>
    <div class="factory-dock-foot"><span>{{ factory.theme === 'production' ? `当前查看：${factory.processRegion.label} / ${factory.processRegion.area}` : isOrderTheme ? '订单 → 要货 → 发货出库 → 配送 → 签收' : '原料 / 原酒 → 生产批次 → 检验记录 → 销售去向' }}</span><button v-if="linkedOrder" @click="orders.open(linkedOrder.id)">查看关联订单 {{ linkedOrder.id }} →</button></div>
  </HudPanel>
</template>
