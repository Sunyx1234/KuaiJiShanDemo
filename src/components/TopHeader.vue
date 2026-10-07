<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { FullScreen, MostlyCloudy } from '@element-plus/icons-vue'
import { navItems } from '../data/mock'
import type { NavKey } from '../data/types'
import { useDashboardStore } from '../stores/dashboard'

withDefaults(defineProps<{
  title?: string
  showGroupReturn?: boolean
}>(), {
  title: '会稽山数字孪生运营中心',
  showGroupReturn: false,
})

const router = useRouter()
const store = useDashboardStore()
const now = ref(new Date())
let timer = 0
const clock = computed(() => new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(now.value).replaceAll('/', '-'))
onMounted(() => { timer = window.setInterval(() => now.value = new Date(), 1000) })
onBeforeUnmount(() => clearInterval(timer))
async function toggleFullscreen() {
  if (!document.fullscreenElement) await document.documentElement.requestFullscreen()
  else await document.exitFullscreen()
}
function switchNav(key: NavKey | 'more', disabled = false) {
  if (!disabled && key !== 'more') store.switchNavigation(key)
}
</script>

<template>
  <header class="top-header">
    <div class="brand">
      <strong>会稽山绍兴酒</strong>
      <span>HUIJISHAN · SHAOXING WINE</span>
    </div>
    <nav class="nav nav--left">
      <button v-for="item in navItems.slice(0, 2)" :key="item.key" :disabled="item.disabled" :class="{ active: store.activeNav === item.key }" @click="switchNav(item.key, item.disabled)">{{ item.label }}</button>
    </nav>
    <div class="title-block">
      <h1>{{ title }}</h1>
      <p>HUIJISHAN DIGITAL TWIN OPERATIONS CENTER</p>
    </div>
    <nav class="nav nav--right">
      <button v-for="item in navItems.slice(2)" :key="item.key" :disabled="item.disabled" :class="{ active: store.activeNav === item.key }" @click="switchNav(item.key, item.disabled)">{{ item.label }}</button>
    </nav>
    <div class="weather">
      <span>{{ clock }}</span>
      <span><el-icon><MostlyCloudy /></el-icon> 28°C　晴　东南风2级</span>
      <button aria-label="切换全屏" @click="toggleFullscreen"><el-icon><FullScreen /></el-icon></button>
    </div>
    <button v-if="showGroupReturn" class="group-return-button" @click="router.push('/')">
      <span>←</span> 返回地球总览
    </button>
  </header>
</template>
