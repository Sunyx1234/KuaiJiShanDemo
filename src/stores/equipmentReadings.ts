import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { steamerDevices, bottlingDevices, fermentationDevices, pressDevices } from '../data/processEquipment'
import { getEquipmentReadings } from '../data/equipmentReadings'
import { fluctuateReading } from '../utils/equipmentTelemetry'

export const useEquipmentReadingsStore = defineStore('equipmentReadings', () => {
  const profiles = Object.fromEntries([...steamerDevices, ...bottlingDevices, ...fermentationDevices, ...pressDevices].map(device => [device.id, getEquipmentReadings(device.id)]))
  const started = Date.now()
  const sampleTimes = ref(Array.from({ length: 361 }, (_, index) => started - (360 - index) * 5000))
  const initialHistory: Record<string, Record<string, number[]>> = {}
  for (const [id, metrics] of Object.entries(profiles)) {
    initialHistory[id] = {}
    for (const metric of metrics) {
      initialHistory[id]![metric.id] = Array.from({ length: 361 }, (_, index) => metric.updateMode === 'fixed' || index === 360 ? metric.baseline : fluctuateReading(metric.baseline, metric.precision))
    }
  }
  const history = ref(initialHistory)
  const updatedAt = computed(() => sampleTimes.value[sampleTimes.value.length - 1]!)
  let timer: ReturnType<typeof setInterval> | undefined
  let consumers = 0
  function update() {
    sampleTimes.value.push(Date.now()); sampleTimes.value.shift()
    for (const [id, metrics] of Object.entries(profiles)) for (const metric of metrics) {
      const samples = history.value[id]![metric.id]!
      samples.push(metric.updateMode === 'fixed' ? metric.baseline : fluctuateReading(metric.baseline, metric.precision)); samples.shift()
    }
  }
  function start() {
    consumers++
    if (!timer && Date.now() - updatedAt.value >= 5000) update()
    if (!timer) timer = setInterval(update, 5000)
  }
  function stop() {
    consumers = Math.max(0, consumers - 1)
    if (!consumers && timer) { clearInterval(timer); timer = undefined }
  }
  return { profiles, sampleTimes, history, updatedAt, start, stop }
})
