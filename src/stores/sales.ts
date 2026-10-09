import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { salesOrders, salesCycleSeconds } from '../data/sales'

const fadeSeconds = 1.2
const smooth = (value: number) => { const t = Math.min(1, Math.max(0, value)); return t * t * (3 - 2 * t) }

export const useSalesStore = defineStore('sales', () => {
  const activeIndex = ref(0)
  const playing = ref(true)
  const elapsed = ref(0)
  const phase = ref<'enter' | 'hold' | 'leave'>('enter')
  const phaseTime = ref(0)
  const pendingIndex = ref(0)
  const leaveOpacity = ref(1)
  const activeOrder = computed(() => salesOrders[activeIndex.value]!)
  const opacity = computed(() => phase.value === 'enter' ? smooth(phaseTime.value / fadeSeconds)
    : phase.value === 'leave' ? leaveOpacity.value * (1 - smooth(phaseTime.value / fadeSeconds)) : 1)
  const progress = computed(() => Math.min(1, elapsed.value / salesCycleSeconds))
  const totalAmount = salesOrders.reduce((sum, order) => sum + order.amount, 0)
  const totalQuantity = salesOrders.reduce((sum, order) => sum + order.quantity, 0)
  function selectOrder(index: number) {
    const next = (index + salesOrders.length) % salesOrders.length
    if (next === activeIndex.value && phase.value !== 'leave') return
    leaveOpacity.value = opacity.value
    pendingIndex.value = next
    phaseTime.value = 0
    phase.value = 'leave'
  }
  function tick(delta: number) {
    // Pausing holds an order on screen, while an already requested fade finishes.
    if (phase.value === 'hold' && !playing.value) return
    elapsed.value += delta
    phaseTime.value += delta
    if (phase.value === 'enter' && phaseTime.value >= fadeSeconds) {
      phase.value = 'hold'
      phaseTime.value = 0
    } else if (phase.value === 'hold' && phaseTime.value >= salesCycleSeconds - fadeSeconds * 2) {
      selectOrder(activeIndex.value + 1)
    } else if (phase.value === 'leave' && phaseTime.value >= fadeSeconds) {
      activeIndex.value = pendingIndex.value
      elapsed.value = 0
      phaseTime.value = 0
      phase.value = 'enter'
    }
  }
  return { orders: salesOrders, activeIndex, activeOrder, playing, elapsed, opacity, progress, totalAmount, totalQuantity, selectOrder, tick }
})
