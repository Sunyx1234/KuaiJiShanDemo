import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { AiAlert, AiAlertStatus, AlertItem, LayerKey, NavKey, SceneMarker, SecurityCamera, SecurityRange, Visitor, VisitorException, VisitorExceptionStatus, VisitorScope, VisitorStatus, VisitorTrackRange, WorkOrder, WorkOrderIntegrationConfig } from '../data/types'
import { aiAlerts, alerts, metricsByNav, sceneMarkers, securityCameras, visitorExceptions, visitors } from '../data/mock'
import { dispatchWorkOrder as dispatchWorkOrderRequest, fetchWorkOrderConfig, fetchWorkOrders, reviewWorkOrder as reviewWorkOrderRequest } from '../services/workOrders'

export const useDashboardStore = defineStore('dashboard', () => {
  const activeNav = ref<NavKey>('overview')
  const activeLayer = ref<LayerKey>('overview')
  const selectedMarker = ref<SceneMarker | null>(null)
  const selectedAlert = ref<AlertItem | null>(null)
  const alertCategory = ref('全部')
  const riskFilter = ref<'全部' | '高风险' | '中风险' | '低风险'>('全部')
  const energyType = ref<'电' | '水' | '气'>('电')
  const timeDimension = ref<'day' | 'month' | 'year'>('day')
  const expandedCameraArea = ref<string | null>(null)
  const selectedCamera = ref<SecurityCamera | null>(null)
  const selectedAiAlert = ref<AiAlert | null>(null)
  const aiAlertItems = ref<AiAlert[]>(aiAlerts.map(alert => ({ ...alert })))
  const aiAlertStatus = ref<'全部告警' | AiAlertStatus>('全部告警')
  const hotspotRange = ref<SecurityRange>('today')
  const workOrders = ref<WorkOrder[]>([])
  const workOrderConfig = ref<WorkOrderIntegrationConfig>({
    assignee: '现场责任人',
    department: '安全生产部',
    feishuConfigured: false,
    smsConfigured: false,
  })
  const workOrderServiceError = ref('')
  const requestedVideoTime = ref(0)
  const visitorScope = ref<VisitorScope>('当前在厂')
  const visitorStatus = ref<'全部状态' | VisitorStatus>('全部状态')
  const visitorAreaFilter = ref('全部区域')
  const expandedVisitorArea = ref<string | null>(null)
  const selectedVisitor = ref<Visitor | null>(null)
  const selectedVisitorException = ref<VisitorException | null>(null)
  const visitorExceptionStatus = ref<'全部' | VisitorExceptionStatus>('全部')
  const visitorTrackRange = ref<VisitorTrackRange>('all')
  const visitorTrackPlaying = ref(false)
  const visitorTrackProgress = ref(100)
  const visitorPlaybackSpeed = ref<1 | 2 | 4>(1)

  const metrics = computed(() => metricsByNav[activeNav.value])
  const visibleMarkers = computed(() => {
    let list = activeLayer.value === 'overview' ? sceneMarkers : sceneMarkers.filter(m => m.layer === activeLayer.value)
    if (riskFilter.value !== '全部') {
      const selectedRisk = riskFilter.value
      const toneMap = { 高风险: 'critical', 中风险: 'attention', 低风险: 'normal' } as const
      list = sceneMarkers.filter(m => m.layer === 'risk' && m.tone === toneMap[selectedRisk])
    }
    return list
  })
  const filteredAlerts = computed(() => alertCategory.value === '全部' ? alerts : alerts.filter(a => a.category === alertCategory.value))
  const filteredAiAlerts = computed(() => aiAlertStatus.value === '全部告警'
    ? aiAlertItems.value
    : aiAlertItems.value.filter(a => a.status === aiAlertStatus.value))
  const selectedWorkOrder = computed(() => workOrders.value.find(order => order.alertId === selectedAiAlert.value?.id) ?? null)
  const filteredVisitors = computed(() => visitors.filter(visitor => {
    const scopeMatched = visitorScope.value === '全部访客'
      || visitorScope.value === '今日入厂'
      || (visitorScope.value === '当前在厂' && visitor.status !== '已离厂')
      || (visitorScope.value === '今日已离厂' && visitor.status === '已离厂')
      || (visitorScope.value === '异常访客' && !['正常', '已离厂'].includes(visitor.status))
    const statusMatched = visitorStatus.value === '全部状态' || visitor.status === visitorStatus.value
    const areaMatched = visitorAreaFilter.value === '全部区域' || visitor.areaId === visitorAreaFilter.value
    return scopeMatched && statusMatched && areaMatched
  }))
  const filteredVisitorExceptions = computed(() => visitorExceptionStatus.value === '全部'
    ? visitorExceptions
    : visitorExceptions.filter(item => item.status === visitorExceptionStatus.value))
  const activeVisitorTrack = computed(() => {
    const track = selectedVisitor.value?.track ?? []
    const countMap: Record<VisitorTrackRange, number> = { '30m': 2, '1h': 3, '2h': 4, all: track.length }
    return track.slice(-countMap[visitorTrackRange.value])
  })
  const visitorTrackCursor = computed(() => {
    const track = activeVisitorTrack.value
    if (!track.length) return null
    if (track.length === 1) return track[0]
    const position = Math.min(1, Math.max(0, visitorTrackProgress.value / 100)) * (track.length - 1)
    const fromIndex = Math.min(track.length - 2, Math.floor(position))
    const ratio = position - fromIndex
    const from = track[fromIndex]
    const to = track[fromIndex + 1]
    return {
      ...from,
      id: `${from.id}-${to.id}`,
      x: from.x + (to.x - from.x) * ratio,
      y: from.y + (to.y - from.y) * ratio,
      time: ratio < 0.5 ? from.time : to.time,
      event: ratio < 1 ? from.event : to.event,
      area: ratio < 0.5 ? from.area : to.area,
    }
  })

  function locateAlert(alert: AlertItem) {
    selectedAlert.value = alert
    selectedMarker.value = sceneMarkers.find(m => m.id === alert.markerId) ?? null
    activeLayer.value = 'overview'
  }

  function openCamera(camera: SecurityCamera) {
    expandedCameraArea.value = camera.areaId
    selectedCamera.value = camera
    selectedAiAlert.value = null
    requestedVideoTime.value = 0
  }

  function locateAiAlert(alert: AiAlert) {
    const camera = securityCameras.find(item => item.id === alert.cameraId)
    selectedCamera.value = null
    selectedAiAlert.value = alert
    expandedCameraArea.value = camera?.areaId ?? null
    requestedVideoTime.value = 0
  }

  function closeCamera() {
    selectedCamera.value = null
    requestedVideoTime.value = 0
  }

  function closeAiAlert() {
    selectedAiAlert.value = null
  }

  function processAiAlert(action: 'dismiss' | 'notify') {
    if (!selectedAiAlert.value || selectedAiAlert.value.status !== '待确认') return
    selectedAiAlert.value.status = action === 'dismiss' ? '已排除' : '待派单'
    selectedAiAlert.value.assignee = action === 'dismiss' ? '系统归档' : '待分派'
  }

  function applyWorkOrder(order: WorkOrder) {
    const index = workOrders.value.findIndex(item => item.id === order.id)
    if (index >= 0) workOrders.value[index] = order
    else workOrders.value.unshift(order)
    const alert = aiAlertItems.value.find(item => item.id === order.alertId)
    if (alert) {
      alert.status = order.status
      alert.assignee = order.assignee
    }
  }

  async function loadWorkOrderConfig() {
    try {
      workOrderConfig.value = await fetchWorkOrderConfig()
      return workOrderConfig.value
    } catch (reason) {
      workOrderServiceError.value = reason instanceof Error ? reason.message : '飞书配置加载失败'
      return workOrderConfig.value
    }
  }

  async function loadWorkOrders() {
    const [ordersResult, configResult] = await Promise.allSettled([fetchWorkOrders(), fetchWorkOrderConfig()])
    if (ordersResult.status === 'fulfilled') {
      workOrders.value = ordersResult.value
      ordersResult.value.forEach(order => {
        const alert = aiAlertItems.value.find(item => item.id === order.alertId)
        if (alert) {
          alert.status = order.status
          alert.assignee = order.assignee
        }
      })
    }
    if (configResult.status === 'fulfilled') workOrderConfig.value = configResult.value
    if (ordersResult.status === 'fulfilled' || configResult.status === 'fulfilled') {
      workOrderServiceError.value = ''
    } else {
      const reason = ordersResult.reason || configResult.reason
      workOrderServiceError.value = reason instanceof Error ? reason.message : '工单服务连接失败'
    }
  }

  async function dispatchSelectedAiAlert(input: { adminPin: string; deadlineMinutes: number; requirement: string }) {
    if (!selectedAiAlert.value) throw new Error('请先选择告警')
    const result = await dispatchWorkOrderRequest(selectedAiAlert.value, input)
    applyWorkOrder(result.order)
    return result
  }

  async function reviewSelectedWorkOrder(input: { adminPin: string; decision: 'approve' | 'reject'; comment?: string }) {
    if (!selectedWorkOrder.value) throw new Error('当前告警没有关联工单')
    const order = await reviewWorkOrderRequest(selectedWorkOrder.value.id, input)
    applyWorkOrder(order)
    return order
  }

  function enterVisitorManagement() {
    activeNav.value = 'people'
    visitorScope.value = '当前在厂'
    visitorStatus.value = '全部状态'
    visitorAreaFilter.value = '全部区域'
  }

  function selectVisitor(visitor: Visitor, exception: VisitorException | null = null) {
    selectedVisitor.value = visitor
    selectedVisitorException.value = exception
    expandedVisitorArea.value = visitor.areaId
    visitorTrackRange.value = 'all'
    visitorTrackProgress.value = exception
      ? Math.max(0, visitor.track.findIndex(node => node.id === exception.trackNodeId) / Math.max(visitor.track.length - 1, 1) * 100)
      : 100
    visitorTrackPlaying.value = false
  }

  function locateVisitorException(exception: VisitorException) {
    const visitor = visitors.find(item => item.id === exception.visitorId)
    if (visitor) selectVisitor(visitor, exception)
  }

  function exitVisitorTrack() {
    selectedVisitor.value = null
    selectedVisitorException.value = null
    visitorTrackPlaying.value = false
    visitorTrackProgress.value = 100
  }

  return {
    activeNav, activeLayer, selectedMarker, selectedAlert, alertCategory, riskFilter, energyType, timeDimension,
    expandedCameraArea, selectedCamera, selectedAiAlert, aiAlertItems, aiAlertStatus, hotspotRange, requestedVideoTime,
    workOrders, selectedWorkOrder, workOrderConfig, workOrderServiceError,
    visitorScope, visitorStatus, visitorAreaFilter, expandedVisitorArea, selectedVisitor, selectedVisitorException,
    visitorExceptionStatus, visitorTrackRange, visitorTrackPlaying, visitorTrackProgress, visitorPlaybackSpeed,
    metrics, visibleMarkers, filteredAlerts, filteredAiAlerts, filteredVisitors, filteredVisitorExceptions, activeVisitorTrack, visitorTrackCursor,
    locateAlert, openCamera, locateAiAlert, closeCamera, closeAiAlert, processAiAlert, loadWorkOrders, loadWorkOrderConfig, dispatchSelectedAiAlert, reviewSelectedWorkOrder,
    enterVisitorManagement, selectVisitor, locateVisitorException, exitVisitorTrack,
  }
})
