import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { AlertItem, LayerKey, NavKey, SceneMarker } from '../data/types'
import { alerts, metricsByNav, sceneMarkers } from '../data/mock'

export const useDashboardStore = defineStore('dashboard', () => {
  const activeNav = ref<NavKey>('overview')
  const activeLayer = ref<LayerKey>('overview')
  const selectedMarker = ref<SceneMarker | null>(null)
  const selectedAlert = ref<AlertItem | null>(null)
  const alertCategory = ref('全部')
  const riskFilter = ref<'全部' | '高风险' | '中风险' | '低风险'>('全部')
  const energyType = ref<'电' | '水' | '气'>('电')
  const timeDimension = ref<'day' | 'month' | 'year'>('day')

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

  function locateAlert(alert: AlertItem) {
    selectedAlert.value = alert
    selectedMarker.value = sceneMarkers.find(m => m.id === alert.markerId) ?? null
    activeLayer.value = 'overview'
  }

  return { activeNav, activeLayer, selectedMarker, selectedAlert, alertCategory, riskFilter, energyType, timeDimension, metrics, visibleMarkers, filteredAlerts, locateAlert }
})
