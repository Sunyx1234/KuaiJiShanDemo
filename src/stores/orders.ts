import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { orderLifecycles } from '../data/fulfillment'
export const useOrdersStore = defineStore('orders', () => {
  const detailId = ref<string | null>(null)
  const selected = computed(() => orderLifecycles.find(order => order.id === detailId.value) ?? null)
  function open(id: string) { if (orderLifecycles.some(order => order.id === id)) detailId.value = id }
  function close() { detailId.value = null }
  return { detailId, selected, open, close }
})
