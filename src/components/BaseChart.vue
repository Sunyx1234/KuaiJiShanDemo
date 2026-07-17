<script setup lang="ts">
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { GaugeChart, LineChart, PieChart } from 'echarts/charts'
import { GridComponent, LegendComponent, TooltipComponent } from 'echarts/components'
import VChart from 'vue-echarts'

use([CanvasRenderer, GaugeChart, LineChart, PieChart, GridComponent, LegendComponent, TooltipComponent])
defineProps<{ option: Record<string, unknown> }>()
</script>

<template><VChart class="chart" :option="option" autoresize /></template>
