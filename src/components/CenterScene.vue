<script setup lang="ts">
import * as Icons from '@element-plus/icons-vue'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { alerts, layerItems, sceneMarkers, securityCameraAreas, securityCameras, visitorAreas, visitors } from '../data/mock'
import { useDashboardStore } from '../stores/dashboard'
import type { LayerKey } from '../data/types'
import BaseChart from './BaseChart.vue'

const store = useDashboardStore()
const iconMap = Icons as Record<string, any>
const videoRef = ref<HTMLVideoElement | null>(null)
const videoFrameRef = ref<HTMLElement | null>(null)
const alertImageRef = ref<HTMLElement | null>(null)
const fullscreenMedia = ref<'video' | 'alert' | null>(null)
const fallbackFullscreenMedia = ref<'video' | 'alert' | null>(null)
const videoLoadFailed = ref(false)
const previewPlaying = ref(true)
const previewProgress = ref(38)
const now = ref(new Date())
const overviewCycleIndex = ref(0)
const overviewVisitorMotionTick = ref(0)
const activeOverviewCameraIds = ref<string[]>([])
let timer = 0
let overviewMotionTimer = 0
const clock = computed(() => new Intl.DateTimeFormat('zh-CN', {
  year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
}).format(now.value).replaceAll('/', '-'))
const statusText = { online: '正常在线', offline: '设备离线', abnormal: '视频异常', alarm: '实时告警' }
const areaSummaries = computed(() => securityCameraAreas.map(area => {
  const cameras = securityCameras.filter(camera => camera.areaId === area.id)
  return { ...area, cameras, alerts: cameras.reduce((sum, camera) => sum + camera.alertCount, 0) }
}))
const visitorAreaSummaries = computed(() => visitorAreas.map(area => {
  const people = store.filteredVisitors.filter(visitor => visitor.areaId === area.id)
  const isDefaultScope = store.visitorScope === '当前在厂' && store.visitorStatus === '全部状态' && store.visitorAreaFilter === '全部区域'
  return { ...area, people, displayTotal: isDefaultScope ? area.total : people.length, displayAbnormal: isDefaultScope ? area.abnormal : people.filter(visitor => !['正常', '已离厂'].includes(visitor.status)).length }
}).filter(area => area.displayTotal > 0))
const visitorTrackSegments = computed(() => store.activeVisitorTrack.slice(1).map((node, index) => ({
  from: store.activeVisitorTrack[index],
  to: node,
  interrupted: node.connected === false || node.event === '定位中断',
})))
const visitorStatusTone = (status: string) => {
  if (status === '限制区告警') return 'critical'
  if (status === '超时滞留') return 'warning'
  if (status === '即将超时') return 'attention'
  if (status === '定位失联') return 'offline'
  return 'normal'
}
const selectedCameraAlerts = computed(() => store.selectedCamera
  ? ['14:00:22 明火识别 · 处理中', '13:49:06 烟雾识别 · 已处理'].slice(0, Math.max(store.selectedCamera.alertCount, 1))
  : [])
const selectedAiAlertCamera = computed(() => securityCameras.find(camera => camera.id === store.selectedAiAlert?.cameraId))
const overviewAlertMarkers = computed(() => alerts.flatMap(alert => {
  const marker = sceneMarkers.find(item => item.id === alert.markerId)
  return marker ? [{ alert, x: marker.x, y: marker.y }] : []
}))
const activeOverviewAlertId = computed(() => overviewAlertMarkers.value[
  overviewCycleIndex.value % Math.max(overviewAlertMarkers.value.length, 1)
]?.alert.id)
const overviewBuildingMarkers = computed(() => sceneMarkers.filter(marker => marker.layer === 'building'))
const overviewDeviceMarkers = computed(() => sceneMarkers.filter(marker => marker.layer === 'device' && marker.device))
const activeOverviewBuilding = computed(() => overviewBuildingMarkers.value[overviewCycleIndex.value % Math.max(overviewBuildingMarkers.value.length, 1)])
const activeOverviewDevice = computed(() => overviewDeviceMarkers.value[overviewCycleIndex.value % Math.max(overviewDeviceMarkers.value.length, 1)])
const overviewVisitors = computed(() => visitors.filter(visitor => visitor.status !== '已离厂').map((visitor, index) => {
  const phase = overviewVisitorMotionTick.value + index * 1.7
  return {
    ...visitor,
    displayX: Math.min(88, Math.max(12, visitor.x + Math.sin(phase) * 1.15)),
    displayY: Math.min(76, Math.max(20, visitor.y + Math.cos(phase * .86) * .85)),
  }
}))
const activeOverviewCameras = computed(() => activeOverviewCameraIds.value
  .map(id => securityCameras.find(camera => camera.id === id))
  .filter((camera): camera is NonNullable<typeof camera> => Boolean(camera)))
const overviewLayerDescriptions: Record<Extract<LayerKey, 'overview' | 'building' | 'device' | 'people' | 'camera'>, string> = {
  overview: '实时告警动态感知',
  building: '主要建筑轮巡',
  device: '关键设备运行轮巡',
  people: '园区访客实时定位',
  camera: '监控点位随机巡检',
}
function refreshOverviewCameras() {
  activeOverviewCameraIds.value = [...securityCameras]
    .sort(() => Math.random() - .5)
    .slice(0, 5)
    .map(camera => camera.id)
}
function selectOverviewLayer(layer: LayerKey) {
  store.activeLayer = layer
  store.riskFilter = '全部'
  store.selectedMarker = null
  store.selectedAlert = null
  store.closeCamera()
  overviewCycleIndex.value = 0
  if (layer === 'camera') refreshOverviewCameras()
}
function syncFullscreenMedia() {
  if (document.fullscreenElement === videoFrameRef.value) fullscreenMedia.value = 'video'
  else if (document.fullscreenElement === alertImageRef.value) fullscreenMedia.value = 'alert'
  else fullscreenMedia.value = null
}
function handleFullscreenKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') fallbackFullscreenMedia.value = null
}
onMounted(() => {
  timer = window.setInterval(() => now.value = new Date(), 1000)
  refreshOverviewCameras()
  overviewMotionTimer = window.setInterval(() => {
    if (store.activeNav !== 'overview') return
    overviewCycleIndex.value += 1
    overviewVisitorMotionTick.value += .82
    if (store.activeLayer === 'camera') refreshOverviewCameras()
  }, 2400)
  document.addEventListener('fullscreenchange', syncFullscreenMedia)
  document.addEventListener('keydown', handleFullscreenKeydown)
})
onBeforeUnmount(() => {
  clearInterval(timer)
  clearInterval(overviewMotionTimer)
  document.removeEventListener('fullscreenchange', syncFullscreenMedia)
  document.removeEventListener('keydown', handleFullscreenKeydown)
})
watch(() => store.requestedVideoTime, time => {
  if (videoRef.value) videoRef.value.currentTime = time
})
watch(() => store.selectedCamera?.id, () => {
  videoLoadFailed.value = false
  previewPlaying.value = true
})
const hasPlayableVideo = computed(() => Boolean(store.selectedCamera?.videoUrl) && !videoLoadFailed.value)
function togglePreview() {
  previewPlaying.value = !previewPlaying.value
  if (!videoRef.value) return
  if (previewPlaying.value) void videoRef.value.play()
  else videoRef.value.pause()
}
function syncRequestedVideoTime() {
  if (!videoRef.value) return
  videoRef.value.currentTime = Math.min(store.requestedVideoTime, videoRef.value.duration || store.requestedVideoTime)
}
function handleVideoError() {
  videoLoadFailed.value = true
}
async function toggleMediaFullscreen(target: 'video' | 'alert') {
  const element = target === 'video' ? videoFrameRef.value : alertImageRef.value
  if (!element) return
  if (fallbackFullscreenMedia.value === target) {
    fallbackFullscreenMedia.value = null
    return
  }
  if (document.fullscreenElement === element) {
    await document.exitFullscreen()
    return
  }
  fallbackFullscreenMedia.value = null
  try {
    if (document.fullscreenElement) await document.exitFullscreen()
    await element.requestFullscreen()
  } catch {
    fallbackFullscreenMedia.value = target
  }
}
const detailTrend = computed(() => ({
  grid: { left: 25, right: 8, top: 8, bottom: 18 },
  xAxis: { type: 'category', data: ['02','04','06','08','10','12','14','16','18','20','22','24'], axisLabel: { color: '#66849f', fontSize: 9 }, axisLine: { lineStyle: { color: '#23466a' } } },
  yAxis: { type: 'value', axisLabel: { show: false }, splitLine: { lineStyle: { color: 'rgba(44,96,139,.25)' } } },
  tooltip: { trigger: 'axis' },
  series: [{ type: 'line', data: store.selectedMarker?.device?.trend ?? [], smooth: true, showSymbol: false, lineStyle: { color: '#22c4ff', width: 2 }, areaStyle: { color: 'rgba(22,166,238,.18)' } }],
}))
</script>

<template>
  <section class="scene" :class="{ 'security-scene': store.activeNav === 'security' }" @click.self="store.expandedCameraArea = null">
    <div class="scene__vignette" />
    <img src="/assets/factory-main.png" alt="正泰集团厂区数字孪生主场景" class="scene__image"
      @click="store.activeNav === 'security' ? (store.expandedCameraArea = null) : store.activeNav === 'people' && !store.selectedVisitor ? (store.expandedVisitorArea = null) : null" />

    <template v-if="store.activeNav === 'security'">
      <div class="security-scan-line" />
      <div class="security-scene-badge"><i />AI VIDEO ANALYTICS <b>全厂监控态势</b></div>
      <template v-for="area in areaSummaries" :key="area.id">
        <button v-if="store.expandedCameraArea !== area.id" class="camera-cluster"
          :class="{ alarming: area.alerts > 0 }" :style="{ left: `${area.x}%`, top: `${area.y}%` }"
          @click.stop="store.expandedCameraArea = area.id">
          <i><el-icon><component :is="iconMap.VideoCameraFilled" /></el-icon><b>{{ area.cameras.length }}</b></i>
          <span><strong>{{ area.name }}</strong><small>{{ area.cameras.length }} 路在线 · 告警 {{ area.alerts }}</small></span>
        </button>
        <button v-for="camera in area.cameras" v-else :key="camera.id" class="security-camera-marker"
          :class="[`status-${camera.status}`, { selected: store.selectedCamera?.id === camera.id }]"
          :style="{ left: `${camera.x}%`, top: `${camera.y}%` }" @click.stop="store.openCamera(camera)">
          <span><el-icon><component :is="iconMap.VideoCameraFilled" /></el-icon></span>
          <i>{{ camera.name }}</i>
          <div>
            <strong>{{ camera.name }}</strong>
            <small>{{ camera.area }} · {{ statusText[camera.status] }}</small>
            <small>AI：{{ camera.algorithms.join(' / ') }}</small>
            <em v-if="camera.alertCount">当前告警 {{ camera.alertCount }}</em>
          </div>
        </button>
      </template>

      <transition name="slide">
        <aside v-if="store.selectedAiAlert" class="security-video-preview security-alert-detail">
          <header>
            <div><span class="live-dot alarm-dot" /><small>AI ALERT / WORK ORDER</small><h3>算法告警详情</h3></div>
            <button @click="store.closeAiAlert">×</button>
          </header>
          <div ref="alertImageRef" class="security-alert-detail-image"
            :class="{ 'media-pseudo-fullscreen': fallbackFullscreenMedia === 'alert' }" :style="{
            '--alert-snapshot': store.selectedAiAlert.snapshotUrl ? `url('${store.selectedAiAlert.snapshotUrl}')` : 'none',
            '--snapshot-position': store.selectedAiAlert.snapshotPosition,
          }">
            <span :class="`level-${store.selectedAiAlert.level}`">{{ store.selectedAiAlert.level }}</span>
            <time>{{ store.selectedAiAlert.time }}</time>
            <button class="media-fullscreen-button" :aria-label="fullscreenMedia === 'alert' || fallbackFullscreenMedia === 'alert' ? '退出告警截图全屏' : '全屏查看告警截图'"
              @click="toggleMediaFullscreen('alert')"><el-icon><component :is="iconMap.FullScreen" /></el-icon></button>
          </div>
          <section class="security-alert-detail-summary">
            <span>{{ store.selectedAiAlert.algorithm }}</span>
            <strong>{{ store.selectedAiAlert.content }}</strong>
            <small>{{ store.selectedAiAlert.orderNo }}</small>
          </section>
          <div class="security-alert-detail-meta">
            <span>发生时间<b>2026-07-17 {{ store.selectedAiAlert.time }}</b></span>
            <span>所属区域<b>{{ store.selectedAiAlert.area }}</b></span>
            <span>监控点位<b>{{ selectedAiAlertCamera?.name ?? '未关联摄像头' }}</b></span>
            <span>工单状态<b :class="`status-${store.selectedAiAlert.status}`">{{ store.selectedAiAlert.status }}</b></span>
            <span class="wide">处理责任人<b>{{ store.selectedAiAlert.assignee }}</b></span>
          </div>
          <section v-if="store.selectedAiAlert.status === '待确认'" class="security-work-order-actions">
            <div>
              <small>告警工单待确认</small>
              <b>请选择处置方式，处理结果将同步更新告警状态</b>
            </div>
            <button class="dismiss" @click="store.processAiAlert('dismiss')">消除告警</button>
            <button class="notify" @click="store.processAiAlert('notify')">通知责任人</button>
          </section>
          <section v-else class="security-work-order-result">
            <span>{{ store.selectedAiAlert.status === '已处理' ? '✓ 告警已消除并归档' : '↗ 已通知责任人，工单处理中' }}</span>
          </section>
        </aside>
        <aside v-else-if="store.selectedCamera" class="security-video-preview">
          <header>
            <div><span class="live-dot" /><small>CAMERA LIVE / AI ANALYTICS</small><h3>{{ store.selectedCamera.name }}</h3></div>
            <button @click="store.closeCamera">×</button>
          </header>
          <div ref="videoFrameRef" class="security-video-frame"
            :class="{ 'media-pseudo-fullscreen': fallbackFullscreenMedia === 'video' }">
            <video v-if="hasPlayableVideo" ref="videoRef" :src="store.selectedCamera.videoUrl"
              autoplay muted loop playsinline preload="metadata" :poster="`/assets/factory-main.png`"
              @loadedmetadata="syncRequestedVideoTime" @error="handleVideoError" />
            <div v-else class="security-video-fallback" :class="{ paused: !previewPlaying }"
              :style="{ backgroundPosition: store.selectedCamera.posterPosition }">
              <span class="video-grid" /><b>LIVE</b><time>{{ clock }}</time>
              <i class="tracking-box"><span>AI TRACKING</span></i>
              <em>{{ store.selectedCamera.videoUrl ? '视频加载失败 · 已切换演示画面' : '本地演示画面 · 视频素材待配置' }}</em>
            </div>
            <div v-if="!hasPlayableVideo" class="security-video-controls">
              <button @click="togglePreview">{{ previewPlaying ? 'Ⅱ' : '▶' }}</button>
              <input v-model="previewProgress" type="range" min="0" max="100" aria-label="视频进度" />
              <time>00:{{ String(Math.round(Number(previewProgress) * .36)).padStart(2, '0') }} / 00:36</time>
            </div>
            <button class="media-fullscreen-button" :aria-label="fullscreenMedia === 'video' || fallbackFullscreenMedia === 'video' ? '退出视频全屏' : '全屏查看实时视频'"
              @click="toggleMediaFullscreen('video')"><el-icon><component :is="iconMap.FullScreen" /></el-icon></button>
          </div>
          <div class="security-camera-meta">
            <span>所属区域<b>{{ store.selectedCamera.area }}</b></span>
            <span>当前状态<b :class="`camera-${store.selectedCamera.status}`">{{ statusText[store.selectedCamera.status] }}</b></span>
            <span class="wide">启用算法<b>{{ store.selectedCamera.algorithms.join('、') }}</b></span>
          </div>
          <section class="security-recent-alerts">
            <h4>最近告警记录 <span>{{ store.selectedCamera.alertCount }} 条</span></h4>
            <p v-if="!store.selectedCamera.alertCount">当前无未处置告警</p>
            <p v-for="item in selectedCameraAlerts" v-else :key="item">{{ item }}</p>
          </section>
        </aside>
      </transition>
    </template>

    <template v-else-if="store.activeNav === 'people'">
      <div class="visitor-scene-badge"><i />UWB POSITIONING <b>访客实时定位</b><small>门禁、身份核验、定位数据实时融合</small></div>
      <div class="visitor-scene-filters">
        <div>
          <button v-for="scope in ['全部访客','当前在厂','今日入厂','今日已离厂','异常访客'] as const" :key="scope"
            :class="{ active: store.visitorScope === scope }" @click="store.visitorScope = scope">{{ scope }}</button>
        </div>
        <select v-model="store.visitorStatus" aria-label="访客状态筛选">
          <option>全部状态</option><option>正常</option><option>即将超时</option><option>超时滞留</option><option>限制区告警</option><option>定位失联</option><option>已离厂</option>
        </select>
        <button v-if="store.visitorAreaFilter !== '全部区域'" class="visitor-filter-reset" @click="store.visitorAreaFilter = '全部区域'; store.expandedVisitorArea = null">清除区域筛选</button>
      </div>

      <svg v-if="store.selectedVisitor" class="visitor-track-map" viewBox="0 0 100 100" preserveAspectRatio="none">
        <line v-for="segment in visitorTrackSegments" :key="`${segment.from.id}-${segment.to.id}`"
          :x1="segment.from.x" :y1="segment.from.y" :x2="segment.to.x" :y2="segment.to.y"
          :class="{ interrupted: segment.interrupted }" />
        <circle v-for="node in store.activeVisitorTrack" :key="node.id" :cx="node.x" :cy="node.y" r=".55"
          :class="`node-${node.event}`" />
      </svg>
      <div v-if="store.selectedVisitor && store.visitorTrackCursor" class="visitor-track-cursor"
        :style="{ left: `${store.visitorTrackCursor.x}%`, top: `${store.visitorTrackCursor.y}%` }"><i /></div>

      <template v-for="area in visitorAreaSummaries" :key="area.id">
        <button v-if="store.expandedVisitorArea !== area.id && !store.selectedVisitor" class="visitor-cluster"
          :class="{ alarming: area.displayAbnormal > 0 }" :style="{ left: `${area.x}%`, top: `${area.y}%` }"
          @click.stop="store.expandedVisitorArea = area.id">
          <i><el-icon><component :is="iconMap.UserFilled" /></el-icon><b>{{ area.displayTotal }}</b></i>
          <span><strong>{{ area.name }}</strong><small>访客 {{ area.displayTotal }} 人 · 异常 {{ area.displayAbnormal }} 人</small></span>
        </button>
        <button v-for="visitor in area.people" v-else :key="visitor.id" class="visitor-marker"
          :class="[`status-${visitorStatusTone(visitor.status)}`, { selected: store.selectedVisitor?.id === visitor.id, dimmed: store.selectedVisitor && store.selectedVisitor.id !== visitor.id }]"
          :style="{ left: `${visitor.x}%`, top: `${visitor.y}%` }" @click.stop="store.selectVisitor(visitor)">
          <span><el-icon><component :is="iconMap.UserFilled" /></el-icon></span><i>{{ visitor.maskedName }}</i>
          <div><strong>{{ visitor.maskedName }} · {{ visitor.status }}</strong><small>{{ visitor.company }}</small><small>{{ visitor.area }} · 入厂 {{ visitor.actualEntry }}</small><small>停留 {{ visitor.duration }} · 定位 {{ visitor.lastLocated }}</small></div>
        </button>
      </template>

    </template>

    <template v-else>
      <div class="overview-layer-status"><i /><span>{{ overviewLayerDescriptions[store.activeLayer as keyof typeof overviewLayerDescriptions] }}</span><b>LIVE</b></div>

      <template v-if="store.activeLayer === 'overview'">
        <button v-for="(item, index) in overviewAlertMarkers" :key="item.alert.id"
          class="overview-alert-marker" :class="[`tone-${item.alert.level}`, { active: activeOverviewAlertId === item.alert.id }]"
          :style="{ left: `${item.x}%`, top: `${item.y}%`, '--marker-delay': `${index * .7}s` }"
          :aria-label="`${item.alert.content}：${item.alert.area}`" @click.stop="store.locateAlert(item.alert)">
          <span><b>!</b></span>
          <div class="overview-marker-tooltip">
            <header><i />{{ item.alert.category }}告警 <time>{{ item.alert.time }}</time></header>
            <strong>{{ item.alert.content }}</strong>
            <small>{{ item.alert.area }} · {{ item.alert.status }}</small>
            <em>点击查看告警详情</em>
          </div>
        </button>
      </template>

      <template v-else-if="store.activeLayer === 'building'">
          <button v-for="building in overviewBuildingMarkers" :key="building.id"
            class="overview-building-marker" :class="{ active: activeOverviewBuilding?.id === building.id }"
            :style="{ left: `${building.x}%`, top: `${building.y}%` }"
            :aria-label="`${building.name}：${building.sub}`">
            <span><el-icon><component :is="iconMap.OfficeBuilding" /></el-icon></span>
            <div><strong>{{ building.name }}</strong><small>{{ building.sub }}</small></div>
          </button>
      </template>

      <template v-else-if="store.activeLayer === 'device'">
          <button v-for="deviceMarker in overviewDeviceMarkers" :key="deviceMarker.id"
            class="overview-device-marker" :class="{ active: activeOverviewDevice?.id === deviceMarker.id, selected: store.selectedMarker?.id === deviceMarker.id }"
            :style="{ left: `${deviceMarker.x}%`, top: `${deviceMarker.y}%` }"
            :aria-label="`${deviceMarker.name}：${deviceMarker.sub}`" @click.stop="store.selectedMarker = deviceMarker">
            <span><el-icon><component :is="iconMap.Cpu" /></el-icon></span>
            <i>{{ deviceMarker.name }}</i>
            <div class="overview-marker-tooltip device-tooltip">
              <header><i />设备实时状态 <time>{{ deviceMarker.device?.updated }}</time></header>
              <strong>{{ deviceMarker.device?.name }}</strong>
              <small>{{ deviceMarker.device?.area }} · {{ deviceMarker.device?.status }}</small>
              <small>{{ deviceMarker.device?.businessLabel }} {{ deviceMarker.device?.businessValue }}</small>
              <em>点击查看设备实时档案</em>
            </div>
          </button>
      </template>

      <template v-else-if="store.activeLayer === 'people'">
        <button v-for="(visitor, index) in overviewVisitors" :key="visitor.id"
          class="overview-visitor-marker" :class="`status-${visitorStatusTone(visitor.status)}`"
          :style="{ left: `${visitor.displayX}%`, top: `${visitor.displayY}%`, '--visitor-delay': `${index * .28}s` }"
          :aria-label="`${visitor.maskedName}：${visitor.area}`">
          <span><el-icon><component :is="iconMap.UserFilled" /></el-icon></span>
          <div><strong>{{ visitor.maskedName }} · {{ visitor.status }}</strong><small>{{ visitor.area }} · {{ visitor.company }}</small></div>
        </button>
      </template>

      <template v-else-if="store.activeLayer === 'camera'">
        <transition-group name="camera-pop">
          <button v-for="camera in activeOverviewCameras" :key="camera.id"
            class="overview-camera-marker" :class="[`status-${camera.status}`, { selected: store.selectedCamera?.id === camera.id }]"
            :style="{ left: `${camera.x}%`, top: `${camera.y}%` }"
            :aria-label="`${camera.name}：${statusText[camera.status]}`" @click.stop="store.openCamera(camera)">
            <span><el-icon><component :is="iconMap.VideoCameraFilled" /></el-icon></span>
            <div><strong>{{ camera.name }}</strong><small>{{ camera.area }} · {{ statusText[camera.status] }}</small><em>点击查看实时画面</em></div>
          </button>
        </transition-group>
      </template>
    </template>

    <transition v-if="store.activeNav === 'overview' && store.activeLayer === 'camera'" name="slide">
      <aside v-if="store.selectedCamera" class="security-video-preview overview-camera-preview">
        <header>
          <div><span class="live-dot" /><small>CAMERA LIVE / OVERVIEW</small><h3>{{ store.selectedCamera.name }}</h3></div>
          <button @click="store.closeCamera">×</button>
        </header>
        <div ref="videoFrameRef" class="security-video-frame"
          :class="{ 'media-pseudo-fullscreen': fallbackFullscreenMedia === 'video' }">
          <video v-if="hasPlayableVideo" ref="videoRef" :src="store.selectedCamera.videoUrl"
            autoplay muted loop playsinline preload="metadata" poster="/assets/factory-main.png"
            @loadedmetadata="syncRequestedVideoTime" @error="handleVideoError" />
          <div v-else class="security-video-fallback" :class="{ paused: !previewPlaying }"
            :style="{ backgroundPosition: store.selectedCamera.posterPosition }">
            <span class="video-grid" /><b>LIVE</b><time>{{ clock }}</time>
            <i class="tracking-box"><span>AI TRACKING</span></i>
            <em>{{ store.selectedCamera.videoUrl ? '视频加载失败 · 已切换演示画面' : '演示画面 · 视频素材待配置' }}</em>
          </div>
          <button class="media-fullscreen-button" :aria-label="fullscreenMedia === 'video' || fallbackFullscreenMedia === 'video' ? '退出视频全屏' : '全屏查看实时视频'"
            @click="toggleMediaFullscreen('video')"><el-icon><component :is="iconMap.FullScreen" /></el-icon></button>
        </div>
        <div class="security-camera-meta">
          <span>所属区域<b>{{ store.selectedCamera.area }}</b></span>
          <span>当前状态<b :class="`camera-${store.selectedCamera.status}`">{{ statusText[store.selectedCamera.status] }}</b></span>
          <span class="wide">启用算法<b>{{ store.selectedCamera.algorithms.join('、') }}</b></span>
        </div>
        <section class="security-recent-alerts">
          <h4>最近告警记录 <span>{{ store.selectedCamera.alertCount }} 条</span></h4>
          <p v-if="!store.selectedCamera.alertCount">当前无未处置告警</p>
          <p v-for="item in selectedCameraAlerts" v-else :key="item">{{ item }}</p>
        </section>
      </aside>
    </transition>

    <div class="compass"><b>N</b><i>▲</i><span>3D</span></div>
    <nav v-if="store.activeNav !== 'security' && store.activeNav !== 'people'" class="layer-bar">
      <button v-for="item in layerItems" :key="item.key" :class="{ active: store.activeLayer === item.key }" @click="selectOverviewLayer(item.key)">
        <el-icon><component :is="iconMap[item.icon]" /></el-icon><span>{{ item.label }}</span>
      </button>
    </nav>
    <transition v-if="store.activeNav !== 'security' && store.activeNav !== 'people'" name="slide">
      <aside v-if="store.selectedMarker?.device" class="device-detail">
        <button class="detail-close" @click="store.selectedMarker = null">×</button>
        <div class="detail-title"><span class="live-dot" /><div><small>设备实时档案</small><h3>{{ store.selectedMarker.device.name }}</h3></div></div>
        <div class="detail-meta">
          <span>设备编号<b>{{ store.selectedMarker.device.code }}</b></span><span>所属区域<b>{{ store.selectedMarker.device.area }}</b></span>
          <span>设备类型<b>{{ store.selectedMarker.device.type }}</b></span><span>当前状态<b class="ok">{{ store.selectedMarker.device.status }}</b></span>
        </div>
        <div class="detail-kpis">
          <span>额定容量<b>{{ store.selectedMarker.device.rated }}</b></span><span>实时功率<b>{{ store.selectedMarker.device.running }}</b></span>
          <span>{{ store.selectedMarker.device.businessLabel }}<b>{{ store.selectedMarker.device.businessValue }}</b></span><span>累计运行<b>{{ store.selectedMarker.device.hours }}</b></span>
        </div>
        <h4>近24小时运行趋势 <em>更新于 {{ store.selectedMarker.device.updated }}</em></h4>
        <BaseChart :option="detailTrend" />
        <h4>最近告警记录</h4>
        <p v-for="alarm in store.selectedMarker.device.alarms" :key="alarm" class="detail-alarm">{{ alarm }}</p>
      </aside>
    </transition>
  </section>
</template>
