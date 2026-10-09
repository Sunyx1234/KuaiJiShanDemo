<script setup lang="ts">
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { GaugeChart, LineChart, PieChart } from 'echarts/charts'
import { GraphicComponent, GridComponent, LegendComponent, TooltipComponent } from 'echarts/components'
import VChart from 'vue-echarts'

use([CanvasRenderer, GaugeChart, LineChart, PieChart, GraphicComponent, GridComponent, LegendComponent, TooltipComponent])
defineProps<{ option: Record<string, unknown> }>()
const emit = defineEmits<{ select: [event: { name?: string; dataIndex?: number }] }>()
</script>

<template><VChart class="chart" :option="option" autoresize @click="emit('select', $event)" /></template>
