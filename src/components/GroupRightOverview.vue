<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useGroupStore } from '../stores/group'

const store = useGroupStore()
const performanceIndex = ref(0)
const showcaseIndex = ref(0)
let performanceTimer = 0
let showcaseTimer = 0

const activePerformance = computed(() => store.performanceTopics[performanceIndex.value])
const activeShowcase = computed(() => store.showcaseTopics[showcaseIndex.value])

onMounted(() => {
  performanceTimer = window.setInterval(() => {
    performanceIndex.value = (performanceIndex.value + 1) % store.performanceTopics.length
  }, 7000)
  showcaseTimer = window.setInterval(() => {
    showcaseIndex.value = (showcaseIndex.value + 1) % store.showcaseTopics.length
  }, 6000)
})

onBeforeUnmount(() => {
  window.clearInterval(performanceTimer)
  window.clearInterval(showcaseTimer)
})

function selectPerformance(index: number) {
  performanceIndex.value = index
}

function selectShowcase(index: number) {
  showcaseIndex.value = index
}
</script>

<template>
  <aside class="group-showcase-column group-right-overview">
    <section class="group-showcase-panel group-performance-panel">
      <header class="group-showcase-heading">
        <div>
          <span>CAMPUS OPERATIONS · DEMO</span>
          <h2>园区态势</h2>
        </div>
        <div class="group-showcase-tabs" aria-label="经营指标维度切换">
          <button v-for="(topic, index) in store.performanceTopics" :key="topic.key"
            :class="{ active: performanceIndex === index }"
            :aria-label="`查看${topic.title}`" @click="selectPerformance(index)">
            {{ topic.shortLabel }}
          </button>
        </div>
      </header>
      <Transition name="group-showcase-fade" mode="out-in">
        <div :key="activePerformance.key" class="group-performance-content">
          <div class="group-performance-lead">
            <div>
              <span>{{ activePerformance.hero.period }} · {{ activePerformance.hero.category }}</span>
              <strong>{{ activePerformance.hero.value }}<small>{{ activePerformance.hero.unit }}</small></strong>
              <p>{{ activePerformance.hero.label }}</p>
            </div>
            <em><i />{{ activePerformance.hero.badge }}</em>
          </div>
          <div class="group-performance-indicators">
            <article v-for="indicator in activePerformance.indicators" :key="indicator.label">
              <header><small>{{ indicator.category }}</small></header>
              <strong>{{ indicator.value }}<small>{{ indicator.unit }}</small></strong>
              <span>{{ indicator.label }}</span>
            </article>
          </div>
          <p class="group-performance-description">{{ activePerformance.description }}</p>
        </div>
      </Transition>
    </section>

    <section class="group-showcase-panel group-achievement-panel">
      <header class="group-showcase-heading">
        <div>
          <span>CAMPUS DATA · DEMO</span>
          <h2>园区运行专题</h2>
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
