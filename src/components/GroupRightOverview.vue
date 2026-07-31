<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import BaseChart from './BaseChart.vue'
import { useGroupStore } from '../stores/group'

const store = useGroupStore()
const showcaseIndex = ref(0)
let showcaseTimer = 0

const activeShowcase = computed(() => store.showcaseTopics[showcaseIndex.value])

const performanceOption = computed(() => ({
  tooltip: {
    trigger: 'axis',
    backgroundColor: 'rgba(3, 22, 40, .96)',
    borderColor: '#2b7eaa',
    textStyle: { color: '#ccecff', fontSize: 12 },
    formatter: (params: Array<{ axisValue: string; value: number }>) =>
      `${params[0]?.axisValue}<br/>增长指数 ${params[0]?.value}`,
  },
  grid: { left: 38, right: 12, top: 24, bottom: 30 },
  xAxis: {
    type: 'category',
    boundaryGap: false,
    data: store.performanceTrend.labels,
    axisLabel: { color: '#6f94ad', fontSize: 11 },
    axisLine: { lineStyle: { color: 'rgba(64, 127, 164, .4)' } },
    axisTick: { show: false },
  },
  yAxis: {
    type: 'value',
    min: 90,
    max: 180,
    axisLabel: { color: '#597d96', fontSize: 10 },
    axisLine: { show: false },
    axisTick: { show: false },
    splitLine: { lineStyle: { color: 'rgba(55, 110, 146, .18)' } },
  },
  series: [{
    type: 'line',
    smooth: 0.35,
    showSymbol: true,
    symbol: 'circle',
    symbolSize: 7,
    data: store.performanceTrend.values,
    lineStyle: { color: '#56caff', width: 3 },
    itemStyle: { color: '#a7ecff', borderColor: '#229fd8', borderWidth: 2 },
    areaStyle: {
      color: {
        type: 'linear',
        x: 0,
        y: 0,
        x2: 0,
        y2: 1,
        colorStops: [
          { offset: 0, color: 'rgba(52, 184, 235, .34)' },
          { offset: 1, color: 'rgba(52, 184, 235, .02)' },
        ],
      },
    },
  }],
}))

onMounted(() => {
  showcaseTimer = window.setInterval(() => {
    showcaseIndex.value = (showcaseIndex.value + 1) % store.showcaseTopics.length
  }, 6000)
})

onBeforeUnmount(() => window.clearInterval(showcaseTimer))

function selectShowcase(index: number) {
  showcaseIndex.value = index
}
</script>

<template>
  <aside class="group-showcase-column group-right-overview">
    <section class="group-showcase-panel group-performance-panel">
      <header class="group-showcase-heading">
        <div>
          <span>BUSINESS GROWTH</span>
          <h2>经营业绩增长</h2>
        </div>
        <small>公开口径 · 指数化展示</small>
      </header>
      <div class="group-performance-summary">
        <div>
          <span>最新增长指数</span>
          <strong>{{ store.performanceTrend.currentIndex }}</strong>
          <small>以 {{ store.performanceTrend.baseYear }} 年为基期 100</small>
        </div>
        <em>{{ store.performanceTrend.yearOnYear }}<small>同比增长</small></em>
      </div>
      <div class="group-performance-chart">
        <BaseChart :option="performanceOption" />
      </div>
    </section>

    <section class="group-showcase-panel group-achievement-panel">
      <header class="group-showcase-heading">
        <div>
          <span>SUSTAINABILITY &amp; INTELLIGENCE</span>
          <h2>绿色与智能制造成果</h2>
        </div>
        <div class="group-showcase-tabs" aria-label="成果主题切换">
          <button v-for="(topic, index) in store.showcaseTopics" :key="topic.key"
            :class="{ active: showcaseIndex === index }"
            :aria-label="`查看${topic.title}`" @click="selectShowcase(index)">
            {{ topic.shortLabel }}
          </button>
        </div>
      </header>

      <Transition name="group-showcase-fade" mode="out-in">
        <div :key="activeShowcase.key" class="group-achievement-content">
          <div class="group-achievement-hero">
            <i>{{ activeShowcase.badge }}</i>
            <div>
              <span>{{ activeShowcase.title }}</span>
              <strong>{{ activeShowcase.heroValue }}<small>{{ activeShowcase.heroUnit }}</small></strong>
              <p>{{ activeShowcase.heroLabel }}</p>
            </div>
          </div>
          <div class="group-achievement-stats">
            <article v-for="item in activeShowcase.items" :key="item.label">
              <strong>{{ item.value }}<small>{{ item.unit }}</small></strong>
              <span>{{ item.label }}</span>
            </article>
          </div>
          <p class="group-achievement-description">{{ activeShowcase.description }}</p>
        </div>
      </Transition>
    </section>
  </aside>
</template>
