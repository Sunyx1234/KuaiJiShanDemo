<script setup lang="ts">
import { computed, ref } from 'vue'
import { cameraFeeds } from '../data/mock'
import HudPanel from './HudPanel.vue'

const activeCamera = ref<(typeof cameraFeeds)[number] | null>(null)
const cameraDialogVisible = computed({
  get: () => Boolean(activeCamera.value),
  set: (value: boolean) => { if (!value) activeCamera.value = null },
})
const now = new Intl.DateTimeFormat('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(new Date())
const resources = [{ icon: '▣', name: '消防器材', count: 245 }, { icon: '▰', name: '应急车辆', count: 12 }, { icon: '♟', name: '应急人员', count: 56 }, { icon: '✚', name: '医疗物资', count: 328 }]
</script>

<template>
  <section class="bottom-dock">
    <HudPanel title="实时监控" class="monitor-panel">
      <div class="camera-row">
        <button v-for="feed in cameraFeeds" :key="feed.name" class="camera-card" @click="activeCamera = feed">
          <span class="camera-image" :style="{ backgroundPosition: feed.pos }"><time>{{ now }}</time><i v-if="feed.alarm">AI告警</i></span>
          <b>{{ feed.name }}</b><small><em :class="`tone-${feed.tone}`" />在线 · {{ feed.area }}</small>
        </button>
      </div>
    </HudPanel>
    <HudPanel title="事件处置流程" class="flow-panel">
      <div class="event-flow">
        <div v-for="(step, i) in ['告警触发','事件确认','处置中','处置完成']" :key="step" :class="{ current: i === 2, done: i < 2 }">
          <i>{{ i + 1 }}</i><span><b>{{ step }}</b><small>{{ ['14:00:22','14:00:45','14:01:05','--:--:--'][i] }}</small></span>
        </div>
      </div>
    </HudPanel>
    <HudPanel title="应急资源状态" class="resource-panel">
      <div class="resource-list">
        <div v-for="r in resources" :key="r.name"><i>{{ r.icon }}</i><span>{{ r.name }}<b>{{ r.count }}</b></span><em>可用</em></div>
      </div>
    </HudPanel>
    <el-dialog v-model="cameraDialogVisible" width="980" :title="activeCamera?.name ?? '实时监控'" class="camera-dialog">
      <div v-if="activeCamera" class="camera-large" :style="{ backgroundPosition: activeCamera.pos }">
        <span>LIVE</span><time>{{ now }}</time>
      </div>
    </el-dialog>
  </section>
</template>
