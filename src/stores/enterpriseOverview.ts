import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { orderLifecycles } from '../data/fulfillment'
import { buildOverview, overviewCampusRegions, periodBounds, type OverviewFilter, type OverviewPeriod } from '../data/enterpriseOverview'
export const useEnterpriseOverviewStore = defineStore('enterprise-overview', () => {
  const period = ref<OverviewPeriod>('month')
  const sceneAreaId = ref<string | null>(null)
  const activity = ref<'orders' | 'shipped' | 'signed' | 'exceptions'>('orders')
  const filter = ref<OverviewFilter | null>(null)
  const bounds = computed(() => periodBounds(period.value))
  const summary = computed(() => buildOverview(orderLifecycles, bounds.value.from, bounds.value.to))
  const selectedRegion = computed(() => overviewCampusRegions.find(region => region.id === sceneAreaId.value) ?? null)
  const periodLabel = computed(() => `${bounds.value.from.slice(5).replace('-', '.')}—${bounds.value.to.slice(5).replace('-', '.')}`)
  const filteredOrders = computed(() => {
    const current = filter.value
    if (!current) return []
    if (current.kind === 'shipped') return summary.value.shippedOrders
    if (current.kind === 'signed') return summary.value.signedOrders
    return summary.value.orders.filter(order => current.kind === 'product' ? order.items.some(item => item.name.split(' · ')[0] === current.value)
      : current.kind === 'region' ? order.province === current.value
      : current.kind === 'day' ? order.createdAt.slice(0, 10) === current.value : true)
  })
  function inspect(value: OverviewFilter) { filter.value = value }
  function selectArea(id: string) { sceneAreaId.value = sceneAreaId.value === id ? null : id }
  return { period, bounds, summary, selectedRegion, sceneAreaId, activity, filter, filteredOrders, periodLabel, inspect, selectArea }
})
