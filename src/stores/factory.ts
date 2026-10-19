import { computed, ref, watch } from 'vue'
import { defineStore, acceptHMRUpdate } from 'pinia'
import { factoryThemes, type FactoryTheme } from '../data/factory'
import { steamerDevices, bottlingDevices, pressDevices, fermentationDevices, type FermentationZone, processReferences } from '../data/processEquipment'
import { processRegions } from '../data/processRegions'
import { operationDevices, operationTasks, maintenanceEvents, equipmentMetrics, serviceDue, serviceOverdue, type OperationTask, type MaintenanceEvent } from '../data/equipmentOperations'
import { useDashboardStore } from './dashboard'
export const useFactoryStore = defineStore('factory', () => {
  const dashboard = useDashboardStore()
  const selectedIndex = ref(0)
  const selectedProcessIndex = ref(2)
  const modelRequest = ref(0)
  const selectedProcessDeviceId = ref('')
  const deviceFocusRequest = ref(0)
  const fermentationZone = ref<FermentationZone>('pre')
  const equipmentScope = ref<'campus' | 'device'>('campus')
  const detail = ref<{ kind: 'task' | 'event'; item: OperationTask | MaintenanceEvent } | null>(null)
  const operationsMetrics = computed(equipmentMetrics)
  const activeDevice = computed(() => equipmentScope.value === 'device' ? operationDevices.find(d => d.id === selectedProcessDeviceId.value) ?? null : null)
  const visibleDevices = computed(() => equipmentScope.value === 'campus' ? operationDevices : operationDevices.filter(d => d.processIndex === selectedProcessIndex.value && (d.processIndex !== 2 || d.zone === fermentationZone.value)))
  const attentionDevices = computed(() => operationDevices.filter(d => d.reason || serviceDue(d)).sort((a, b) => (b.status === '故障停机' ? 10 : b.reason ? 5 : 0) - (a.status === '故障停机' ? 10 : a.reason ? 5 : 0)))
  const currentTasks = computed(() => operationTasks.filter(t => !activeDevice.value || t.deviceId === activeDevice.value.id).sort((a, b) => Number(a.status === '已完成') - Number(b.status === '已完成') || b.createdAt.localeCompare(a.createdAt)))
  const currentEvents = computed(() => maintenanceEvents.filter(e => !activeDevice.value || e.deviceId === activeDevice.value.id).sort((a, b) => b.time.localeCompare(a.time)))
  const processSummary = computed(() => processRegions.map((_, index) => { const devices = operationDevices.filter(d => d.processIndex === index); return { total: devices.length, abnormal: devices.filter(d => d.status !== '正常运行').length } }))
  function returnOperationsCampus() { equipmentScope.value = 'campus'; selectedProcessDeviceId.value = ''; detail.value = null }
  function selectOperationDevice(id: string, fromModel = false) {
    const device = operationDevices.find(d => d.id === id)
    if (!device) return
    const changeModel = equipmentScope.value === 'campus' || selectedProcessIndex.value !== device.processIndex || (device.zone && device.zone !== fermentationZone.value)
    selectedProcessIndex.value = device.processIndex
    if (device.zone) fermentationZone.value = device.zone
    equipmentScope.value = 'device'
    selectedProcessDeviceId.value = id
    if (changeModel) modelRequest.value++
    else if (!fromModel) deviceFocusRequest.value++
  }
  function openOperationDetail(kind: 'task' | 'event', item: OperationTask | MaintenanceEvent) {
    selectOperationDevice(item.deviceId)
    detail.value = { kind, item }
  }
  function selectFermentationZone(zone: FermentationZone) {
    if (fermentationZone.value === zone) return
    if (theme.value === 'equipment') {
      const device = operationDevices.find(d => d.zone === zone)
      if (device) selectOperationDevice(device.id)
      return
    }
    selectedProcessDeviceId.value = ''
    fermentationZone.value = zone
  }
  const processDevices = computed(() => selectedProcessIndex.value === 1 ? steamerDevices : selectedProcessIndex.value === 5 ? bottlingDevices : selectedProcessIndex.value === 3 ? pressDevices : selectedProcessIndex.value === 2 ? fermentationDevices.filter(device => device.zone === fermentationZone.value) : [])
  const processReference = computed(() => processReferences[selectedProcessIndex.value]!)
  function selectProcessDevice(id: string, fromModel = false) {
    if (theme.value === 'equipment') { selectOperationDevice(id, fromModel); return }
    if (!processDevices.value.some(device => device.id === id)) return
    selectedProcessDeviceId.value = id
    if (!fromModel) deviceFocusRequest.value++
  }
  watch(selectedProcessIndex, () => { if (theme.value !== 'equipment') selectedProcessDeviceId.value = '' }, { flush: 'sync' })
  function inspectProcess(index: number, keepDeviceSelection = false) {
    if (theme.value === 'equipment') {
      if (!processRegions[index]) return
      const device = operationDevices.find(d => d.processIndex === index && (index !== 2 || d.zone === fermentationZone.value))
      if (device) { selectOperationDevice(keepDeviceSelection ? selectedProcessDeviceId.value || device.id : device.id); }
      return
    }
    selectProcess(index)
    if (!keepDeviceSelection) selectedProcessDeviceId.value = ''
    modelRequest.value++
  }
  const theme = computed<FactoryTheme>(() => dashboard.activeNav in factoryThemes ? dashboard.activeNav as FactoryTheme : 'overview')
  const config = computed(() => factoryThemes[theme.value])
  const selected = computed(() => config.value.records[selectedIndex.value] ?? config.value.records[0]!)
  const processRegion = computed(() => processRegions[selectedProcessIndex.value]!)
  function select(index: number) {
    if (!config.value.records[index]) return
    selectedIndex.value = index
    if (theme.value === 'production') selectedProcessIndex.value = selected.value.progress
  }
  function selectProcess(index: number) { if (processRegions[index]) selectedProcessIndex.value = index }
  function openTheme(next: FactoryTheme) {
    const batch = selected.value.batch
    const index = factoryThemes[next].records.findIndex(record => record.batch === batch)
    selectedIndex.value = index >= 0 ? index : 0
    dashboard.switchNavigation(next)
  }
  watch(theme, next => {
    returnOperationsCampus()
    if (selectedIndex.value >= config.value.records.length) selectedIndex.value = 0
    if (next === 'production') selectedProcessIndex.value = selected.value.progress
  })
  return { equipmentScope, activeDevice, visibleDevices, attentionDevices, currentTasks, currentEvents, processSummary, operationsMetrics, detail, selectOperationDevice, openOperationDetail, returnOperationsCampus, serviceOverdue, serviceDue, fermentationZone, selectFermentationZone, processDevices, processReference, selectedProcessDeviceId, deviceFocusRequest, selectProcessDevice, modelRequest, inspectProcess, theme, config, selected, selectedIndex, selectedProcessIndex, processRegion, select, selectProcess, openTheme }
})

if (import.meta.hot) import.meta.hot.accept(acceptHMRUpdate(useFactoryStore, import.meta.hot))
