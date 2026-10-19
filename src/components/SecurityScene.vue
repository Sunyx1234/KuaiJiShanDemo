<script setup lang="ts">
import * as Icons from '@element-plus/icons-vue'
import { computed, defineAsyncComponent, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { securityCameraAreas, securityCameras } from '../data/mock'
import { useDashboardStore } from '../stores/dashboard'
import { configureSecurityVideoUrls, getSecurityVideoUrl, securityVideoStatus, securityVideoError, usesSignedSecurityVideos } from '../services/securityVideoUrls'
import { getSavedAdminPin } from '../services/workOrders'

const HuijishanCampusScene = defineAsyncComponent(() => import('./HuijishanCampusScene.vue'))

const store = useDashboardStore()
const route = useRoute()
const showObjModel = ref(true)
const supportsObjModel = computed(() => route.name === 'park-dashboard' && route.params.parkId === 'huijishan')
const isModelMode = computed(() => supportsObjModel.value && showObjModel.value)
const modelReady = ref(false)
const projectionVersion = ref(0)
const objSceneRef = ref<{ projectPoint: (x: number, y: number) => { x: number; y: number } | null } | null>(null)
function projectedPoint(x: number, y: number) {
  void projectionVersion.value
  return isModelMode.value && modelReady.value ? objSceneRef.value?.projectPoint(x, y) ?? { x, y } : { x, y }
}
function scenePointStyle(x: number, y: number) {
  const point = projectedPoint(x, y)
  return { left: `${point.x}%`, top: `${point.y}%` }
}
function switchSceneMode(useModel: boolean) {
  if (useModel) modelReady.value = false
  showObjModel.value = useModel
}
const iconMap = Icons as Record<string, any>
const videoRef = ref<HTMLVideoElement | null>(null)
const videoFrameRef = ref<HTMLElement | null>(null)
const alertImageRef = ref<HTMLElement | null>(null)
const fullscreenMedia = ref<'video' | 'alert' | null>(null)
const fallbackFullscreenMedia = ref<'video' | 'alert' | null>(null)
const videoLoadFailed = ref(false)
const videoRetryCount = ref(0)
const videoReloadKey = ref(0)
const activeVideoUrl = computed(() => store.selectedCamera ? getSecurityVideoUrl(store.selectedCamera.id) : '')
const now = ref(new Date())
const workflowMode = ref<'detail' | 'dispatch'>('detail')
const workflowBusy = ref(false)
const workflowError = ref('')
const dispatchAdminPin = ref(getSavedAdminPin())
const dispatchDeadline = ref(30)
const dispatchRequirement = ref('请立即核查并消除现场隐患，完成后上传处置照片')
const dispatchedMobileUrl = ref('')
const reviewComment = ref('')
const reviewImage = ref<{ url: string; caption: string } | null>(null)
let timer = 0
const clock = computed(() => new Intl.DateTimeFormat('zh-CN', {
  year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
}).format(now.value).replaceAll('/', '-'))
const statusText = { online: '正常在线', offline: '设备离线', abnormal: '视频异常', alarm: '实时告警' }
const areaSummaries = computed(() => securityCameraAreas.map(area => {
  const cameras = securityCameras.filter(camera => camera.areaId === area.id)
  return { ...area, cameras, alerts: cameras.reduce((sum, camera) => sum + camera.alertCount, 0) }
}))
const selectedCameraAlerts = computed(() => store.selectedCamera
  ? ['14:00:22 明火识别 · 处理中', '13:49:06 烟雾识别 · 已处理'].slice(0, Math.max(store.selectedCamera.alertCount, 1))
  : [])
const selectedAiAlertCamera = computed(() => securityCameras.find(camera => camera.id === store.selectedAiAlert?.cameraId))
const selectedWorkOrder = computed(() => store.selectedWorkOrder)
const isRetryDispatch = computed(() => Boolean(selectedWorkOrder.value))
const alertWorkflowSteps = computed(() => {
  const status = store.selectedAiAlert?.status
  const order = selectedWorkOrder.value
  const current = status === '待确认' ? 0
    : status === '待派单' ? 1
      : status === '处理中' ? (order?.progress === '待接单' ? 2 : 3)
        : status === '待复核' ? 4
          : status === '已归档' ? 5 : 0
  return ['确认', '派单', '待接单', '已接单', '复核', '归档'].map((label, index) => ({ label, active: index <= current, current: index === current }))
})
function syncFullscreenMedia() {
  if (document.fullscreenElement === videoFrameRef.value) fullscreenMedia.value = 'video'
  else if (document.fullscreenElement === alertImageRef.value) fullscreenMedia.value = 'alert'
  else fullscreenMedia.value = null
}
function handleFullscreenKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    fallbackFullscreenMedia.value = null
    reviewImage.value = null
  }
}
onMounted(() => {
  timer = window.setInterval(() => now.value = new Date(), 1000)
  document.addEventListener('fullscreenchange', syncFullscreenMedia)
  document.addEventListener('keydown', handleFullscreenKeydown)
})
onBeforeUnmount(() => {
  clearInterval(timer)
  document.removeEventListener('fullscreenchange', syncFullscreenMedia)
  document.removeEventListener('keydown', handleFullscreenKeydown)
})
watch(() => store.requestedVideoTime, time => {
  if (videoRef.value) videoRef.value.currentTime = time
})
watch(() => store.selectedCamera?.id, () => {
  videoLoadFailed.value = false
  videoRetryCount.value = 0
  if (store.selectedCamera) void configureSecurityVideoUrls()
})
watch(activeVideoUrl, () => { videoLoadFailed.value = false })
watch(() => store.selectedAiAlert?.id, () => {
  workflowMode.value = store.selectedAiAlert?.status === '待派单' && !store.selectedWorkOrder ? 'dispatch' : 'detail'
  workflowError.value = ''
  dispatchedMobileUrl.value = ''
  reviewComment.value = ''
})
async function startDispatch() {
  workflowBusy.value = true
  workflowError.value = ''
  try {
    await store.loadWorkOrderConfig()
    store.processAiAlert('notify')
    workflowMode.value = 'dispatch'
    if (!store.workOrderConfig.feishuConfigured) workflowError.value = '飞书配置尚未加载，请稍后重试'
  } finally {
    workflowBusy.value = false
  }
}
async function submitDispatch() {
  workflowBusy.value = true
  workflowError.value = ''
  try {
    const input = {
      adminPin: dispatchAdminPin.value,
      deadlineMinutes: dispatchDeadline.value,
      requirement: dispatchRequirement.value.trim(),
    }
    const result = isRetryDispatch.value
      ? await store.retrySelectedWorkOrderNotification(input)
      : await store.dispatchSelectedAiAlert(input)
    dispatchedMobileUrl.value = result.mobileUrl
    workflowMode.value = 'detail'
  } catch (reason) {
    workflowError.value = reason instanceof Error ? reason.message : '工单派发失败'
  } finally {
    workflowBusy.value = false
  }
}
async function submitReview(decision: 'approve' | 'reject') {
  workflowBusy.value = true
  workflowError.value = ''
  try {
    await store.reviewSelectedWorkOrder({
      adminPin: dispatchAdminPin.value,
      decision,
      comment: reviewComment.value.trim(),
    })
    reviewComment.value = ''
  } catch (reason) {
    workflowError.value = reason instanceof Error ? reason.message : '工单复核失败'
  } finally {
    workflowBusy.value = false
  }
}
function retryFeishuNotification() {
  workflowError.value = ''
  dispatchDeadline.value = selectedWorkOrder.value?.deadlineMinutes ?? 30
  dispatchRequirement.value = selectedWorkOrder.value?.requirement || '请立即核查并消除现场隐患，完成后上传处置照片'
  workflowMode.value = 'dispatch'
}
function openReviewImage(url: string, caption: string) {
  reviewImage.value = { url, caption }
}
function formatWorkOrderTime(value?: string) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  }).format(new Date(value)).replaceAll('/', '-')
}
const hasPlayableVideo = computed(() => Boolean(activeVideoUrl.value) && !videoLoadFailed.value)
function syncRequestedVideoTime() {
  if (!videoRef.value) return
  videoRef.value.currentTime = Math.min(store.requestedVideoTime, videoRef.value.duration || store.requestedVideoTime)
}
async function retryVideo() {
  videoLoadFailed.value = false
  videoRetryCount.value = 0
  if (await configureSecurityVideoUrls({ force: true })) videoReloadKey.value++
}
async function handleVideoError() {
  const cameraId = store.selectedCamera?.id
  if (usesSignedSecurityVideos && videoRetryCount.value === 0) {
    videoRetryCount.value++
    const refreshed = await configureSecurityVideoUrls({ force: true })
    if (store.selectedCamera?.id !== cameraId) return
    if (refreshed) { videoReloadKey.value++; return }
  }
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
</script>

<template>
  <section class="scene security-scene" :class="{ 'scene-model-mode': isModelMode }" @click.self="store.expandedCameraArea = null">
    <div class="scene__vignette" />
    <HuijishanCampusScene v-if="isModelMode" ref="objSceneRef" compact
      @ready="modelReady = true" @view-change="projectionVersion++" />
    <img v-else src="/assets/huijishan-campus-aerial.jpg" alt="会稽山园区航拍参考图" class="scene__image"
      @click="store.expandedCameraArea = null" />
    <div v-if="supportsObjModel" class="scene-mode-switch" role="group" aria-label="中央场景切换">
      <button type="button" :class="{ active: showObjModel }" :aria-pressed="showObjModel" @click="switchSceneMode(true)">园区三维</button>
      <button type="button" :class="{ active: !showObjModel }" :aria-pressed="!showObjModel" @click="switchSceneMode(false)">园区航拍</button>
    </div>


      <div class="security-scan-line" />
      <div class="security-scene-badge"><i />AI VIDEO ANALYTICS <b>全厂监控态势</b></div>
      <template v-for="area in areaSummaries" :key="area.id">
        <button v-if="store.expandedCameraArea !== area.id" class="camera-cluster"
          :class="{ alarming: area.alerts > 0 }" :style="scenePointStyle(area.x, area.y)"
          @click.stop="store.expandedCameraArea = area.id">
          <i><el-icon><component :is="iconMap.VideoCameraFilled" /></el-icon><b>{{ area.cameras.length }}</b></i>
          <span><strong>{{ area.name }}</strong><small>{{ area.cameras.length }} 路在线 · 告警 {{ area.alerts }}</small></span>
        </button>
        <button v-for="camera in area.cameras" v-else :key="camera.id" class="security-camera-marker"
          :class="[`status-${camera.status}`, { selected: store.selectedCamera?.id === camera.id }]"
          :style="scenePointStyle(camera.x, camera.y)" @click.stop="store.openCamera(camera)">
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
          <div class="work-order-stepper">
            <span v-for="step in alertWorkflowSteps" :key="step.label" :class="{ active: step.active, current: step.current }">
              <i />{{ step.label }}
            </span>
          </div>
          <div class="security-alert-detail-meta">
            <span>发生时间<b>2026-07-17 {{ store.selectedAiAlert.time }}</b></span>
            <span>所属区域<b>{{ store.selectedAiAlert.area }}</b></span>
            <span>监控点位<b>{{ selectedAiAlertCamera?.name ?? '未关联摄像头' }}</b></span>
            <span>工单状态<b :class="`status-${store.selectedAiAlert.status}`">{{ store.selectedAiAlert.status }}</b></span>
            <span class="wide">处理责任人<b>{{ store.selectedAiAlert.assignee }}</b></span>
          </div>
          <section v-if="workflowMode === 'dispatch'" class="work-order-dispatch-form">
            <header><span><small>DISPATCH WORK ORDER</small><b>{{ isRetryDispatch ? '重新派发处置工单' : '创建处置工单' }}</b></span><em>飞书通知</em></header>
            <div class="dispatch-grid">
              <label>责任部门<input :value="store.workOrderConfig.department" disabled /></label>
              <label>责任人<input :value="store.workOrderConfig.assignee" disabled title="当前仅配置一位飞书责任人" /></label>
              <label>处置时限<select v-model="dispatchDeadline"><option :value="15">15 分钟</option><option :value="30">30 分钟</option><option :value="60">1 小时</option><option :value="120">2 小时</option></select></label>
              <label>管理口令<input v-model="dispatchAdminPin" type="password" placeholder="Netlify 管理口令" /></label>
              <label class="wide">处置要求<textarea v-model="dispatchRequirement" maxlength="200" /></label>
            </div>
            <div class="dispatch-channel">
              <span><i :class="{ online: store.workOrderConfig.feishuConfigured }" />飞书主通知<b>{{ store.workOrderConfig.feishuConfigured ? '已配置' : '待配置' }}</b></span>
              <span><i :class="{ online: store.workOrderConfig.smsConfigured }" />短信辅助<b>{{ store.workOrderConfig.smsConfigured ? '已配置' : '后续接入' }}</b></span>
            </div>
            <footer><button @click="workflowMode = 'detail'">返回告警</button><button class="primary" :disabled="workflowBusy" @click="submitDispatch">{{ workflowBusy ? '正在发送…' : isRetryDispatch ? '确认重新发送' : '确认派单' }}</button></footer>
          </section>
          <section v-else-if="store.selectedAiAlert.status === '待确认'" class="security-work-order-actions">
            <div>
              <small>告警工单待确认</small>
              <b>请确认是否需要生成现场处置工单</b>
            </div>
            <button class="dismiss" @click="store.processAiAlert('dismiss')">排除告警</button>
            <button class="notify" @click="startDispatch">确认为有效</button>
          </section>
          <section v-else-if="selectedWorkOrder" class="work-order-live-detail">
            <div v-if="dispatchedMobileUrl" class="dispatch-success">
              <i>✓</i><span><b>工单派发成功</b><small>飞书卡片已提交发送，可用手机打开移动端</small></span>
              <a :href="dispatchedMobileUrl" target="_blank">打开移动端</a>
            </div>
            <div class="work-order-current">
              <span><small>当前进展</small><b>{{ selectedWorkOrder.progress }}</b></span>
              <span><small>完成时限</small><b>{{ formatWorkOrderTime(selectedWorkOrder.deadlineAt) }}</b></span>
              <span><small>飞书通知</small><b :class="{ danger: selectedWorkOrder.notifications[0]?.status === '发送失败' }">{{ selectedWorkOrder.notifications[0]?.status }}</b><button v-if="selectedWorkOrder.notifications[0]?.status === '发送失败'" :disabled="workflowBusy" @click="retryFeishuNotification">重试发送</button></span>
            </div>
            <div v-if="selectedWorkOrder.status === '待复核'" class="work-order-review">
              <header><b>处置前后证据复核</b><small>{{ selectedWorkOrder.photos.length }} 张处置照片</small></header>
              <div class="review-photos">
                <figure role="button" tabindex="0" title="点击全屏查看" @click="openReviewImage(store.selectedAiAlert.snapshotUrl || '', '原始告警抓拍')" @keydown.enter="openReviewImage(store.selectedAiAlert.snapshotUrl || '', '原始告警抓拍')">
                  <img :src="store.selectedAiAlert.snapshotUrl" /><figcaption>原始告警抓拍 · 点击放大</figcaption>
                </figure>
                <figure v-for="(photo, index) in selectedWorkOrder.photos" :key="photo.key" role="button" tabindex="0" title="点击全屏查看" @click="openReviewImage(photo.url, `现场处置照片 ${index + 1}`)" @keydown.enter="openReviewImage(photo.url, `现场处置照片 ${index + 1}`)">
                  <img :src="photo.url" /><figcaption>现场处置照片 {{ index + 1 }} · 点击放大</figcaption>
                </figure>
              </div>
              <p v-if="selectedWorkOrder.cause"><span>原因说明</span>{{ selectedWorkOrder.cause }}</p>
              <p v-if="selectedWorkOrder.measures"><span>处置措施</span>{{ selectedWorkOrder.measures }}</p>
              <div class="review-controls">
                <input v-model="dispatchAdminPin" type="password" placeholder="管理口令" />
                <input v-model="reviewComment" placeholder="退回原因（退回时必填）" />
                <button :disabled="workflowBusy" @click="submitReview('reject')">退回补充</button>
                <button class="approve" :disabled="workflowBusy" @click="submitReview('approve')">复核归档</button>
              </div>
            </div>
            <ol class="work-order-timeline">
              <li v-for="item in [...selectedWorkOrder.timeline].reverse().slice(0, 4)" :key="item.id">
                <i /><span><b>{{ item.title }}</b><small>{{ item.detail }}</small></span><time>{{ item.time.slice(-8) }}</time>
              </li>
            </ol>
          </section>
          <section v-else class="security-work-order-result">
            <span>{{ store.selectedAiAlert.status === '已排除' ? '✓ 告警已排除并记录确认结果' : store.selectedAiAlert.status === '已归档' ? '✓ 工单已完成电子归档' : '↗ 工单状态等待同步' }}</span>
          </section>
          <p v-if="workflowError" class="work-order-error">{{ workflowError }}</p>
        </aside>
        <aside v-else-if="store.selectedCamera" class="security-video-preview">
          <header>
            <div><span class="live-dot" /><small>CAMERA LIVE / AI ANALYTICS</small><h3>{{ store.selectedCamera.name }}</h3></div>
            <button @click="store.closeCamera">×</button>
          </header>
          <div ref="videoFrameRef" class="security-video-frame"
            :class="{ 'media-pseudo-fullscreen': fallbackFullscreenMedia === 'video' }">
            <video v-if="hasPlayableVideo" :key="`${store.selectedCamera.id}-${videoReloadKey}`" ref="videoRef" :src="activeVideoUrl"
              autoplay muted loop playsinline preload="metadata" :poster="`/assets/huijishan-campus-aerial.jpg`"
              @loadedmetadata="syncRequestedVideoTime" @error="handleVideoError" />
            <div v-else class="security-video-unavailable" role="status">
              <el-icon><component :is="iconMap.VideoCameraFilled" /></el-icon>
              <p>{{ securityVideoStatus === 'loading' ? '视频连接中…' : securityVideoError || '视频暂不可用' }}</p>
              <button v-if="securityVideoStatus !== 'loading'" type="button" @click="retryVideo">重新加载</button>
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
  </section>
  <Teleport to="body">
    <div v-if="reviewImage" class="review-image-lightbox" role="dialog" aria-modal="true" :aria-label="reviewImage.caption" @click.self="reviewImage = null">
      <button class="review-image-lightbox__close" aria-label="关闭全屏图片" @click="reviewImage = null">×</button>
      <img :src="reviewImage.url" :alt="reviewImage.caption" />
      <p>{{ reviewImage.caption }}</p>
    </div>
  </Teleport>
</template>

<style scoped>
.security-video-unavailable{height:100%;min-height:160px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;background:#06192c;color:#96b4c9;font-size:12px}.security-video-unavailable>.el-icon{font-size:30px;color:#4a92b9}.security-video-unavailable p{margin:0}.security-video-unavailable button{border:1px solid #39779b;background:#12354b;color:#b9e5f6;padding:6px 14px;cursor:pointer}.security-video-unavailable button:focus-visible{outline:2px solid #79d8e3;outline-offset:2px}
</style>
