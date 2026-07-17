<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { FullScreen, MostlyCloudy } from '@element-plus/icons-vue'
import { navItems } from '../data/mock'
import { useDashboardStore } from '../stores/dashboard'

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
</script>

<template>
  <header class="top-header">
    <div class="brand">
      <strong>CHINT</strong>
      <span>智慧能源 · 赋能美好</span>
    </div>
    <nav class="nav nav--left">
      <button v-for="item in navItems.slice(0, 2)" :key="item.key" :class="{ active: store.activeNav === item.key }" @click="store.activeNav = item.key">{{ item.label }}</button>
    </nav>
    <div class="title-block">
      <h1>正泰集团厂区运营中心</h1>
      <p>CHINT GROUP FACTORY OPERATIONS CENTER</p>
    </div>
    <nav class="nav nav--right">
      <button v-for="item in navItems.slice(2)" :key="item.key" :class="{ active: store.activeNav === item.key }" @click="store.activeNav = item.key">{{ item.label }}</button>
    </nav>
    <div class="weather">
      <span>{{ clock }}</span>
      <span><el-icon><MostlyCloudy /></el-icon> 28°C　晴　东南风2级</span>
      <button aria-label="切换全屏" @click="toggleFullscreen"><el-icon><FullScreen /></el-icon></button>
    </div>
  </header>
</template>
