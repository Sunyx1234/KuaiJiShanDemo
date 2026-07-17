<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted } from 'vue'
import HudPanel from './HudPanel.vue'
import { useDashboardStore } from '../stores/dashboard'

const store = useDashboardStore()
let playbackFrame = 0
let previousFrame = 0
const cursorTime = computed(() => store.visitorTrackCursor?.time ?? '--:--')
const visitorTone = computed(() => {
  if (store.selectedVisitor?.status === '限制区告警') return 'critical'
  if (store.selectedVisitor?.status === '超时滞留') return 'warning'
  if (store.selectedVisitor?.status === '即将超时') return 'attention'
  if (store.selectedVisitor?.status === '定位失联') return 'offline'
  return 'normal'
})

function animate(timestamp: number) {
  const elapsed = previousFrame ? timestamp - previousFrame : 0
  previousFrame = timestamp
  if (store.visitorTrackPlaying) {
    if (store.visitorTrackProgress >= 100) {
      store.visitorTrackPlaying = false
    } else {
      const duration = 18000 / store.visitorPlaybackSpeed
      store.visitorTrackProgress = Math.min(100, store.visitorTrackProgress + Math.min(elapsed, 100) / duration * 100)
    }
  }
  playbackFrame = window.requestAnimationFrame(animate)
}

onMounted(() => { playbackFrame = window.requestAnimationFrame(animate) })
onBeforeUnmount(() => window.cancelAnimationFrame(playbackFrame))

function replay() {
  store.visitorTrackProgress = 0
  store.visitorTrackPlaying = true
}
</script>

<template>
  <section class="visitor-timeline-dock">
    <HudPanel title="访客移动轨迹与动态回放" class="visitor-timeline-panel">
      <template #actions><span class="visitor-live"><i />定位服务正常 · {{ cursorTime }}</span></template>
      <div v-if="store.selectedVisitor" class="visitor-playback">
        <div class="visitor-playback-controls">
          <span class="playback-person">
            <i>{{ store.selectedVisitor.maskedName.slice(0, 1) }}</i>
            <span>
              <b>{{ store.selectedVisitor.maskedName }} · {{ store.selectedVisitor.company }}</b>
              <small>{{ store.selectedVisitor.uwbTag }} · {{ store.selectedVisitor.area }}</small>
            </span>
            <em :class="`status-${visitorTone}`">{{ store.selectedVisitor.status }}</em>
          </span>
          <div class="track-range-tabs">
            <button
              v-for="item in [{k:'30m',n:'30分钟'},{k:'1h',n:'1小时'},{k:'2h',n:'2小时'},{k:'all',n:'入厂至今'}] as const"
              :key="item.k"
              :class="{ active: store.visitorTrackRange === item.k }"
              @click="store.visitorTrackRange = item.k; store.visitorTrackProgress = 100"
            >
              {{ item.n }}
            </button>
          </div>
          <button class="playback-main" @click="store.visitorTrackPlaying = !store.visitorTrackPlaying">
            {{ store.visitorTrackPlaying ? 'Ⅱ 暂停' : '▶ 播放' }}
          </button>
          <button class="playback-replay" @click="replay">↻ 重播</button>
          <button
            class="playback-speed"
            @click="store.visitorPlaybackSpeed = store.visitorPlaybackSpeed === 4 ? 1 : store.visitorPlaybackSpeed === 1 ? 2 : 4"
          >
            {{ store.visitorPlaybackSpeed }}×
          </button>
          <button class="playback-exit" @click="store.exitVisitorTrack">退出轨迹</button>
        </div>

        <div class="visitor-bottom-details">
          <section>
            <header><b>申报信息</b><small>预约系统</small></header>
            <div>
              <span>被访部门<b>{{ store.selectedVisitor.department }}</b></span>
              <span>被访人<b>{{ store.selectedVisitor.host }}</b></span>
              <span>来访事由<b>{{ store.selectedVisitor.reason }}</b></span>
              <span>访客证 / UWB<b>{{ store.selectedVisitor.visitorCard }} · {{ store.selectedVisitor.uwbTag }}</b></span>
              <span>允许区域<b>{{ store.selectedVisitor.allowedAreas.join('、') }}</b></span>
            </div>
          </section>
          <section>
            <header><b>实时记录</b><small>门禁 / UWB</small></header>
            <div>
              <span>当前位置<b>{{ store.selectedVisitor.area }} · {{ store.selectedVisitor.floor }}</b></span>
              <span>实际入厂<b>{{ store.selectedVisitor.actualEntry }}</b></span>
              <span>停留 / 计划离厂<b>{{ store.selectedVisitor.duration }} · {{ store.selectedVisitor.plannedLeave }}</b></span>
              <span>门禁状态<b class="ok">{{ store.selectedVisitor.accessStatus }}</b></span>
              <span>定位状态<b :class="{ danger: store.selectedVisitor.status === '定位失联' }">{{ store.selectedVisitor.tagStatus }} · {{ store.selectedVisitor.lastLocated }}</b></span>
            </div>
          </section>
          <aside :class="{ empty: !store.selectedVisitorException }">
            <template v-if="store.selectedVisitorException">
              <header><b>关联异常</b><em>{{ store.selectedVisitorException.status }}</em></header>
              <strong>{{ store.selectedVisitorException.type }}</strong>
              <p>{{ store.selectedVisitorException.content }}</p>
              <small>{{ store.selectedVisitorException.area }} · {{ store.selectedVisitorException.time }}</small>
            </template>
            <template v-else>
              <header><b>当前状态</b><em>实时</em></header>
              <strong>轨迹持续更新中</strong>
              <p>定位、门禁与预约信息已完成关联核验</p>
              <small>最近定位 {{ store.selectedVisitor.lastLocated }}</small>
            </template>
          </aside>
        </div>

        <div class="visitor-progress-row">
          <time>{{ store.activeVisitorTrack[0]?.time ?? '--:--' }}</time>
          <input v-model.number="store.visitorTrackProgress" type="range" min="0" max="100" aria-label="轨迹回放进度" />
          <time>{{ store.activeVisitorTrack.at(-1)?.time ?? '--:--' }}</time>
        </div>
      </div>
      <div v-else class="visitor-track-empty">
        <i>◎</i>
        <span>
          <b>请选择访客查看移动轨迹</b>
          <small>点击中央访客点位、右侧异常事件或访客列表进入轨迹模式</small>
        </span>
      </div>
    </HudPanel>
  </section>
</template>
