<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { FullScreen } from '@element-plus/icons-vue'

const now = ref(new Date())
let timer = 0

const clock = computed(() => new Intl.DateTimeFormat('zh-CN', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
}).format(now.value).replaceAll('/', '-'))

onMounted(() => {
  timer = window.setInterval(() => { now.value = new Date() }, 1000)
})
onBeforeUnmount(() => window.clearInterval(timer))

async function toggleFullscreen() {
  if (!document.fullscreenElement) await document.documentElement.requestFullscreen()
  else await document.exitFullscreen()
}
</script>

<template>
  <header class="top-header group-top-header">
    <div class="brand">
      <strong>CHINT</strong>
      <span>智慧能源 · 赋能美好</span>
    </div>
    <div class="title-block">
      <h1>正泰集团全球制造基地</h1>
      <p>CHINT GLOBAL MANUFACTURING NETWORK</p>
    </div>
    <div class="weather">
      <span>{{ clock }}</span>
      <span class="group-header-status"><i />全球制造网络在线</span>
      <button aria-label="切换全屏" @click="toggleFullscreen"><el-icon><FullScreen /></el-icon></button>
    </div>
  </header>
</template>
