<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useGroupStore } from '../stores/group'

const store = useGroupStore()
const showcaseIndex = ref(0)
let showcaseTimer = 0

const activeShowcase = computed(() => store.showcaseTopics[showcaseIndex.value])

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
      </header>
      <div class="group-performance-lead">
        <div>
          <span>{{ store.performanceOverview.hero.period }}</span>
          <strong>{{ store.performanceOverview.hero.value }}<small>{{ store.performanceOverview.hero.unit }}</small></strong>
          <p>{{ store.performanceOverview.hero.label }}</p>
        </div>
        <em><i />{{ store.performanceOverview.hero.badge }}</em>
      </div>
      <div class="group-performance-indicators">
        <article v-for="indicator in store.performanceOverview.indicators" :key="indicator.label">
          <header>
            <small>{{ indicator.period }}</small>
            <i>↗</i>
          </header>
          <strong>{{ indicator.value }}<small>{{ indicator.unit }}</small></strong>
          <span>{{ indicator.label }}</span>
        </article>
      </div>
    </section>

    <section class="group-showcase-panel group-achievement-panel">
      <header class="group-showcase-heading">
        <div>
          <span>GREEN · SMART · INNOVATION</span>
          <h2>绿色·智造·创新</h2>
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
